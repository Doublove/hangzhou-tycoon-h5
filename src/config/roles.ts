/**
 * 六名角色（6.2 角色一览 + 6.5 主动技能 V1.4）。
 * 初始现金基准为 740—960 万，实际开局金额 = 现金基准 × 章节起始年份时代系数。
 * 首发只做 3 个（杭铁头 / 温老板 / 阿莲）的正式立绘，其余用剪影占位（6.4 首发裁剪）。
 */
import type { RoleConfig } from '@/types';

export const ROLES: RoleConfig[] = [
  {
    id: 'hangtoutou',
    name: '杭铁头',
    identity: '本地拆迁户，55 岁',
    cashBase: 960,
    difficultyStars: 1,
    color: '#E0A344',
    artReady: true,
    desc: '生于拱宸桥，家里老房子拆了三回。他不炒股、不加杠杆，现金永远趴在账上——等那些加满杠杆的人撑不住的那天。',
    passive: { deathOnce: true },
    skill: {
      id: 'demolition',
      name: '拆迁款',
      cooldownMonths: 12,
      kind: 'cashByNetworth',
      magnitude: 0.08,
      desc: '立刻获得净资产 8% 的现金（最低 80 万）',
    },
  },
  {
    id: 'wenlaoban',
    name: '温老板',
    identity: '温州炒房团团长',
    cashBase: 820,
    difficultyStars: 3,
    color: '#D93A2B',
    artReady: true,
    desc: '2003 年带着一箱现金来杭州。他不看租金回报率，只看杠杆倍数——成也杠杆，败也杠杆。',
    passive: { loanLimitMul: 1.3, loanRateMul: 0.8 },
    skill: {
      id: 'funding',
      name: '配资',
      cooldownMonths: 12,
      kind: 'leverage',
      magnitude: 0.3,
      desc: '立刻借入净资产 30% 的现金，不受限贷额度限制，利息照付',
    },
  },
  {
    id: 'mage',
    name: '码哥',
    identity: '互联网公司 P8，35 岁',
    cashBase: 780,
    difficultyStars: 2,
    color: '#4EC5D6',
    artReady: false,
    desc: '工位到屋顶球场都在园区里。他的房子买在未来科技城——那是他唯一熟的地方。',
    passive: { optionBonusEveryTurns: 12, rentBonusRegions: ['weilaikejicheng'], rentBonusMul: 1.25 },
    skill: {
      id: 'options',
      name: '期权行权',
      cooldownMonths: 10,
      kind: 'cashByNetworth',
      magnitude: 0.06,
      desc: '立刻兑现一笔现金，金额随未来科技城热度浮动',
    },
  },
  {
    id: 'alian',
    name: '阿莲',
    identity: '西湖船娘，文旅创业者',
    cashBase: 740,
    difficultyStars: 1,
    color: '#2FA36B',
    artReady: true,
    desc: '摇了二十年橹，最懂的是游客的脚步会落在哪一条街。她的房子不多，但都在人最多的地方。',
    passive: { rentBonusRegions: ['xihubian', 'zhijiang', 'chengbei'], rentBonusMul: 1.3, extraChanceDraw: 1 },
    skill: {
      id: 'scull',
      name: '摇橹',
      cooldownMonths: 15,
      kind: 'escape',
      magnitude: 2,
      desc: '立刻脱离监狱或风景区，且下一次掷骰 +2',
    },
  },
  {
    id: 'xiaolongbao',
    name: '小笼包',
    identity: '网红主播',
    cashBase: 760,
    difficultyStars: 3,
    color: '#6B4E9B',
    artReady: false,
    desc: '补光灯一开，她说哪个板块好，那个板块的咨询电话就响到半夜——包括她自己名下那几套。',
    passive: {},
    skill: {
      id: 'trend',
      name: '带节奏',
      cooldownMonths: 8,
      kind: 'heatBoost',
      magnitude: 15,
      desc: '自己地块最多的区域热度 +15',
    },
  },
  {
    id: 'wangzhongjie',
    name: '王中介',
    identity: '资深房产中介',
    cashBase: 800,
    difficultyStars: 2,
    color: '#1B5FA8',
    artReady: false,
    desc: '电瓶车骑了十二万公里，他比谁都早知道哪套房明天会挂出来。信息差就是他的首付。',
    passive: { feeMul: 0.5 },
    skill: {
      id: 'deal',
      name: '撮合',
      cooldownMonths: 12,
      kind: 'discountBuy',
      magnitude: 0.85,
      desc: '以 85 折买下当前环上最便宜的无主地块',
    },
  },
];

export const ROLE_MAP: Record<string, RoleConfig> = ROLES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, RoleConfig>,
);

/** 王中介的初始遥控骰子数量为 6（附录 C）。 */
export const WANG_DICE_COUNT = 6;
