import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/styles/design-tokens.css';
import './src/styles/home-chrome.css';
import './src/index.css';
import { installBlockPinchZoom } from './src/lib/blockPinchZoom';
import { containGameFrame } from './src/lib/gameContain';

installBlockPinchZoom();

/**
 * 整頁只有這一層縮放（#root transform: scale(var(--game-scale))）。
 * Browser 與 Standalone 都對整個視覺視口滿寬縮放，垂直置中。
 * 不讀 safe-area 來改 scale 或 padding。Standalone 畫布內 --sat／--sab 歸零。
 * 不設 scale 下限。
 */
const standaloneMq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');

const isStandaloneMode = () =>
  document.documentElement.classList.contains('is-standalone') || standaloneMq.matches;

const updateGameScale = () => {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const frame = containGameFrame(vw, vh);
  const root = document.documentElement;
  root.style.setProperty('--game-scale', String(frame.scale));
  if (isStandaloneMode()) {
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
