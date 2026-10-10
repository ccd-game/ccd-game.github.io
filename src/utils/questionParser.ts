
import { Question, QuestionType } from '../../types';
import { parseAnswerCell } from './answerSyntax';

/**
 * 解析 Markdown 題庫表格
 * 格式預期為：| ID | 類型 | 題目 | 答案 |
 * 答案欄語法（見 src/utils/answerSyntax.ts）：[預填]答案一/答案二；「/」「／」皆可分隔，「[ ]」「［ ］」皆可。
 */
export type QuestionBankWarning = (message: string) => void;
const defaultWarn: QuestionBankWarning = m => console.warn(`[題庫] ${m}`);

export function parseQuestionBank(md: string, onWarning: QuestionBankWarning = defaultWarn): Question[] {
  const questions: Question[] = [];
  const lines = md.split('\n');

  // 正則表達式匹配表格行： | 數字 | 類型 | 題目 | 答案 |
  const tableRowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;

  lines.forEach((line, lineIndex) => {
    const match = line.match(tableRowRegex);
    if (match) {
      const id = parseInt(match[1].trim());
      const type = match[2].trim() as QuestionType;
      const questionText = match[3].trim();
      const answer = match[4].trim();

      // 過濾掉表頭 (例如 ID, 類型)
      if (isNaN(id)) return;

      const parsed = parseAnswerCell(answer);
      parsed.warnings.forEach(w => onWarning(`第 ${lineIndex + 1} 行（ID ${id}）：${w}`));
      if (parsed.answers.length === 0) {
        // 沒有答案的題目會令回合卡住，略去
        onWarning(`第 ${lineIndex + 1} 行（ID ${id}）：沒有可接受答案，已略去此題`);
        return;
      }

      questions.push({
        id,
        type,
        question: questionText,
        answer: answer,
        answers: parsed.answers, // 只含學生要輸入的部分
        prefill: parsed.prefill, // 預填格（鎖定），沒有則為空陣列
        options: [], // 會在載入時由 buildQuestionBoard 按題目所屬關卡的干擾字池產生（data/questionBoard.ts）
      });
    }
  });

  return questions;
}
