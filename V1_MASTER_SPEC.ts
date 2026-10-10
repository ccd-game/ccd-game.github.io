
/**
 * 《文言地城》V1.0 核心規格紀錄文檔
 */

export const V1_MASTER_SPEC = {
  VERSION: "1.1.4",
  LAST_UPDATE: "2024-05-21",
  
  LAYOUT: {
    ROOT_RATIO: "9:16",
    ROOT_BG: "#1a1a1a",
    DIVIDER_POSITION_Y: "40%",
    DIVIDER_COLOR: "#d4af37",
    SAFE_AREA_TOP: "12px",
  },

  Z_INDEX: {
    BACKGROUND: 0,
    CHARACTER: 10,
    DIVIDER: 30,
    HUD_BOTTOM_PLATE: 80,
    PLAYER_HP_BAR: 90,
    SKILL_PANEL: 95,
    INPUT_SLOTS: 100,
    QUESTION_BOX: 110,
    BOSS_SPEECH: 150,
    HUD_CONTROLS: 200,
    MENU_SCREEN: 500,
    INK_SPLASH: 20000,
    SCREEN_FLASH: 8000,
    BOSS_SLASH: 9000,
    PLAYER_SLASH: 10000,
    GLOBAL_OVERLAYS: 99999,
  },

  ANIMATIONS: {
    INPUT_PAD: {
      ENTRY: { NAME: "cardPopIn", STAGGER: 0.04 },
      EXIT: { NAME: "cardExitDown" }
    },
    SLOTS: {
      STAMP: { DURATION: "0.2s" },
      CONVERGE: { TARGET_Y: "-127px", DURATION: "0.5s" }
    },
    INK: {
      COLOR: "#1a0000",
      DURATION: "5.7s",
      BEZIER: "cubic-bezier(0.1, 0.9, 0.2, 1)",
      PHYSICAL_CLIP: "none", // 已移除物理裁切
      MOBILE_OPTIMIZE: ["image-rendering: crisp-edges", "translateZ(0)"],
      SVG_FILTER_SCALE: 0, // 已移除濾鏡
      ALPHA_SLOPE: 0 
    }
  }
};
