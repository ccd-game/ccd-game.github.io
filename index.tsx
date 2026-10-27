import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/styles/design-tokens.css';
import './src/styles/home-chrome.css';
import './src/index.css';
import { installBlockPinchZoom } from './src/lib/blockPinchZoom';
import { containGameFrame, type SafeInsets } from './src/lib/gameContain';

installBlockPinchZoom();

/**
 * 整頁只有這一層縮放（#root transform: scale(var(--game-scale))）。
 * Browser：contain 進整個視口。Standalone：contain 進 safe area，sat／sab 由 body 黑邊吃掉。
 * 畫布內 --sat／--sab 在 standalone 歸零，避免 chrome 再被頂開。不設 scale 下限。
 */
const standaloneMq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');

const isStandaloneMode = () =>
  document.documentElement.classList.contains('is-standalone') || standaloneMq.matches;

const readSafeInsets = (): SafeInsets => {
  const probe = document.getElementById('sa-contain-probe') ?? document.createElement('div');
  if (!probe.isConnected) {
    probe.id = 'sa-contain-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'visibility:hidden',
      'pointer-events:none',
      'box-sizing:content-box',
      'width:0',
      'height:0',
      'border:0',
      'padding-top:env(safe-area-inset-top)',
      'padding-right:env(safe-area-inset-right)',
      'padding-bottom:env(safe-area-inset-bottom)',
      'padding-left:env(safe-area-inset-left)',
    ].join(';');
    document.documentElement.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  const n = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  return {
    top: n(cs.paddingTop),
    right: n(cs.paddingRight),
    bottom: n(cs.paddingBottom),
    left: n(cs.paddingLeft),
  };
};

const updateGameScale = () => {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const standalone = isStandaloneMode();
  const insets = standalone ? readSafeInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = containGameFrame(vw, vh, { standalone, insets });
  const root = document.documentElement;
  root.style.setProperty('--game-scale', String(frame.scale));
  root.style.setProperty('--sa-contain-top', `${insets.top}px`);
  root.style.setProperty('--sa-contain-right', `${insets.right}px`);
  root.style.setProperty('--sa-contain-bottom', `${insets.bottom}px`);
  root.style.setProperty('--sa-contain-left', `${insets.left}px`);
  if (standalone) {
    root.style.setProperty('--sat', '0px');
    root.style.setProperty('--sab', '0px');
  } else {
    root.style.removeProperty('--sat');
    root.style.removeProperty('--sab');
  }
};

/* v1.3.15: sync display-mode → html.is-standalone（peek 六篇；原生 @media 後備） */
const syncStandaloneClass = () => {
  document.documentElement.classList.toggle('is-standalone', standaloneMq.matches);
};
syncStandaloneClass();
updateGameScale();
const onStandaloneChange = () => {
  syncStandaloneClass();
  updateGameScale();
};
standaloneMq.addEventListener('change', onStandaloneChange);
window.addEventListener('resize', updateGameScale);
window.visualViewport?.addEventListener('resize', updateGameScale);
window.visualViewport?.addEventListener('scroll', updateGameScale);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
