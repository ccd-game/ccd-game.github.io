import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BLOCK_PINCH_DOUBLE_TAP_MS,
  installBlockPinchZoom,
  uninstallBlockPinchZoom,
} from './blockPinchZoom';

type Listener = (event: Event) => void;
type Entry = { fn: Listener; opts?: boolean | AddEventListenerOptions };

function makeTarget(id?: string) {
  const listeners = new Map<string, Entry[]>();
  const target = {
    id,
    addEventListener: vi.fn((type: string, fn: Listener, opts?: boolean | AddEventListenerOptions) => {
      const list = listeners.get(type) ?? [];
      list.push({ fn, opts });
      listeners.set(type, list);
    }),
    removeEventListener: vi.fn((type: string, fn: Listener) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((e) => e.fn !== fn),
      );
    }),
    _listeners: listeners,
    _call(type: string, event: Event) {
      for (const { fn } of [...(listeners.get(type) ?? [])]) fn(event);
    },
  };
  return target;
}

describe('installBlockPinchZoom', () => {
  let doc: ReturnType<typeof makeTarget>;
  let root: ReturnType<typeof makeTarget>;
  let originalDocument: Document;

  beforeEach(() => {
    doc = makeTarget();
    root = makeTarget('root');
    originalDocument = globalThis.document;
    const fakeDoc = {
      addEventListener: doc.addEventListener,
      removeEventListener: doc.removeEventListener,
      getElementById: (id: string) => (id === 'root' ? root : null),
    };
    vi.stubGlobal('document', fakeDoc);
  });

  afterEach(() => {
    uninstallBlockPinchZoom();
    vi.stubGlobal('document', originalDocument);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function passiveFalse(opts: boolean | AddEventListenerOptions | undefined): boolean {
    return typeof opts === 'object' && opts !== null && opts.passive === false;
  }

  it('於 document 與 #root 以 passive:false 註冊 gesture*／touchmove／touchend', () => {
    installBlockPinchZoom();

    for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'touchmove', 'touchend'] as const) {
      const docEntries = doc._listeners.get(type) ?? [];
      expect(docEntries.length).toBe(1);
      expect(passiveFalse(docEntries[0].opts)).toBe(true);

      expect(root.addEventListener).toHaveBeenCalledWith(
        type,
        expect.any(Function),
        expect.objectContaining({ passive: false }),
      );
    }
  });

  it('gesturestart／gesturechange／gestureend 會 preventDefault', () => {
    installBlockPinchZoom();
    for (const type of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
      const e = { preventDefault: vi.fn(), type } as unknown as Event;
      doc._call(type, e);
      expect(e.preventDefault).toHaveBeenCalled();
    }
  });

  it('多指 touchmove（touches.length > 1）會 preventDefault；單指不會', () => {
    installBlockPinchZoom();

    const multi = {
      preventDefault: vi.fn(),
      touches: { length: 2 },
    } as unknown as TouchEvent;
    doc._call('touchmove', multi);
    expect(multi.preventDefault).toHaveBeenCalled();

    const single = {
      preventDefault: vi.fn(),
      touches: { length: 1 },
    } as unknown as TouchEvent;
    doc._call('touchmove', single);
    expect(single.preventDefault).not.toHaveBeenCalled();
  });

  /**
   * 測點（雙擊間隔）：兩次 touchend 間隔 ≤ BLOCK_PINCH_DOUBLE_TAP_MS 時
   * 第二次會 preventDefault（擋瀏覽器雙擊縮放）；不 stopPropagation。
   * 間隔超過閾值則不擋。手動：iOS Safari／Android Chrome 連點按鈕應仍可點。
   */
  it('雙擊間隔 ≤ 閾值時第二次 touchend preventDefault；超過則不擋', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    installBlockPinchZoom();

    const first = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as TouchEvent;
    doc._call('touchend', first);
    expect(first.preventDefault).not.toHaveBeenCalled();

    vi.setSystemTime(1_000_000 + BLOCK_PINCH_DOUBLE_TAP_MS);
    const second = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as TouchEvent;
    doc._call('touchend', second);
    expect(second.preventDefault).toHaveBeenCalled();
    expect(second.stopPropagation).not.toHaveBeenCalled();

    vi.setSystemTime(1_000_000 + BLOCK_PINCH_DOUBLE_TAP_MS + BLOCK_PINCH_DOUBLE_TAP_MS + 1);
    const third = { preventDefault: vi.fn() } as unknown as TouchEvent;
    doc._call('touchend', third);
    expect(third.preventDefault).not.toHaveBeenCalled();
  });

  it('uninstall 後不再呼叫 preventDefault', () => {
    const uninstall = installBlockPinchZoom();
    uninstall();
    expect(doc.removeEventListener).toHaveBeenCalled();
    expect(root.removeEventListener).toHaveBeenCalled();
    const e = { preventDefault: vi.fn() } as unknown as Event;
    doc._call('gesturestart', e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
