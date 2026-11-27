// 設定主頁：只放分類入口，之後新增設定就多一列
import { CategoryRow, SettingsHeader } from "./settings/SettingsShared";

function Settings() {
    return (
        <div
            className="container"
            style={{
                maxWidth: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            <SettingsHeader title="設定" />

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CategoryRow to="/settings/ui" title="UI 大小" hint="牌面與按鈕的大小" />
            </div>

            <div style={{ fontSize: "14px", color: "#999999", marginTop: "10px", textAlign: "center", lineHeight: 1.7 }}>
                之後新增的設定也會放在這一頁。
            </div>
        </div>
    );
}

export default Settings;
