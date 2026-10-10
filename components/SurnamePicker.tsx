import React, { useState } from 'react';
import { SurnameState, saveSurnameChoice } from '../src/lib/firebase';
import { labelFor, validateManualSurname } from '../src/lib/displayLabel';

/**
 * 排行榜姓氏選擇視窗。
 * - mode 'first'：首次登入後，姓氏須由學生選擇或輸入時自動出現一次；可按「暫不選擇」（保留「同學」）
 * - mode 'settings'：由「設定 → 帳戶 → 更改姓氏」開啟
 * 有兩個或以上選項時顯示選項按鈕，另加「其他（自行輸入）」開啟文字輸入；
 * 否則只以文字輸入。文字輸入只接受一至兩個中文字，儲存為 surnameSource = 'manual'。
 */
export const OTHER_OPTION_LABEL = '其他（自行輸入）';

const SurnamePicker: React.FC<{ state: SurnameState; mode: 'first' | 'settings'; onClose: () => void }> = ({ state, mode, onClose }) => {
  const hasOptions = !state.manual && state.options.length >= 2;
  const currentIsOption = state.options.includes(state.surname);
  const [selected, setSelected] = useState<string | null>(hasOptions && currentIsOption ? state.surname : null);
  // 「其他（自行輸入）」：choose 用戶之前已自行輸入（姓氏不在選項內）時，預先開啟
  const [other, setOther] = useState(hasOptions && state.source === 'manual' && !!state.surname && !currentIsOption);
  const textMode = !hasOptions || other;
  const [text, setText] = useState(textMode && state.source !== 'pending' && state.source !== 'none' ? state.surname : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const manualCheck = validateManualSurname(text);
  const candidate = !textMode ? selected : manualCheck.ok ? (manualCheck as { surname: string }).surname : null;
  const school = state.school ?? '';

  const submit = async (surname: string, source: 'chosen' | 'manual' | 'none') => {
    setSaving(true);
    setError(null);
    try {
      await saveSurnameChoice(surname, source);
      onClose();
    } catch (e) {
      setError(e instanceof Error && !e.message.startsWith('{') ? e.message : '儲存失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  };

  const onConfirm = () => {
    if (!textMode) {
      if (selected) submit(selected, 'chosen');
      return;
    }
    if (manualCheck.ok === false) {
      setError((manualCheck as { message: string }).message);
      return;
    }
    submit((manualCheck as { surname: string }).surname, 'manual');
  };

  return (
    <div className="absolute inset-0 z-[9500] flex items-center justify-center bg-black/60 px-5" role="dialog" aria-modal="true" aria-labelledby="surname-picker-title" data-testid="surname-picker">
      <div className="w-full max-w-[360px] rounded-2xl border p-6 shadow-2xl" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--gold-accent)' }}>
        <h2 id="surname-picker-title" className="text-lg font-black tracking-[3px] mb-3" style={{ color: 'var(--text-main)' }}>
          {mode === 'first' ? '設定排行榜姓氏' : '更改姓氏'}
        </h2>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--text-sub)' }}>
          {hasOptions
            ? `你的英文姓氏可對應以下中文姓氏，請選擇正確的一個；如以上皆不是，請按「${OTHER_OPTION_LABEL}」。`
            : mode === 'first'
              ? '系統未能從你的英文姓名找到對應的中文姓氏，請輸入你的中文姓氏（一至兩個中文字）。'
              : '請輸入你的中文姓氏（一至兩個中文字）。'}
          排行榜只會顯示學校名稱、姓氏及「同學」，不會顯示全名。
        </p>

        {hasOptions && (
          <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="中文姓氏選項">
            {state.options.map((o) => (
              <button
                key={o}
                role="radio"
                aria-checked={!other && selected === o}
                onClick={() => { setSelected(o); setOther(false); setError(null); }}
                className="py-3 rounded-xl border-2 text-xl font-black transition-all active:scale-95"
                style={{
                  borderColor: !other && selected === o ? 'var(--gold-accent)' : 'var(--panel-border)',
                  backgroundColor: !other && selected === o ? 'rgba(184,134,11,0.18)' : 'var(--panel-bg)',
                  color: 'var(--text-main)',
                }}
              >
                {o}
              </button>
            ))}
            <button
              role="radio"
              aria-checked={other}
              data-testid="surname-other"
              onClick={() => { setOther(true); setSelected(null); setError(null); }}
              className="col-span-3 py-2 rounded-xl border-2 text-[14px] font-bold transition-all active:scale-95"
              style={{
                borderColor: other ? 'var(--gold-accent)' : 'var(--panel-border)',
                backgroundColor: other ? 'rgba(184,134,11,0.18)' : 'var(--panel-bg)',
                color: 'var(--text-main)',
              }}
            >
              {OTHER_OPTION_LABEL}
            </button>
          </div>
        )}
        {textMode && (
          <div className="mb-4">
            <label htmlFor="surname-input" className="block text-[12px] font-bold mb-2" style={{ color: 'var(--text-main)' }}>
              中文姓氏（一至兩個中文字）
            </label>
            <input
              id="surname-input"
              data-testid="surname-input"
              lang="zh-Hant"
              value={text}
              maxLength={6}
              autoFocus={other}
              onChange={(e) => { setText(e.target.value); setError(null); }}
              placeholder="例如：陳、歐陽"
              className="w-full rounded-xl border-2 px-4 py-3 text-lg font-bold outline-none"
              style={{ borderColor: 'var(--gold-accent)', backgroundColor: 'var(--panel-bg)', color: 'var(--text-main)' }}
            />
          </div>
        )}

        <p className="text-[12px] mb-2" style={{ color: 'var(--text-sub)' }}>
          排行榜將顯示：<span className="font-black" style={{ color: 'var(--gold-accent)' }}>{labelFor(school, candidate ?? '')}</span>
        </p>
        {error && <p role="alert" className="text-[12px] font-bold mb-2 text-[#c0392b]">{error}</p>}

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={onConfirm}
            disabled={saving || !candidate}
            data-testid="surname-confirm"
            className="w-full py-3 rounded-full font-black tracking-[4px] transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: 'var(--gold-accent)', color: '#fff' }}
          >
            確定
          </button>
          {mode === 'first' ? (
            <button onClick={() => submit('', 'none')} disabled={saving} className="w-full py-2 text-[13px] font-bold underline disabled:opacity-40" style={{ color: 'var(--text-sub)' }}>
              暫不選擇（排行榜顯示「{labelFor(school, '')}」，可稍後在「設定」更改）
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onClose} disabled={saving} className="flex-1 py-2 rounded-full border text-[13px] font-bold disabled:opacity-40" style={{ borderColor: 'var(--panel-border)', color: 'var(--text-sub)' }}>
                取消
              </button>
              <button onClick={() => submit('', 'none')} disabled={saving} className="flex-1 py-2 rounded-full border text-[13px] font-bold disabled:opacity-40" style={{ borderColor: 'var(--panel-border)', color: 'var(--text-sub)' }}>
                不顯示姓氏
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurnamePicker;
