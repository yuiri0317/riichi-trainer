// 使用者設定：存在 localStorage，所有頁面共用同一份
//
// 設定分成幾組，對應「設定 › UI 大小 › …」底下的分類頁：
//   navButtonSize        通用 UI：頂部導航列那排按鈕的字級
//   paletteTileSize      牌效率 UI：下方切牌用的牌寬度
//   handTileSize         牌效率 UI：上方手牌寬度
//   efficiencyButtonSize 牌效率 UI：該頁所有按鈕的字級（統一一個）
//   shantenTileSize      進張數計算：牌面寬度
//   pureOnesTileSize     清一色（何切／聽牌共用）：牌面寬度
//   handScoreTileSize    手牌算點：牌面寬度
//   handScoreResponsive  手牌算點：true = 跟視窗縮放（clamp），false = 用上面的 px
//   memoryTileSize       記憶訓練：牌面寬度
//   memoryResponsive     記憶訓練：true = 跟視窗縮放，false = 用上面的 px
//
// 預設值對齊各頁原本的外觀：
//   手牌算點／記憶訓練原本是 clamp(24px, 6.2vw, 38px)，取上限 38px
//   導航列原本 18px，牌效率按鈕原本 20px

export const SETTINGS_KEY = "app-settings";

// 牌面：手牌算點頁原本的 clamp(24px, 6.2vw, 38px) 上限
export const DEFAULT_PALETTE_TILE_SIZE = 38;
export const DEFAULT_HAND_TILE_SIZE = 38;
export const DEFAULT_HAND_SCORE_TILE_SIZE = 38;
export const DEFAULT_MEMORY_TILE_SIZE = 38;
export const DEFAULT_SHANTEN_TILE_SIZE = 38;
export const DEFAULT_PURE_ONES_TILE_SIZE = 38;

// 按鈕與導航字級
export const DEFAULT_EFFICIENCY_BUTTON_SIZE = 20;
export const DEFAULT_NAV_BUTTON_SIZE = 18;

// 原本就是響應式的兩頁，預設開啟響應式（跟以前一樣隨視窗縮放）
export const DEFAULT_HAND_SCORE_RESPONSIVE = true;
export const DEFAULT_MEMORY_RESPONSIVE = true;

// 滑桿範圍
export const TILE_SIZE_MIN = 20;
export const TILE_SIZE_MAX = 64;
export const BUTTON_SIZE_MIN = 12;
export const BUTTON_SIZE_MAX = 32;
export const NAV_SIZE_MIN = 12;
export const NAV_SIZE_MAX = 30;

// 響應式的牌面：和手牌算點原本的寫法一致
export const RESPONSIVE_TILE_SIZE = "clamp(24px, 6.2vw, 38px)";

export const DEFAULT_SETTINGS = {
    navButtonSize: DEFAULT_NAV_BUTTON_SIZE,
    paletteTileSize: DEFAULT_PALETTE_TILE_SIZE,
    handTileSize: DEFAULT_HAND_TILE_SIZE,
    efficiencyButtonSize: DEFAULT_EFFICIENCY_BUTTON_SIZE,
    shantenTileSize: DEFAULT_SHANTEN_TILE_SIZE,
    pureOnesTileSize: DEFAULT_PURE_ONES_TILE_SIZE,
    handScoreTileSize: DEFAULT_HAND_SCORE_TILE_SIZE,
    handScoreResponsive: DEFAULT_HAND_SCORE_RESPONSIVE,
    memoryTileSize: DEFAULT_MEMORY_TILE_SIZE,
    memoryResponsive: DEFAULT_MEMORY_RESPONSIVE,
};

const clampInt = (value, fallback, min, max) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
};

const clampTile = (value, fallback) => clampInt(value, fallback, TILE_SIZE_MIN, TILE_SIZE_MAX);
const clampButton = (value, fallback) => clampInt(value, fallback, BUTTON_SIZE_MIN, BUTTON_SIZE_MAX);
const clampNav = (value, fallback) => clampInt(value, fallback, NAV_SIZE_MIN, NAV_SIZE_MAX);

const asBool = (value, fallback) => (typeof value === "boolean" ? value : fallback);

// 讀取設定；資料壞掉就回到預設值
export const loadSettings = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (parsed && typeof parsed === "object") {
            return {
                navButtonSize: clampNav(parsed.navButtonSize, DEFAULT_NAV_BUTTON_SIZE),
                paletteTileSize: clampTile(parsed.paletteTileSize, DEFAULT_PALETTE_TILE_SIZE),
                handTileSize: clampTile(parsed.handTileSize, DEFAULT_HAND_TILE_SIZE),
                efficiencyButtonSize: clampButton(parsed.efficiencyButtonSize, DEFAULT_EFFICIENCY_BUTTON_SIZE),
                shantenTileSize: clampTile(parsed.shantenTileSize, DEFAULT_SHANTEN_TILE_SIZE),
                pureOnesTileSize: clampTile(parsed.pureOnesTileSize, DEFAULT_PURE_ONES_TILE_SIZE),
                handScoreTileSize: clampTile(parsed.handScoreTileSize, DEFAULT_HAND_SCORE_TILE_SIZE),
                handScoreResponsive: asBool(parsed.handScoreResponsive, DEFAULT_HAND_SCORE_RESPONSIVE),
                memoryTileSize: clampTile(parsed.memoryTileSize, DEFAULT_MEMORY_TILE_SIZE),
                memoryResponsive: asBool(parsed.memoryResponsive, DEFAULT_MEMORY_RESPONSIVE),
            };
        }
    } catch {
        // 無痕模式或資料損壞，用預設值
    }
    return { ...DEFAULT_SETTINGS };
};

export const saveSettings = (settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // 寫不進去不影響使用
    }
};

// 牌面寬度：響應式就給 clamp()，否則給固定 px
export const tileWidth = (size, responsive = false) => (responsive ? RESPONSIVE_TILE_SIZE : `${size}px`);
