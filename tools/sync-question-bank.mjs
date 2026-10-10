#!/usr/bin/env node
/**
 * 把 CCD 文案的題庫（唯一來源）同步到遊戲讀取的 QUESTION_BANK.md（repo 根目錄，App.tsx 以 ?raw 內嵌）。
 *
 * 用法：
 *   node tools/sync-question-bank.mjs <來源 QUESTION_BANK.md>          # 驗證後寫入
 *   node tools/sync-question-bank.mjs <來源 QUESTION_BANK.md> --check  # 只驗證並比對，不寫入（不一致時 exit 1）
 *   （來源亦可用環境變數 QUESTION_BANK_SRC 指定）
 *
 * 格式：與遊戲現有格式相同（標題、`## ID: n - 篇名`、四欄表格 | ID | 類型 | 題目 | 答案 |）。
 * 表格行一律正規化為「| ID | 類型 | 題目 | 答案 |」（欄位前後各一個空格），其餘行原樣保留。
 * 答案欄語法：[預填]答案一/答案二；「/」「／」、「[ ]」「［ ］」皆可（遊戲端解析見 src/utils/answerSyntax.ts）。
 *
 * 驗證（任何錯誤都不會寫入）：
 * - 每行的 ID 與所屬「## ID: n」段落相同；段落 ID 不重複；類型為 背誦／語譯／內容／作法；
 * - 同一 ID 內題目文字不重複；答案非空；
 * - 答案欄只可含漢字、分隔符（/ ／）、預填括號（只可在開頭）及省略號（只可在預填內）——其他標點會令答案拼不出；
 * - 每關題數（按 data/levels.ts 的 sheetIds 合計）：第 1–10 關必須各 40 題；第 11、12 關照來源（只列出）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'QUESTION_BANK.md');
const LEVELS_TS = path.join(ROOT, 'data/levels.ts');
const TYPES = new Set(['背誦', '語譯', '內容', '作法']);
const LEVELS_WITH_40 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUESTIONS_PER_LEVEL = 40;

const ROW = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*$/;
const SECTION = /^##\s*ID:\s*(\d+)\s*-/;
const HAN = /\p{Script=Han}/u;
const ELLIPSIS = /\.{2,}|．{2,}|[…⋯]+/g;

/** 答案欄的字元檢查（與 src/utils/answerSyntax.ts 的語法一致；這裡只檢查，不解析） */
export function answerCellProblems(cell) {
  const problems = [];
  const alts = cell.split(/[/／]/).map((a) => a.replace(/\s/g, ''));
  if (alts.every((a) => a.length === 0)) return ['答案是空的'];
  const prefixes = [];
  for (const alt of alts) {
    if (!alt) { problems.push('有空的答案（多餘的分隔符）'); continue; }
    let body = alt; let prefix = null;
    const m = alt.match(/^[[［]([^\]］]*)[\]］](.*)$/u);
    if (m) { prefix = m[1]; body = m[2]; }
    prefixes.push(prefix);
    if (prefix !== null) {
      const p = prefix.replace(ELLIPSIS, '');
      if (!p) problems.push(`預填「${prefix}」沒有字`);
      for (const c of p) if (!HAN.test(c)) problems.push(`預填「${prefix}」含非漢字「${c}」`);
    }
    if (!body) problems.push(`答案「${alt}」只有預填、沒有要輸入的字`);
    for (const c of body) {
      if (/[[\]［］]/.test(c)) problems.push(`答案「${alt}」的括號不在開頭`);
      else if (!HAN.test(c)) problems.push(`答案「${alt}」含非漢字「${c}」（會拼不出）`);
    }
  }
  const given = prefixes.filter((p) => p !== null);
  if (given.length && (given.length !== prefixes.length && prefixes[0] === null)) problems.push('只有後面的答案有預填');
  if (new Set(given).size > 1) problems.push('各答案的預填不一致');
  return problems;
}

/** 讀 data/levels.ts 的 id 與 sheetIds（只用正則，不執行 TS） */
export function readLevels(src) {
  return [...src.matchAll(/id:\s*(\d+),\s*title:\s*"([^"]+)"[^\n]*?sheetIds:\s*\[([\d,\s]+)\]/g)]
    .map((m) => ({ id: +m[1], title: m[2], sheetIds: m[3].split(',').map((n) => +n.trim()) }));
}

/** 正規化並驗證；回傳 { text, errors, counts } */
export function syncBank(sourceText, levels) {
  const errors = [];
  const lines = sourceText.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const seenSections = new Set();
  const perSheet = new Map();
  const seenQ = new Set();
  let section = null;
  lines.forEach((line, i) => {
    const n = i + 1;
    const sec = line.match(SECTION);
    if (sec) {
      section = +sec[1];
      if (seenSections.has(section)) errors.push(`第 ${n} 行：段落 ID ${section} 重複`);
      seenSections.add(section);
      out.push(line.trimEnd());
      return;
    }
    if (!/^\|\s*\d/.test(line)) { out.push(line.trimEnd()); return; }
    const m = line.match(ROW);
    if (!m) { errors.push(`第 ${n} 行：表格格式不正確（須為四欄）：${line}`); out.push(line); return; }
    const [, idStr, type, question, answer] = m;
    const id = +idStr;
    if (section === null || id !== section) errors.push(`第 ${n} 行：ID ${id} 不在「## ID: ${id}」段落內（目前段落 ${section}）`);
    if (!TYPES.has(type)) errors.push(`第 ${n} 行：類型「${type}」不是 背誦／語譯／內容／作法`);
    const key = `${id}\u0000${question}`;
    if (seenQ.has(key)) errors.push(`第 ${n} 行：ID ${id} 題目重複：${question}`);
    seenQ.add(key);
    for (const p of answerCellProblems(answer)) errors.push(`第 ${n} 行（ID ${id}）：${p}`);
    perSheet.set(id, (perSheet.get(id) ?? 0) + 1);
    out.push(`| ${id} | ${type} | ${question} | ${answer} |`);
  });
  const counts = levels.map((l) => ({ level: l.id, sheets: l.sheetIds, count: l.sheetIds.reduce((s, id) => s + (perSheet.get(id) ?? 0), 0) }));
  for (const c of counts) {
    if (LEVELS_WITH_40.includes(c.level) && c.count !== QUESTIONS_PER_LEVEL) errors.push(`第 ${c.level} 關有 ${c.count} 題，應為 ${QUESTIONS_PER_LEVEL} 題`);
  }
  for (const id of perSheet.keys()) if (!levels.some((l) => l.sheetIds.includes(id))) errors.push(`ID ${id} 不屬於任何關卡（data/levels.ts 的 sheetIds）`);
  let text = out.join('\n');
  if (!text.endsWith('\n')) text += '\n';
  return { text, errors, counts, perSheet };
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const src = args.find((a) => !a.startsWith('--')) || process.env.QUESTION_BANK_SRC;
  if (!src) { console.error('用法：node tools/sync-question-bank.mjs <來源 QUESTION_BANK.md> [--check]'); process.exit(2); }
  const { text, errors, counts } = syncBank(fs.readFileSync(src, 'utf8'), readLevels(fs.readFileSync(LEVELS_TS, 'utf8')));
  console.log('各關題數：' + counts.map((c) => `L${c.level}=${c.count}`).join('　'));
  console.log('總題數：' + counts.reduce((s, c) => s + c.count, 0));
  if (errors.length) { console.error(`驗證失敗（${errors.length}）：\n- ` + errors.join('\n- ')); process.exit(1); }
  const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : '';
  if (check) {
    if (current === text) { console.log('QUESTION_BANK.md 與來源一致'); return; }
    console.error('QUESTION_BANK.md 與來源不一致；請執行同步（不加 --check）'); process.exit(1);
  }
  if (current === text) { console.log('QUESTION_BANK.md 已是最新，沒有改動'); return; }
  fs.writeFileSync(TARGET, text);
  console.log(`已寫入 ${path.relative(process.cwd(), TARGET) || TARGET}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
