// 設定 › UI 大小：再分通用／牌效率／各頁面
import { CategoryRow, SettingsHeader } from "./SettingsShared";

function SettingsUI() {
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
            <SettingsHeader title="UI 大小" backTo="/settings" />

            <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CategoryRow to="/settings/ui/common" title="通用 UI" hint="頂部導航列按鈕大小" />
                <CategoryRow to="/settings/ui/efficiency" title="牌效率 UI" hint="手牌、切牌牌組與按鈕" />
                <CategoryRow to="/settings/ui/shanten" title="進張數計算 UI" hint="牌面大小" />
                <CategoryRow to="/settings/ui/pure-ones" title="清一色 UI" hint="何切與聽牌共用的牌面大小" />
                <CategoryRow to="/settings/ui/hand-score" title="手牌算點 UI" hint="牌面大小與響應式" />
                <CategoryRow to="/settings/ui/memory" title="記憶訓練 UI" hint="牌面大小與響應式" />
            </div>

            <div style={{ fontSize: "14px", color: "#999999", marginTop: "10px", textAlign: "center", lineHeight: 1.7 }}>
                點數計算、青天井計算、符數計算只有輸入框與數字，沒有大小可調，因此不在這裡。
            </div>
        </div>
    );
}

export default SettingsUI;
