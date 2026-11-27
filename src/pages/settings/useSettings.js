// 設定狀態的共用 hook：設定頁改值就立刻存檔，其他頁面讀到同一份
// onChanged 由外層傳入，用來通知 App 重新掛載各頁（讓新尺寸立刻生效）
import { useCallback, useEffect, useRef, useState } from "react";
import { SETTINGS_KEY, loadSettings, saveSettings } from "../../tools/settings";

export const useSettings = (onChanged) => {
    const [settings, setSettings] = useState(loadSettings);

    // 用 ref 包住，避免外層每次 render 給新函式造成無限更新
    const onChangedRef = useRef(onChanged);
    useEffect(() => {
        onChangedRef.current = onChanged;
    }, [onChanged]);

    // 任何變動都立刻存起來
    useEffect(() => {
        saveSettings(settings);
        if (onChangedRef.current) onChangedRef.current();
    }, [settings]);

    // 其他分頁／視窗改了同一個 key 時同步
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === SETTINGS_KEY) setSettings(loadSettings());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const update = useCallback((key) => (value) => setSettings((prev) => ({ ...prev, [key]: value })), []);

    return { settings, update };
};
