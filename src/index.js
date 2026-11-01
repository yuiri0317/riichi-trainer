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
import PointsCalculateTrainer from "./pages/PointsCalculateTrainer";
import PureOnesEfficiencyTrainer from "./pages/PureOnesEfficiencyTrainer";
import PureOnesReadyTrainer from "./pages/PureOnesReadyTrainer";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));

const linkStyle = {
    textDecoration: "none",
    fontSize: "18px",
    color: "#007BFF",
    fontWeight: "bold",
    borderRadius: "5px",
    transition: "background-color 0.3s, color 0.3s",
    padding: "5px 10px",
};

const handleHover = (e, isHover) => {
    e.target.style.backgroundColor = isHover ? "#007BFF" : "transparent";
    e.target.style.color = isHover ? "#fff" : "#007BFF";
};

const App = () => {
    // "Hant" 繁體（預設）/ "Hans" 簡體，選擇會存在 localStorage
    const [lang, setLang] = useState(() => localStorage.getItem("zh-lang") || "Hant");

    useEffect(() => {
        localStorage.setItem("zh-lang", lang);
        setLanguage(lang);
    }, [lang]);

    const pageTitles = ["首頁", "進張數計算", "牌效率何切", "清一色何切", "清一色聽牌", "點數計算", "青天井計算", "符數計算", "手牌算點"];

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
                            {[
                                "/",
                                "/calculate-shanten",
                                "/efficiency-trainer",
                                "/pure-ones-efficiency-trainer",
                                "/pure-ones-ready-trainer",
                                "/points-calculate-trainer",
                                "/aotenjiuu-calculate-trainer",
                                "/fu-calculate-trainer",
                                "/hand-score",
                            ].map((path, index) => (
                                <li key={path} style={{ display: "flex", alignItems: "center" }}>
                                    <Link to={path} style={linkStyle} onMouseEnter={(e) => handleHover(e, true)} onMouseLeave={(e) => handleHover(e, false)}>
                                        {pageTitles[index]}
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
                        <Route path="/calculate-shanten" element={<CalculateShanten />} />
                        <Route path="/efficiency-trainer" element={<EfficiencyTrainer />} />
                        <Route path="/pure-ones-efficiency-trainer" element={<PureOnesEfficiencyTrainer />} />
                        <Route path="/pure-ones-ready-trainer" element={<PureOnesReadyTrainer />} />
                        <Route path="/points-calculate-trainer" element={<PointsCalculateTrainer />} />
                        <Route path="/aotenjiuu-calculate-trainer" element={<AotenjiuuCalculateTrainer />} />
                        <Route path="/fu-calculate-trainer" element={<FuCalculateTrainer />} />
                        <Route path="/hand-score" element={<HandScoreCalculator />} />
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
