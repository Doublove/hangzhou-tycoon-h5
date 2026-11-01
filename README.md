# 杭州大富翁 · Hangzhou Tycoon

以 2010—2026 年杭州城市扩张与楼市周期为舞台的**回合制地产经营 H5 游戏**。
一回合 = 一个月，1 名真人玩家 + 3 名 AI 在同一座不断“生长”的城市里买地、加杠杆、吃政策、扛下跌，
最终以净资产分胜负。

> 本作为虚构作品：所涉历史价格、涨跌幅与地块数值均为游戏设定，**不构成任何投资建议**。
> 棋盘底图为艺术化示意，不画行政边界、不标经纬度。

- 需求文档：`杭州大富翁_游戏开发需求文档_V2.0.docx`
- 裁决记录：`docs/decision-log.md`（格数口径、时代系数补齐、技术栈变更等）
- 实现状态：`docs/impl-status.md`（**由工具生成，禁止手写**）

---

## 当前进度：M0 + M1 垂直切片

| 里程碑 | 状态 | 关键交付 |
| --- | --- | --- |
| M0 玩法原型 | ✅ | 方环棋盘、回合调度器、买地/升级/收租/过路费、破产两级清算、`?sim=1` 批量模拟 |
| M1 垂直切片 | ✅ | 第一章 48 回合完整可玩、React + Canvas 表现层、五屏 P0 界面、静态站产物 |
| M2 内容填充 | ⏭ | 第二章 + 全部卡池 + 合规审查（法务卡点） |
| M2.5 广告接入 | ⏭ | AdService 双实现、CMP、六个广告位联调 |
| M3 打磨测试 | ⏭ | 性能、多端兼容、埋点看板 |
| M4 上线运营 | ⏭ | 第三、四章 + 活动 |

验收判据见 `tests/acceptance/a-series.test.ts`（A1—A18）与 `docs/impl-status.md`。

## 技术栈

- **Vite 5 + React 18 + TypeScript 5（strict）**
- **Canvas 2D 自绘**（无游戏引擎）：`src/render/**`
- **Tailwind CSS 3.4 + shadcn/ui**：HUD 与弹窗
- **Vitest 2**：逻辑层单测、验收用例与批量模拟

### 三层分层（10.2）

```
src/config/**   数值与内容唯一真源（assertConfig() 缺参即抛错）
src/engine/**   纯逻辑：回合调度 / 规则 / AI，零 DOM 依赖（可搬进 Web Worker）
src/render/**   Canvas 表现层，只播放结果
src/ui/**       React 界面层
src/platform/** 存档 / 音效 / 埋点 / 广告接口
```

**铁律**：任何数值只能出现在 `src/config/**`；AI 与人类共用同一条命令管道（`applyCommand`），不存在特权路径（A16）。

## 快速开始

```bash
npm install
npm run dev        # 本地开发
npm run build      # 产出 dist/（静态站，hash 指纹）
npm run preview    # 预览产物
npm test           # 全部验收用例
npm run sim        # 批量模拟（60 局，六项指标）
npm run impl-status # 重新生成 docs/impl-status.md
```

调试入口：

- `?sim=1` —— 直接进入批量模拟报告页（可加 `&games=40&seed=20260101&chapter=1`）
- `?seed=123` —— 指定随机种子（配合固定序列复现 A9 / A10 的分布）

## 目录速览

```
src/
├── config/      economy / eras / regions / tiles / board / roles / ai-personalities / cards / chapters / texts / compliance
├── engine/
│   ├── rng.ts          确定性随机（分用途随机流，A17）
│   ├── state.ts        GameState / 初始化 / 稳定哈希
│   ├── commands.ts     唯一状态变更入口（A16）
│   ├── turn.ts         八步回合调度器状态机
│   ├── rules/          economy / toll / cards
│   └── ai/             evaluate（效用函数）/ policy（决策 → Command）
├── render/      theme / geometry / board-view / board-canvas / pieces / buildings
├── ui/          screens（5 屏）/ panels / components / hooks
├── platform/    storage / feedback / ads
└── sim/run.ts   批量模拟与指标报告
```

## 部署（A 路径：境外首发）

按 13.2 的顺序执行，**前一步不完成则后一步无法启动**：

1. 域名注册（避开与真实楼盘、企业近似的名字，先做商标初筛）
2. 静态站点部署：`npm run build` → 上传 `dist/` 到 Vercel / Cloudflare Pages / Netlify（全球 CDN，HTTPS 全绿）
3. 隐私政策与服务条款页：已提供 `public/privacy.html` 与 `public/terms.html`，**必须先填入运营主体署名**
4. Google 广告账号申请（站点需先上线并有真实内容，审核 1—2 周，是唯一的外部不可控环节）
5. 接入 CMP（面向 EEA / UK 强制，TCF v2.2）
6. 聚合平台上架（Poki / CrazyGames 需其自有 SDK，单独打包）
7. 埋点与看板（上线首周就要能看数）

境内（B 路径）需要 ICP 备案、游戏备案、防沉迷实名与国内广告源，当前**未启动**。

## 广告位与红线（第十一章）

- 激励视频：破产复活 / 双倍月租 / 情报解锁 / 结算加成（每章各 1 次）
- 插屏：章节结束与返回主菜单（每章 2 次，5 分钟最多 1 次）、冷启动（每日 1 次）
- 硬红线：新手保护 5 分钟内不开屏；**决策流程中不插广告**；单局激励 ≤4 + 插屏 ≤2；失败直接发奖或跳过

当前实现为 `MockAdService`（频次控制已可验证），真实 SDK 在 M2.5 接入，业务层不改代码。
