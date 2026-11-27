// 設定 › UI 大小 底下的單一牌面設定頁
// 這幾頁結構一樣（一個牌面大小滑桿，可選加「響應式」開關），所以共用一個元件
import {
    DEFAULT_HAND_SCORE_RESPONSIVE,
    DEFAULT_HAND_SCORE_TILE_SIZE,
    DEFAULT_MEMORY_RESPONSIVE,
    DEFAULT_MEMORY_TILE_SIZE,
    DEFAULT_PURE_ONES_TILE_SIZE,
    DEFAULT_SHANTEN_TILE_SIZE,
    RESPONSIVE_TILE_SIZE,
    TILE_SIZE_MAX,
    TILE_SIZE_MIN,
    tileWidth,
} from "../../tools/settings";
import { useSettings } from "./useSettings";
import { SettingsHeader, SliderRow, SwitchRow, TilePreview } from "./SettingsShared";

// 各頁的設定：key 是 settings 裡的欄位名
const PAGES = {
    shanten: {
        title: "進張數計算 UI",
        sizeKey: "shantenTileSize",
        defaultSize: DEFAULT_SHANTEN_TILE_SIZE,
        hint: "進張數計算頁手牌的寬度。",
    },
    "pure-ones": {
        title: "清一色 UI",
        sizeKey: "pureOnesTileSize",
        defaultSize: DEFAULT_PURE_ONES_TILE_SIZE,
        hint: "清一色何切與清一色聽牌共用的牌面寬度。",
    },
    "hand-score": {
        title: "手牌算點 UI",
        sizeKey: "handScoreTileSize",
        defaultSize: DEFAULT_HAND_SCORE_TILE_SIZE,
        hint: "手牌算點頁手牌與點選面板的牌面寬度。",
        responsiveKey: "handScoreResponsive",
        defaultResponsive: DEFAULT_HAND_SCORE_RESPONSIVE,
    },
    memory: {
        title: "記憶訓練 UI",
        sizeKey: "memoryTileSize",
        defaultSize: DEFAULT_MEMORY_TILE_SIZE,
        hint: "記憶訓練頁看牌與作答時牌面寬度。",
        responsiveKey: "memoryResponsive",
        defaultResponsive: DEFAULT_MEMORY_RESPONSIVE,
    },
};

const TileSettingsPage = ({ pageKey, onChanged }) => {
    const page = PAGES[pageKey];
    const { settings, update } = useSettings(onChanged);
    const responsive = page.responsiveKey ? settings[page.responsiveKey] : false;

    return (
        <div
            className="container"
            style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
            <SettingsHeader title={page.title} backTo="/settings/ui" />

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {page.responsiveKey && (
                    <SwitchRow
                        title="響應式大小"
                        hint={`開：牌面跟著視窗寬度自動縮放（24～38px）；關：使用下面的固定大小。`}
                        checked={responsive}
                        onChange={update(page.responsiveKey)}
                    />
                )}
                <SliderRow
                    title="牌面大小"
                    hint={page.hint}
                    value={settings[page.sizeKey]}
                    min={TILE_SIZE_MIN}
                    max={TILE_SIZE_MAX}
                    onChange={update(page.sizeKey)}
                    onReset={(v) => update(page.sizeKey)(v)}
                    defaultValue={page.defaultSize}
                    disabled={responsive}
                    preview={<TilePreview width={tileWidth(settings[page.sizeKey], responsive)} />}
                />
            </div>

            {responsive && (
                <div style={{ fontSize: "14px", color: "#999999", textAlign: "center", lineHeight: 1.7 }}>
                    目前是響應式：牌面使用 {RESPONSIVE_TILE_SIZE}，上面的滑桿暫時不生效。
                </div>
            )}
        </div>
    );
};

export default TileSettingsPage;
