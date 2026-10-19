import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/styles/design-tokens.css';
import './src/styles/home-chrome.css';
import './src/index.css';
import { installBlockPinchZoom } from './src/lib/blockPinchZoom';

installBlockPinchZoom();

/** letterbox-390: scale = min(vw/390, vh/844); #root stays 390×844 design px */
const GAME_DESIGN_W = 390;
const GAME_DESIGN_H = 844;

const updateGameScale = () => {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const scale = Math.min(vw / GAME_DESIGN_W, vh / GAME_DESIGN_H);
  document.documentElement.style.setProperty('--game-scale', String(scale));
};

updateGameScale();
window.addEventListener('resize', updateGameScale);
window.visualViewport?.addEventListener('resize', updateGameScale);
window.visualViewport?.addEventListener('scroll', updateGameScale);

/* v1.3.15: sync display-mode → html.is-standalone（peek 六篇／sat 規則；原生 @media 後備） */
const standaloneMq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
const syncStandaloneClass = () => {
  document.documentElement.classList.toggle('is-standalone', standaloneMq.matches);
};
syncStandaloneClass();
standaloneMq.addEventListener('change', syncStandaloneClass);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
