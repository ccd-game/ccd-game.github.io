
/**
 * 解析 BOSS_SPEECHES.md 的工具
 */
export interface ParsedSpeeches {
  startSpeech: string;
  victorySpeech: string;
  defeatSpeech: string;
  hpThresholds: Record<number, string>;
}

export function parseBossSpeeches(markdown: string): Record<number, ParsedSpeeches> {
  const lines = markdown.split('\n');
  const results: Record<number, ParsedSpeeches> = {};
  
  let currentId: number | null = null;

  for (const line of lines) {
    // 匹配包含 ID 的行: | **1** | ...
    const idMatch = line.match(/^\|\s*\*\*(\d+)\*\*\s*\|/);
    if (idMatch) {
      currentId = parseInt(idMatch[1]);
      results[currentId] = {
        startSpeech: "",
        victorySpeech: "",
        defeatSpeech: "",
        hpThresholds: {}
      };
    }

    if (currentId === null) continue;

    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 6) continue;

    const trigger = parts[4]; // 觸發時機欄位
    const content = parts[5].replace(/\\n/g, '\n'); // 處理換行符號

    if (trigger === "戰鬥開始") {
      results[currentId].startSpeech = content;
    } else if (trigger === "戰勝 (玩家勝)") {
      results[currentId].victorySpeech = content;
    } else if (trigger === "戰敗 (玩家亡)") {
      results[currentId].defeatSpeech = content;
    } else {
      const hpMatch = trigger.match(/HP\s*(\d+)%/);
      if (hpMatch) {
        const threshold = parseInt(hpMatch[1]);
        results[currentId].hpThresholds[threshold] = content;
      }
    }
  }

  return results;
}
