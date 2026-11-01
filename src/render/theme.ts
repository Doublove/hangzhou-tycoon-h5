/**
 * 画布主题：深色技术面板 + 方环棋盘（9.5 / V1.8 / V2.0）。
 * 棋盘为围棋盘质感（木纹盘面 + 淡棋格 + 星位），地块棋子为围棋子，功能格为墨色石。
 */
export const THEME = {
  panel: '#12161A',
  panelSoft: '#1A1F26',
  boardFace: '#1E2620',
  boardFaceAlt: '#232C25',
  gridLine: 'rgba(255,255,255,0.06)',
  starPoint: 'rgba(255,255,255,0.18)',
  stoneLight: '#E8E4DA',
  stoneDark: '#2B3138',
  stoneEdge: '#3A2E2A',
  text: '#E8ECF0',
  textDim: '#9AA5B1',
  gold: '#E0A344',
  cyan: '#4EC5D6',
  gain: '#2FA36B',
  loss: '#D93A2B',
  westlake: '#2E7D6F',
  qiantang: '#1B5FA8',
  asian: '#6B4E9B',
  purpleDash: '#B39DDB',
  seatColors: ['#E0A344', '#4EC5D6', '#E06C9B', '#7FD97F'],
} as const;

/** 字号按棋盘尺寸等比放大（9.1 V1.9：棋盘 600 → 16px，棋盘 1200 → 33px）。 */
export function fontScale(boardSize: number): number {
  return Math.max(11, Math.min(34, (boardSize / 800) * 22));
}

/** 棋子高度 = 地块图标 × 1.5（9.4）。 */
export function pieceSize(boardSize: number): number {
  const cell = boardSize / 7;
  return cell * 0.45 * 1.5;
}

/** 面板宽度 = 棋盘 × 0.70，且不小于 430px（9.1）。 */
export function panelWidth(boardSize: number): number {
  return Math.max(430, Math.round(boardSize * 0.7));
}

/** 颜色明度调整（用于立面的受光面 / 背光面派生，3.9 只借体量与气质）。 */
export function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 功能格的中文名。 */
export const CELL_LABEL: Record<string, string> = {
  start: '起',
  chance: '机会',
  destiny: '命运',
  bank: '银行',
  securities: '证券',
  shop: '道具店',
  scenic: '风景区',
};
