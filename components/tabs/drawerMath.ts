/** 與 CSS --peek-h 同式：bar + 2 + (N−1)·4 + N·(H−bar−56)/12 */
export const drawerPeekH = (h: number, bar: number, minRows: number) => {
  const rowH = (h - bar - 56) / 12;
  return bar + 2 + (minRows - 1) * 4 + minRows * rowH;
};

/** drawer progress：0＝收合（peek）→卷軸展開；1＝全開 →卷軸卷起 */
export const progressFromY = (y: number, peekY: number) => {
  if (peekY <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - y / peekY));
};
