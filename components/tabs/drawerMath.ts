/** 與 CSS --peek-h 同式：bar + 2 + (N−1)·4 + N·(H−bar−56)/12 */
export const drawerPeekH = (h: number, bar: number, minRows: number) => {
  const rowH = (h - bar - 56) / 12;
  return bar + 2 + (minRows - 1) * 4 + minRows * rowH;
};

/** 拖曳 y→進度（歷史／unit）；卷軸改走獨立 --scroll-p。0＝peek；1＝open。 */
export const progressFromY = (y: number, peekY: number) => {
  if (peekY <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - y / peekY));
};
