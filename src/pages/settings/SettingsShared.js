// 設定頁共用的小元件：分類列、標題、滑桿列、開關列、各種預覽
import { Link } from "react-router-dom";

// 每一層頁面的標題（左邊是返回連結）
// 用「左固定欄 + 中間標題 + 右固定欄」的版面，兩側留一樣寬的位，
// 標題才會真正居中，返回鈕也不會壓到標題上。
const HEADER_SIDE = 104;

export const SettingsHeader = ({ title, backTo, backLabel = "返回" }) => (
    <div
        style={{
            display: "flex",
            alignItems: "center",
            width: "min(560px, 92vw)",
            gap: "12px",
        }}
    >
        <div style={{ flex: `0 0 ${HEADER_SIDE}px`, display: "flex", justifyContent: "flex-start" }}>
            {backTo && (
                <Link
                    to={backTo}
                    style={{
                        textDecoration: "none",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#007BFF",
                        padding: "6px 14px",
                        border: "1px solid #007BFF",
                        borderRadius: "8px",
                        whiteSpace: "nowrap",
                    }}
                >
                    ‹ {backLabel}
                </Link>
            )}
        </div>

        <div style={{ flex: 1, textAlign: "center", fontSize: "clamp(24px, 2vw, 30px)", fontWeight: "bold" }}>{title}</div>

        {/* 右邊留一樣寬的空位，讓標題保持居中 */}
        <div style={{ flex: `0 0 ${HEADER_SIDE}px` }} />
    </div>
);

// 分類列：點進去下一層
export const CategoryRow = ({ to, title, hint, right }) => (
    <Link
        to={to}
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "min(560px, 92vw)",
            padding: "18px 22px",
            marginBottom: "12px",
            textDecoration: "none",
            color: "#333333",
            border: "1px solid #dddddd",
            borderRadius: "12px",
            backgroundColor: "#FDFDFD",
            transition: "background-color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#F0F6FF";
            e.currentTarget.style.borderColor = "#007BFF";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#FDFDFD";
            e.currentTarget.style.borderColor = "#dddddd";
        }}
    >
        <div>
            <div style={{ fontSize: "19px", fontWeight: "bold" }}>{title}</div>
            {hint && <div style={{ fontSize: "14px", color: "#888888", marginTop: "4px" }}>{hint}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#007BFF", fontSize: "18px", fontWeight: "bold" }}>
            {right}
            <span>›</span>
        </div>
    </Link>
);

// 一行滑桿設定：標題 + 說明 + 滑桿 + 目前數值 + 恢復預設 + 預覽
export const SliderRow = ({ title, hint, value, min, max, onChange, onReset, defaultValue, unit = "px", preview, disabled }) => (
    <div
        style={{
            width: "min(560px, 92vw)",
            padding: "16px 20px",
            marginBottom: "14px",
            border: "1px solid #dddddd",
            borderRadius: "12px",
            backgroundColor: disabled ? "#F5F5F5" : "#FDFDFD",
            opacity: disabled ? 0.6 : 1,
        }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333333" }}>{title}</div>
            <div style={{ fontSize: "17px", fontWeight: "bold", color: "#007BFF" }}>
                {value}
                {unit}
            </div>
        </div>
        {hint && <div style={{ fontSize: "14px", color: "#888888", margin: "4px 0 10px" }}>{hint}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ flex: 1, cursor: disabled ? "not-allowed" : "pointer" }}
            />
            <button
                type="button"
                onClick={() => onReset(defaultValue)}
                style={{
                    padding: "5px 12px",
                    fontSize: "14px",
                    borderRadius: "6px",
                    border: "1px solid #007BFF",
                    backgroundColor: "transparent",
                    color: "#007BFF",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                }}
            >
                恢復預設
            </button>
        </div>

        {preview && (
            <div style={{ marginTop: "10px", display: "flex", gap: "1px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "14px", color: "#888888", marginRight: "8px" }}>預覽</span>
                {preview}
            </div>
        )}
    </div>
);

// 開關列（例如「響應式」）
export const SwitchRow = ({ title, hint, checked, onChange }) => (
    <div
        style={{
            width: "min(560px, 92vw)",
            padding: "16px 20px",
            marginBottom: "14px",
            border: "1px solid #dddddd",
            borderRadius: "12px",
            backgroundColor: "#FDFDFD",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
        }}
    >
        <div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333333" }}>{title}</div>
            {hint && <div style={{ fontSize: "14px", color: "#888888", marginTop: "4px" }}>{hint}</div>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            style={{
                flex: "0 0 auto",
                padding: "7px 18px",
                fontSize: "16px",
                fontWeight: "bold",
                color: "white",
                backgroundColor: checked ? "#007BFF" : "#777777",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
            }}
        >
            {checked ? "開" : "關"}
        </button>
    </div>
);

// 牌面預覽
export const TilePreview = ({ width }) => (
    <>
        {["1m", "2m", "3m", "0p", "5z"].map((tile) => (
            <img
                key={tile}
                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                alt={tile}
                style={{ width, height: "auto", borderRadius: "5px" }}
            />
        ))}
    </>
);

// 按鈕預覽
export const ButtonPreview = ({ size }) => (
    <span
        style={{
            padding: "7px 15px",
            fontSize: `${size}px`,
            fontWeight: "bold",
            backgroundColor: "#007BFF",
            color: "white",
            borderRadius: "10px",
            whiteSpace: "nowrap",
        }}
    >
        顯示切牌：開
    </span>
);
