// 設定 › UI 大小 › 牌效率 UI：手牌、切牌牌組、按鈕（三個）
import {
    BUTTON_SIZE_MAX,
    BUTTON_SIZE_MIN,
    DEFAULT_EFFICIENCY_BUTTON_SIZE,
    DEFAULT_HAND_TILE_SIZE,
    DEFAULT_PALETTE_TILE_SIZE,
    TILE_SIZE_MAX,
    TILE_SIZE_MIN,
} from "../../tools/settings";
import { useSettings } from "./useSettings";
import { ButtonPreview, SettingsHeader, SliderRow, TilePreview } from "./SettingsShared";

function SettingsEfficiency({ onChanged }) {
    const { settings, update } = useSettings(onChanged);

    return (
        <div
            className="container"
            style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
            <SettingsHeader title="牌效率 UI" backTo="/settings/ui" />

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <SliderRow
                    title="上方手牌大小"
                    hint="牌效率何切頁目前手牌的寬度；「切牌前」那一行也跟著變。"
                    value={settings.handTileSize}
                    min={TILE_SIZE_MIN}
                    max={TILE_SIZE_MAX}
                    onChange={update("handTileSize")}
                    onReset={(v) => update("handTileSize")(v)}
                    defaultValue={DEFAULT_HAND_TILE_SIZE}
                    preview={<TilePreview width={`${settings.handTileSize}px`} />}
                />
                <SliderRow
                    title="調整用於切牌的牌大小"
                    hint="下方那副完整牌組的寬度；手牌裡沒有這張會記一次錯誤的那副。"
                    value={settings.paletteTileSize}
                    min={TILE_SIZE_MIN}
                    max={TILE_SIZE_MAX}
                    onChange={update("paletteTileSize")}
                    onReset={(v) => update("paletteTileSize")(v)}
                    defaultValue={DEFAULT_PALETTE_TILE_SIZE}
                    preview={<TilePreview width={`${settings.paletteTileSize}px`} />}
                />
                <SliderRow
                    title="按鈕大小"
                    hint="這一頁所有按鈕共用的字級：顯示切牌、顯示向聽數、顯示進張列表、顯示切牌前、切牌前理牌、蓋牌、新的手牌、自動理牌、反悔。"
                    value={settings.efficiencyButtonSize}
                    min={BUTTON_SIZE_MIN}
                    max={BUTTON_SIZE_MAX}
                    onChange={update("efficiencyButtonSize")}
                    onReset={(v) => update("efficiencyButtonSize")(v)}
                    defaultValue={DEFAULT_EFFICIENCY_BUTTON_SIZE}
                    preview={<ButtonPreview size={settings.efficiencyButtonSize} />}
                />
            </div>
        </div>
    );
}

export default SettingsEfficiency;
