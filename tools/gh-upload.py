"""
把当前工作区同步到 GitHub（单次提交）。

为什么不用 `git push`：某些网络环境下到 github.com:443 的连接会被阻断，
而 api.github.com 仍可访问。本脚本因此走 Git Data API：建树 → 建提交 → 更新引用。

用法：
    python tools/gh-upload.py                     # 默认 Doublove/hangzhou-tycoon-h5
    set GH_OWNER=Doublove && set GH_REPO=xxx && python tools/gh-upload.py

凭据取自本机 git credential manager（github.com），脚本不会打印或写入令牌。
"""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

OWNER = os.environ.get("GH_OWNER", "Doublove")
REPO = os.environ.get("GH_REPO", "hangzhou-tycoon-h5")
DESC = "以 2010—2026 年杭州楼市周期为舞台的回合制地产经营 H5 游戏（React + Canvas 自绘，M0 + M1 垂直切片）"
TOPIC = ["h5-game", "tycoon", "react", "canvas", "hangzhou"]
BRANCH = "main"
CHUNK = 40
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


def token() -> str:
    p = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    for line in (p.stdout or "").splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    sys.exit("未找到 github.com 凭据，请先在 Git Credential Manager 中登录")


TOK = token()


def req(method: str, path: str, payload: dict | None = None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    r = urllib.request.Request(
        "https://api.github.com" + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/vnd.github+json",
            "User-Agent": "hangzhou-tycoon-uploader",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(body or "{}")
        except json.JSONDecodeError:
            return e.code, {"message": body[:200]}


def tracked_files() -> list[str]:
    p = subprocess.run(["git", "-c", "core.quotePath=false", "ls-files", "-z"], capture_output=True)
    return [f for f in (p.stdout or b"").decode("utf-8").split("\0") if f.strip()]


def make_blob(path: str) -> str:
    raw = open(path, "rb").read()
    status, body = req("POST", "/repos/%s/%s/git/blobs" % (OWNER, REPO), {
        "content": base64.b64encode(raw).decode("ascii"),
        "encoding": "base64",
    })
    if status not in (200, 201):
        sys.exit("创建 blob 失败 %s: %s" % (path, body.get("message")))
    return body["sha"]


def ensure_initial_commit() -> None:
    status, _ = req("GET", "/repos/%s/%s/git/ref/heads/%s" % (OWNER, REPO, BRANCH))
    if status == 200:
        return
    seed = "# %s\n\n%s\n" % (REPO, DESC)
    status, out = req("PUT", "/repos/%s/%s/contents/README.md" % (OWNER, REPO), {
        "message": "chore: 初始化仓库",
        "content": base64.b64encode(seed.encode("utf-8")).decode("ascii"),
        "branch": BRANCH,
    })
    if status not in (200, 201):
        sys.exit("创建初始提交失败: %s" % out.get("message"))


def build_tree(files: list[str]) -> str:
    tree_sha = EMPTY_TREE
    for start in range(0, len(files), CHUNK):
        entries = []
        for rel in files[start:start + CHUNK]:
            raw = open(rel, "rb").read()
            path = rel.replace("\\", "/")
            try:
                entries.append({"path": path, "mode": "100644", "type": "blob", "content": raw.decode("utf-8")})
            except UnicodeDecodeError:
                entries.append({"path": path, "mode": "100644", "type": "blob", "sha": make_blob(rel)})
        payload: dict = {"tree": entries}
        if tree_sha:
            payload["base_tree"] = tree_sha
        status, body = req("POST", "/repos/%s/%s/git/trees" % (OWNER, REPO), payload)
        if status not in (200, 201):
            sys.exit("创建 tree 失败: %s" % body.get("message"))
        tree_sha = body["sha"]
    return tree_sha


def main() -> None:
    status, body = req("GET", "/repos/%s/%s" % (OWNER, REPO))
    if status == 200:
        print("仓库已存在：%s" % body["html_url"])
    else:
        status, body = req("POST", "/user/repos", {
            "name": REPO,
            "description": DESC,
            "private": False,
            "auto_init": False,
            "has_issues": True,
            "has_wiki": False,
            "has_projects": False,
        })
        if status != 201:
            sys.exit("创建仓库失败 HTTP %s: %s" % (status, body.get("message")))
        print("仓库已创建：%s" % body["html_url"])

    req("PUT", "/repos/%s/%s/topics" % (OWNER, REPO), {"names": TOPIC})

    files = tracked_files()
    print("待上传文件：%d" % len(files))

    ensure_initial_commit()
    tree_sha = build_tree(files)

    parents = []
    status, ref = req("GET", "/repos/%s/%s/git/ref/heads/%s" % (OWNER, REPO, BRANCH))
    if status == 200:
        parents = [ref["object"]["sha"]]

    status, commit = req("POST", "/repos/%s/%s/git/commits" % (OWNER, REPO), {
        "message": "chore: 同步本地工作区快照（%d 个文件）" % len(files),
        "tree": tree_sha,
        "parents": parents,
    })
    if status not in (200, 201):
        sys.exit("创建 commit 失败: %s" % commit.get("message"))

    if parents:
        status, out = req("PATCH", "/repos/%s/%s/git/refs/heads/%s" % (OWNER, REPO, BRANCH), {"sha": commit["sha"]})
    else:
        status, out = req("POST", "/repos/%s/%s/git/refs" % (OWNER, REPO), {"ref": "refs/heads/" + BRANCH, "sha": commit["sha"]})
    if status not in (200, 201):
        sys.exit("更新引用失败: %s" % out.get("message"))

    print("commit %s" % commit["sha"][:7])
    print("完成：https://github.com/%s/%s" % (OWNER, REPO))


if __name__ == "__main__":
    main()
