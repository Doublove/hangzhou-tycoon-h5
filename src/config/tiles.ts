/**
 * 地块配置总表 —— 逐条照抄需求文档附录 A（表 A-1，64 宗 = 4 环 × 16）。
 *
 * 规则：游戏地价（万元）= 楼面价（元/㎡）÷ 40；等级上限受区域限高约束。
 * 每章使用一环（内环 = 第一章），解锁年月为 2010.01 起点的绝对年月，
 * 后续章节按章节起始年份做同样的相对换算（见 docs/decision-log.md）。
 */
import type { TileConfig } from '@/types';

interface RawTile {
  id: string;
  name: string;
  regionId: string;
  ring: number;
  unlock: string;
  floorPrice: number;
  levelCap: 0 | 1 | 2 | 3 | 4 | 5;
  flavor: string;
}

const RAW: RawTile[] = [
  // 内环（第一章 2010—2013）
  { id: 'hubin', name: '湖滨', regionId: 'xihubian', ring: 0, unlock: '2010.01', floorPrice: 60000, levelCap: 3, flavor: '湖滨：出门就是西湖，地只会越来越少。' },
  { id: 'beishan', name: '北山', regionId: 'xihubian', ring: 0, unlock: '2010.01', floorPrice: 45000, levelCap: 3, flavor: '北山：北山街的梧桐树下，老洋房一屋难求。' },
  { id: 'huanglong', name: '黄龙', regionId: 'xihubian', ring: 0, unlock: '2010.01', floorPrice: 28000, levelCap: 4, flavor: '黄龙：黄龙商圈的写字楼，十年不缺租户。' },
  { id: 'wensan', name: '文三', regionId: 'chengxi', ring: 0, unlock: '2010.01', floorPrice: 22000, levelCap: 4, flavor: '文三：文三路的数码街，曾经一铺养三代。' },
  { id: 'shenhua', name: '申花', regionId: 'chengxi', ring: 0, unlock: '2011.03', floorPrice: 14000, levelCap: 4, flavor: '申花：申花板块的地王，一出街就上头条。' },
  { id: 'jiangcun', name: '蒋村', regionId: 'chengxi', ring: 0, unlock: '2010.01', floorPrice: 12000, levelCap: 4, flavor: '蒋村：西溪湿地边上，低密的一手好地。' },
  { id: 'sandun', name: '三墩', regionId: 'chengxi', ring: 0, unlock: '2011.09', floorPrice: 9000, levelCap: 3, flavor: '三墩：三墩还没通地铁时，谁也没想到后来。' },
  { id: 'gongchen', name: '拱宸', regionId: 'chengbei', ring: 0, unlock: '2010.01', floorPrice: 11000, levelCap: 3, flavor: '拱宸：拱宸桥下的老厂房，后来成了文创园。' },
  { id: 'xiangfu', name: '祥符', regionId: 'chengbei', ring: 0, unlock: '2010.01', floorPrice: 8000, levelCap: 3, flavor: '祥符：祥符桥一带，刚需的第一站。' },
  { id: 'banshan', name: '半山', regionId: 'chengbei', ring: 0, unlock: '2010.01', floorPrice: 6000, levelCap: 3, flavor: '半山：半山的工厂家属院，安静也便宜。' },
  { id: 'pengbu', name: '彭埠', regionId: 'chengdong', ring: 0, unlock: '2010.01', floorPrice: 10000, levelCap: 4, flavor: '彭埠：彭埠进城的第一道门，桥两头两个价。' },
  { id: 'jiubao', name: '九堡', regionId: 'chengdong', ring: 0, unlock: '2010.01', floorPrice: 8500, levelCap: 3, flavor: '九堡：九堡客运站边上，人潮就是租金。' },
  { id: 'dingqiao', name: '丁桥', regionId: 'chengdong', ring: 0, unlock: '2013.09', floorPrice: 7000, levelCap: 3, flavor: '丁桥：丁桥大型居住区，配套是慢慢长出来的。' },
  { id: 'xiasha', name: '下沙', regionId: 'chengdong', ring: 0, unlock: '2012.11', floorPrice: 7500, levelCap: 3, flavor: '下沙：下沙大学城，地铁开通那天房价先动。' },
  { id: 'qufu', name: '区府', regionId: 'binjiang', ring: 0, unlock: '2010.01', floorPrice: 13000, levelCap: 4, flavor: '区府：区政府周边，滨江最早成熟的一段。' },
  { id: 'jiangnan', name: '江南', regionId: 'binjiang', ring: 0, unlock: '2010.01', floorPrice: 12000, levelCap: 4, flavor: '江南：江南大道两侧，产业园连成一片。' },

  // 中环（第二章 2014—2017）
  { id: 'shiminzhongxin', name: '市民中心', regionId: 'qianjiangxincheng', ring: 1, unlock: '2010.01', floorPrice: 25000, levelCap: 5, flavor: '市民中心：钱江新城的心脏，灯光秀每晚开场。' },
  { id: 'fuchunlu', name: '富春路', regionId: 'qianjiangxincheng', ring: 1, unlock: '2010.01', floorPrice: 30000, levelCap: 5, flavor: '富春路：富春路边的高层，看得见江也算资产。' },
  { id: 'jianghehui', name: '江河汇', regionId: 'qianjiangxincheng', ring: 1, unlock: '2012.01', floorPrice: 22000, levelCap: 5, flavor: '江河汇：两江交汇处，城市的封面就在这里。' },
  { id: 'aoti', name: '奥体', regionId: 'qianjiangshijicheng', ring: 1, unlock: '2010.01', floorPrice: 16000, levelCap: 5, flavor: '奥体：大小莲花碗亮灯的那年，全城都在谈代持。' },
  { id: 'shixin', name: '市心', regionId: 'qianjiangshijicheng', ring: 1, unlock: '2010.01', floorPrice: 15000, levelCap: 5, flavor: '市心：市心路的尽头，是新区的第一缕烟火。' },
  { id: 'yayuncun', name: '亚运村', regionId: 'qianjiangshijicheng', ring: 1, unlock: '2011.01', floorPrice: 14000, levelCap: 5, flavor: '亚运村：为了一场盛会，一整片城区拔地而起。' },
  { id: 'xixiyuanqu', name: '西溪园区', regionId: 'weilaikejicheng', ring: 1, unlock: '2010.01', floorPrice: 10000, levelCap: 5, flavor: '西溪园区：园区门口的早餐摊，比写字楼更早醒。' },
  { id: 'mengxiang', name: '梦想小镇', regionId: 'weilaikejicheng', ring: 1, unlock: '2010.01', floorPrice: 8000, levelCap: 4, flavor: '梦想小镇：互联网人的第一套房，往往买在这里。' },
  { id: 'haichuangyuan', name: '海创园', regionId: 'weilaikejicheng', ring: 1, unlock: '2011.07', floorPrice: 9000, levelCap: 4, flavor: '海创园：海归们拖着行李箱来，也拖着房价走。' },
  { id: 'cangqian', name: '仓前', regionId: 'weilaikejicheng', ring: 1, unlock: '2012.07', floorPrice: 7000, levelCap: 4, flavor: '仓前：仓前的老街还在，边上已是塔吊成林。' },
  { id: 'zhijiang', name: '之江', regionId: 'zhijiang', ring: 1, unlock: '2010.01', floorPrice: 12000, levelCap: 4, flavor: '之江：之江路上的低密住宅，安静是唯一的卖点。' },
  { id: 'zhuantang', name: '转塘', regionId: 'zhijiang', ring: 1, unlock: '2010.01', floorPrice: 9000, levelCap: 3, flavor: '转塘：美院边上的画室，比样板间更好看。' },
  { id: 'baimahu', name: '白马湖', regionId: 'binjiang', ring: 1, unlock: '2010.01', floorPrice: 10000, levelCap: 4, flavor: '白马湖：湖边的动漫产业园，创业者的房租也跟着涨。' },
  { id: 'chengdongxincheng', name: '城东新城', regionId: 'chengdong', ring: 1, unlock: '2010.01', floorPrice: 11000, levelCap: 4, flavor: '城东新城：老城东更新的第一块拼图。' },
  { id: 'genbei', name: '艮北', regionId: 'chengdong', ring: 1, unlock: '2010.09', floorPrice: 9500, levelCap: 4, flavor: '艮北：艮山路高架通了，通勤时间直接改写房价。' },
  { id: 'yunhewan', name: '运河湾', regionId: 'chengbei', ring: 1, unlock: '2010.01', floorPrice: 9000, levelCap: 4, flavor: '运河湾：运河边的老仓库，改成了最贵的餐厅。' },

  // 外环（第三章 2018—2021）
  { id: 'wubao', name: '五堡', regionId: 'qianjiangxincheng', ring: 2, unlock: '2010.01', floorPrice: 26000, levelCap: 5, flavor: '五堡：江边最后一块整片开发的地。' },
  { id: 'sijiqing', name: '四季青', regionId: 'qianjiangxincheng', ring: 2, unlock: '2010.01', floorPrice: 24000, levelCap: 5, flavor: '四季青：凌晨四点的服装市场，现金流比任何区都猛。' },
  { id: 'lianhua', name: '莲花', regionId: 'qianjiangshijicheng', ring: 2, unlock: '2010.01', floorPrice: 17000, levelCap: 5, flavor: '莲花：莲花碗亮灯的那个夏天，全杭州都在拍照。' },
  { id: 'bolan', name: '博览', regionId: 'qianjiangshijicheng', ring: 2, unlock: '2010.01', floorPrice: 15000, levelCap: 5, flavor: '博览：会展中心一开馆，周边酒店先涨价。' },
  { id: 'nanhu', name: '南湖', regionId: 'weilaikejicheng', ring: 2, unlock: '2010.01', floorPrice: 11000, levelCap: 5, flavor: '南湖：南湖边的高知摇篮，房租跟着期权一起涨跌。' },
  { id: 'xianlin', name: '闲林', regionId: 'weilaikejicheng', ring: 2, unlock: '2011.01', floorPrice: 9500, levelCap: 4, flavor: '闲林：闲林的山水楼盘，靠一条隧道连接主城。' },
  { id: 'xizhan', name: '西站', regionId: 'yuncheng', ring: 2, unlock: '2010.01', floorPrice: 10000, levelCap: 4, flavor: '西站：高铁站还没启用，图纸已经卖了一轮。' },
  { id: 'yungu', name: '云谷', regionId: 'yuncheng', ring: 2, unlock: '2011.07', floorPrice: 9000, levelCap: 4, flavor: '云谷：云谷的机房比人多，算力密度换算成了房租。' },
  { id: 'linpingxincheng', name: '临平新城', regionId: 'linping', ring: 2, unlock: '2010.01', floorPrice: 7500, levelCap: 4, flavor: '临平新城：临平的下班高峰，从彩虹快速路开始。' },
  { id: 'donghu', name: '东湖', regionId: 'linping', ring: 2, unlock: '2010.11', floorPrice: 7000, levelCap: 3, flavor: '东湖：东湖边的步道修好那天，遛弯的人多了三倍。' },
  { id: 'hezhuang', name: '河庄', regionId: 'chengdong', ring: 2, unlock: '2010.01', floorPrice: 6500, levelCap: 3, flavor: '河庄：江对岸的农田，正在变成新的产业园。' },
  { id: 'wenyan', name: '闻堰', regionId: 'sanjianghui', ring: 2, unlock: '2010.01', floorPrice: 8000, levelCap: 4, flavor: '闻堰：三江口的渔村，退潮时全是滩涂。' },
  { id: 'shuangpu', name: '双浦', regionId: 'zhijiang', ring: 2, unlock: '2010.01', floorPrice: 8500, levelCap: 4, flavor: '双浦：双浦的田园，周末属于露营的人。' },
  { id: 'yunhexincheng', name: '运河新城', regionId: 'chengbei', ring: 2, unlock: '2010.01', floorPrice: 9500, levelCap: 4, flavor: '运河新城：老工业区的第二春，烟囱改成了展厅。' },
  { id: 'zhihuicheng', name: '智慧城', regionId: 'chengdong', ring: 2, unlock: '2011.05', floorPrice: 9000, levelCap: 4, flavor: '智慧城：智慧城的写字楼，深夜的光比星星多。' },
  { id: 'wulianwang', name: '物联网', regionId: 'binjiang', ring: 2, unlock: '2010.01', floorPrice: 11000, levelCap: 4, flavor: '物联网：物联网小镇，一块地就是一个产业园。' },

  // 最外环（第四章 2022—2026）
  { id: 'yungubei', name: '云谷北', regionId: 'yuncheng', ring: 3, unlock: '2010.07', floorPrice: 9500, levelCap: 4, flavor: '云谷北：北延的计算中心，算力就是新的容积率。' },
  { id: 'xizhanbei', name: '西站北', regionId: 'yuncheng', ring: 3, unlock: '2010.01', floorPrice: 9000, levelCap: 4, flavor: '西站北：站北路网拉直的那天，通勤圈重画了一次。' },
  { id: 'yiqiao', name: '义桥', regionId: 'sanjianghui', ring: 3, unlock: '2010.01', floorPrice: 7500, levelCap: 4, flavor: '义桥：义桥的老码头，现在是钓鱼人的据点。' },
  { id: 'daicun', name: '戴村', regionId: 'sanjianghui', ring: 3, unlock: '2011.01', floorPrice: 6000, levelCap: 3, flavor: '戴村：戴村的云石山居，山不高，空气很贵。' },
  { id: 'xiashanan', name: '下沙南', regionId: 'chengdong', ring: 3, unlock: '2010.01', floorPrice: 7000, levelCap: 3, flavor: '下沙南：沿江南的江景高层，卖出承诺比交付更快。' },
  { id: 'dajiangdong', name: '大江东', regionId: 'chengdong', ring: 3, unlock: '2010.01', floorPrice: 5500, levelCap: 3, flavor: '大江东：钱塘江东岸，从滩涂到厂房只用了十年。' },
  { id: 'qiaosi', name: '乔司', regionId: 'linping', ring: 3, unlock: '2010.01', floorPrice: 7000, levelCap: 3, flavor: '乔司：乔司的服装厂老板，是最早的一批房东。' },
  { id: 'chaoshan', name: '超山', regionId: 'linping', ring: 3, unlock: '2011.03', floorPrice: 5500, levelCap: 3, flavor: '超山：超山的梅花开时，看花的人比购房者还多。' },
  { id: 'zhongtai', name: '中泰', regionId: 'weilaikejicheng', ring: 3, unlock: '2010.01', floorPrice: 8500, levelCap: 4, flavor: '中泰：中泰的产业园，把科技城又往西推了一站。' },
  { id: 'lianhuadong', name: '莲花东', regionId: 'qianjiangshijicheng', ring: 3, unlock: '2010.01', floorPrice: 16000, levelCap: 5, flavor: '莲花东：盛会之后，这里成了跑步者的圣地。' },
  { id: 'jianghehuidong', name: '江河汇东', regionId: 'qianjiangxincheng', ring: 3, unlock: '2010.01', floorPrice: 25000, levelCap: 5, flavor: '江河汇东：东岸的最后一块空地，围观的人最多。' },
  { id: 'hanggang', name: '杭钢', regionId: 'chengbei', ring: 3, unlock: '2010.01', floorPrice: 8000, levelCap: 4, flavor: '杭钢：高炉熄火那天，半座城的记忆一起关了灯。' },
  { id: 'shuangqiao', name: '双桥', regionId: 'chengxi', ring: 3, unlock: '2010.01', floorPrice: 9000, levelCap: 4, flavor: '双桥：双桥的车辆段上盖，房子长在铁轨之上。' },
  { id: 'longwu', name: '龙坞', regionId: 'zhijiang', ring: 3, unlock: '2010.01', floorPrice: 10000, levelCap: 4, flavor: '龙坞：龙坞茶镇的茶园，一垄垄都是风景。' },
  { id: 'xiaoheshan', name: '小和山', regionId: 'xihubian', ring: 3, unlock: '2010.01', floorPrice: 14000, levelCap: 3, flavor: '小和山：山下是大学城，山上是限墅的地。' },
  { id: 'jiubaobei', name: '九堡北', regionId: 'chengdong', ring: 3, unlock: '2010.01', floorPrice: 8500, levelCap: 4, flavor: '九堡北：北边的创业园，搬走了又搬回来。' },
];

const parseUnlock = (unlock: string): { unlockYear: number; unlockMonth: number } => {
  const [y, m] = unlock.split('.');
  return { unlockYear: Number(y), unlockMonth: Number(m) };
};

export const TILES: TileConfig[] = RAW.map((raw) => ({
  id: raw.id,
  name: raw.name,
  regionId: raw.regionId,
  ring: raw.ring,
  unlockYear: parseUnlock(raw.unlock).unlockYear,
  unlockMonth: parseUnlock(raw.unlock).unlockMonth,
  floorPrice: raw.floorPrice,
  price: raw.floorPrice / 40,
  levelCap: raw.levelCap,
  flavor: raw.flavor,
}));

export const TILE_MAP: Record<string, TileConfig> = TILES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, TileConfig>,
);

/** 取一整环的 16 宗地块。 */
export const tilesOfRing = (ring: number): TileConfig[] => TILES.filter((t) => t.ring === ring);

/**
 * 地块的解锁月偏移：相对该环所属章节的起始年换算。
 * 附录 A 的解锁年月以 2010.01 为原点，后续章节按各自起始年份做同样的相对位移。
 */
export function unlockOffsetOf(tile: TileConfig, chapterStartYear: number): number {
  const absolute = (tile.unlockYear - 2010) * 12 + (tile.unlockMonth - 1);
  const shifted = absolute - (chapterStartYear - 2010) * 12;
  return Math.max(0, shifted);
}
