/** B 方案：缺碼／空殼字包 span.fb；清單與 FB_CHARS.json 同步 */
export const SOUKOU_FB_CHARS = ["值", "擊", "擋", "每", "澠", "狀", "琚", "說", "銶", "錄", "鍊", "頹"] as const;

const FB_SET = new Set<string>(SOUKOU_FB_CHARS);

export type SoukouFbPart = { t: string; fb: boolean };

export function wrapSoukouFbHtml(text: string): string {
  let out = "";
  for (const ch of text) {
    const esc =
      ch === "&" ? "&amp;" :
      ch === "<" ? "&lt;" :
      ch === ">" ? "&gt;" :
      ch === '"' ? "&quot;" :
      ch;
    out += FB_SET.has(ch) ? `<span class="fb">${esc}</span>` : esc;
  }
  return out;
}

export function wrapSoukouFbParts(text: string): SoukouFbPart[] {
  const parts: SoukouFbPart[] = [];
  for (const ch of text) {
    const fb = FB_SET.has(ch);
    const last = parts[parts.length - 1];
    if (last && last.fb === fb) last.t += ch;
    else parts.push({ t: ch, fb });
  }
  return parts;
}
