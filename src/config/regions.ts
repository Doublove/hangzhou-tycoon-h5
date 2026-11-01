/**
 * 12 个区域（3.2 / 附录 A），含板块热度初始值与画布配色。
 * 热度 0—100 同时驱动地价、租金房价、升级门槛与 AI 出价意愿（术语「板块热度」）。
 */
import type { RegionConfig } from '@/types';

export const REGIONS: RegionConfig[] = [
  { id: 'xihubian', name: '西湖边', baseHeat: 72, targetHeat: 76, color: '#2E7D6F', accent: '#7FC3B4' },
  { id: 'chengxi', name: '城西', baseHeat: 58, targetHeat: 62, color: '#3C6E8F', accent: '#8FBEDA' },
  { id: 'chengbei', name: '城北', baseHeat: 50, targetHeat: 54, color: '#6B4E9B', accent: '#B39DDB' },
  { id: 'chengdong', name: '城东', baseHeat: 52, targetHeat: 58, color: '#1B5FA8', accent: '#7FA8E0' },
  { id: 'binjiang', name: '滨江', baseHeat: 60, targetHeat: 66, color: '#2F7DA8', accent: '#86C6DE' },
  { id: 'qianjiangxincheng', name: '钱江新城', baseHeat: 64, targetHeat: 72, color: '#1F7A8C', accent: '#7FD1DD' },
  { id: 'qianjiangshijicheng', name: '钱江世纪城', baseHeat: 46, targetHeat: 70, color: '#8A5A2B', accent: '#E0A344' },
  { id: 'weilaikejicheng', name: '未来科技城', baseHeat: 40, targetHeat: 68, color: '#2E8B57', accent: '#7FD9A0' },
  { id: 'zhijiang', name: '之江', baseHeat: 44, targetHeat: 52, color: '#4E7A5E', accent: '#9CCBAE' },
  { id: 'yuncheng', name: '云城', baseHeat: 38, targetHeat: 56, color: '#4A5A8C', accent: '#9AA8DC' },
  { id: 'linping', name: '临平', baseHeat: 40, targetHeat: 48, color: '#8C5A7A', accent: '#DCAAC6' },
  { id: 'sanjianghui', name: '三江汇', baseHeat: 36, targetHeat: 50, color: '#557A2E', accent: '#A8CE7F' },
];

export const REGION_MAP: Record<string, RegionConfig> = REGIONS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, RegionConfig>,
);

/** 按 id 取区域；未知 id 打印错误日志并回退到第一个区域。 */
export const REGION_BY_ID = (id: string): RegionConfig => {
  const found = REGION_MAP[id];
  if (!found) {
    console.error(`[config] 未知区域 id：${id}`);
    return REGIONS[0];
  }
  return found;
};
