import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Link, Route, HashRouter as Router, Routes } from "react-router-dom";
import { setLanguage } from "./i18n/zhConvert";
import AotenjiuuCalculateTrainer from "./pages/AotenjiuuCalculateTrainer";
import CalculateShanten from "./pages/CalculateShanten";
import EfficiencyTrainer from "./pages/EfficiencyTrainer";
import FuCalculateTrainer from "./pages/FuCalculateTrainer";
import HandScoreCalculator from "./pages/HandScoreCalculator";
import MainPage from "./pages/MainPage";
import MemoryTrainer from "./pages/MemoryTrainer";
import PointsCalculateTrainer from "./pages/PointsCalculateTrainer";
import PureOnesEfficiencyTrainer from "./pages/PureOnesEfficiencyTrainer";
import PureOnesReadyTrainer from "./pages/PureOnesReadyTrainer";
import Settings from "./pages/Settings";
import SettingsCommon from "./pages/settings/SettingsCommon";
import SettingsEfficiency from "./pages/settings/SettingsEfficiency";
import SettingsTilePage from "./pages/settings/SettingsTilePage";
import SettingsUI from "./pages/settings/SettingsUI";
import reportWebVitals from "./reportWebVitals";
import { SETTINGS_KEY, loadSettings } from "./tools/settings";

const root = ReactDOM.createRoot(document.getElementById("root"));

// 預設簡體：每次開啟都先顯示簡體，不用再手動切換
setLanguage("Hans");

const linkStyle = (fontSize) => ({
    textDecoration: "none",
    fontSize: `${fontSize}px`,
    color: "#007BFF",
    fontWeight: "bold",
    borderRadius: "5px",
    transition: "background-color 0.3s, color 0.3s",
    padding: "5px 10px",
});

const handleHover = (e, isHover) => {
    e.target.style.backgroundColor = isHover ? "#007BFF" : "transparent";
    e.target.style.color = isHover ? "#fff" : "#007BFF";
};

const App = () => {
    // "Hant" 繁體 / "Hans" 簡體；每次開啟都預設簡體（不讀上次的選擇）
    const [lang, setLang] = useState("Hans");
    // 設定頁存檔後 +1，讓各頁重新掛載並讀到新的尺寸
    const [settingsVersion, setSettingsVersion] = useState(0);
    // 導航列字級：設定裡「通用 UI」的值，改了就整排一起變
    const [navSize, setNavSize] = useState(() => loadSettings().navButtonSize);

    useEffect(() => {
        localStorage.setItem("zh-lang", lang);
        setLanguage(lang);
    }, [lang]);

    // 設定改了就重讀導航字級（同一個分頁用 version，其他分頁用 storage 事件）
    useEffect(() => {
        setNavSize(loadSettings().navButtonSize);
    }, [settingsVersion]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === SETTINGS_KEY) setNavSize(loadSettings().navButtonSize);
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const settingsChanged = () => setSettingsVersion((v) => v + 1);

    const NAV_LINKS = [
        { path: "/", title: "首頁" },
        { path: "/calculate-shanten", title: "進張數計算" },
        { path: "/efficiency-trainer", title: "牌效率何切" },
        { path: "/pure-ones-efficiency-trainer", title: "清一色何切" },
        { path: "/pure-ones-ready-trainer", title: "清一色聽牌" },
        { path: "/points-calculate-trainer", title: "點數計算" },
        { path: "/aotenjiuu-calculate-trainer", title: "青天井計算" },
        { path: "/fu-calculate-trainer", title: "符數計算" },
        { path: "/hand-score", title: "手牌算點" },
        { path: "/memory-trainer", title: "記憶訓練" },
        { path: "/settings", title: "設定" },
    ];

    return (
        <React.StrictMode>
            <Router>
                <div>
                    <nav
                        style={{
                            marginBottom: "10px",
                            borderRadius: "8px",
                            display: "flex",
                            justifyContent: "center", // 整體置中
                            alignItems: "center",
                            padding: "10px",
                        }}
                    >
                        <ul
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "5px 10px", // 控制按鈕間距
                                listStyle: "none",
                                justifyContent: "center", // 讓 `ul` 內的按鈕也置中
                                textAlign: "center",
                                alignItems: "center",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            {NAV_LINKS.map(({ path, title }) => (
                                <li key={path} style={{ display: "flex", alignItems: "center" }}>
                                    <Link
                                        to={path}
                                        style={linkStyle(navSize)}
                                        onMouseEnter={(e) => handleHover(e, true)}
                                        onMouseLeave={(e) => handleHover(e, false)}
                                    >
                                        {title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <button
                            data-no-convert
                            onClick={() => setLang(lang === "Hant" ? "Hans" : "Hant")}
                            title={lang === "Hant" ? "切換成簡體" : "切換成繁體"}
                            style={{
                                marginLeft: "10px",
                                padding: "5px 12px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                color: "#007BFF",
                                backgroundColor: "transparent",
                                border: "1px solid #007BFF",
                                borderRadius: "5px",
                                cursor: "pointer",
                            }}
                        >
                            {lang === "Hant" ? "简" : "繁"}
                        </button>
                    </nav>

                    <Routes>
                        <Route path="/" element={<MainPage />} />
                        <Route path="/calculate-shanten" element={<CalculateShanten key={`shanten-${settingsVersion}`} />} />
                        <Route path="/efficiency-trainer" element={<EfficiencyTrainer key={`eff-${settingsVersion}`} />} />
                        <Route path="/pure-ones-efficiency-trainer" element={<PureOnesEfficiencyTrainer key={`poe-${settingsVersion}`} />} />
                        <Route path="/pure-ones-ready-trainer" element={<PureOnesReadyTrainer key={`por-${settingsVersion}`} />} />
                        <Route path="/points-calculate-trainer" element={<PointsCalculateTrainer />} />
                        <Route path="/aotenjiuu-calculate-trainer" element={<AotenjiuuCalculateTrainer />} />
                        <Route path="/fu-calculate-trainer" element={<FuCalculateTrainer />} />
                        <Route path="/hand-score" element={<HandScoreCalculator key={`hs-${settingsVersion}`} />} />
                        <Route path="/memory-trainer" element={<MemoryTrainer key={`mem-${settingsVersion}`} />} />

                        {/* 設定：主頁 → UI 大小 → 各分類 → 具體滑桿 */}
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/ui" element={<SettingsUI />} />
                        <Route path="/settings/ui/common" element={<SettingsCommon onChanged={settingsChanged} />} />
                        <Route path="/settings/ui/efficiency" element={<SettingsEfficiency onChanged={settingsChanged} />} />
                        <Route path="/settings/ui/shanten" element={<SettingsTilePage pageKey="shanten" onChanged={settingsChanged} />} />
                        <Route path="/settings/ui/pure-ones" element={<SettingsTilePage pageKey="pure-ones" onChanged={settingsChanged} />} />
                        <Route path="/settings/ui/hand-score" element={<SettingsTilePage pageKey="hand-score" onChanged={settingsChanged} />} />
                        <Route path="/settings/ui/memory" element={<SettingsTilePage pageKey="memory" onChanged={settingsChanged} />} />
                    </Routes>
                </div>
            </Router>
        </React.StrictMode>
    );
};

root.render(<App />);

reportWebVitals();

// PWA：只在正式打包時註冊 Service Worker
// 開發模式（npm start）不註冊，否則快取會讓改動看不到
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/sw.js`).catch(() => {
            // 註冊失敗不影響主功能（例如用 file:// 開啟）
        });
    });
}
