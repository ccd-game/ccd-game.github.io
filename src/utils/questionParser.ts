
import { Question, QuestionType } from '../../types';

/**
 * 解析 Markdown 題庫表格
 * 格式預期為：| ID | 類型 | 題目 | 答案 |
 */
export function parseQuestionBank(md: string): Question[] {
  const questions: Question[] = [];
  const lines = md.split('\n');
  
  // 正則表達式匹配表格行： | 數字 | 類型 | 題目 | 答案 |
  const tableRowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;

  lines.forEach(line => {
    const match = line.match(tableRowRegex);
    if (match) {
      const id = parseInt(match[1].trim());
      const type = match[2].trim() as QuestionType;
      const questionText = match[3].trim();
      const answer = match[4].trim();

      // 過濾掉表頭 (例如 ID, 類型)
      if (isNaN(id)) return;

      questions.push({
        id,
        type,
        question: questionText,
        answer: answer,
        answers: answer.split('/').map(a => a.trim()).filter(a => a.length > 0),
        options: [], // 會在載入時由 generateDynamicOptions 動態產生
      });
    }
  });

  return questions;
}
