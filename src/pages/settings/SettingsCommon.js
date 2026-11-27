// 設定 › UI 大小 › 通用 UI：導航列按鈕大小（統一一個）
import { NAV_SIZE_MAX, NAV_SIZE_MIN, DEFAULT_NAV_BUTTON_SIZE } from "../../tools/settings";
import { useSettings } from "./useSettings";
import { SettingsHeader, SliderRow } from "./SettingsShared";

function SettingsCommon({ onChanged }) {
    const { settings, update } = useSettings(onChanged);

    return (
        <div
            className="container"
            style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
            <SettingsHeader title="通用 UI" backTo="/settings/ui" />

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <SliderRow
                    title="導航列按鈕大小"
                    hint="頂部那一排（首頁 / 進張數計算 / 牌效率何切 / … / 設定）的字級，整排一起變。"
                    value={settings.navButtonSize}
                    min={NAV_SIZE_MIN}
                    max={NAV_SIZE_MAX}
                    onChange={update("navButtonSize")}
                    onReset={(v) => update("navButtonSize")(v)}
                    defaultValue={DEFAULT_NAV_BUTTON_SIZE}
                    preview={<span style={{ fontSize: `${settings.navButtonSize}px`, fontWeight: "bold", color: "#007BFF" }}>首頁　進張數計算　牌效率何切</span>}
                />
            </div>
        </div>
    );
}

export default SettingsCommon;
