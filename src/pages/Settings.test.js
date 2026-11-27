import { act } from "react";
import { createRoot } from "react-dom/client";
import Settings from "./Settings";
import SettingsCommon from "./settings/SettingsCommon";
import SettingsEfficiency from "./settings/SettingsEfficiency";
import SettingsTilePage from "./settings/SettingsTilePage";
import SettingsUI from "./settings/SettingsUI";

// react-router-dom v7 在 jest 下解析不到，測試只需要 Link 能渲染成一個 <a>，
// 所以直接把整個模組換成最小實作（不影響正式建置）
jest.mock("react-router-dom", () => ({
    Link: ({ to, children, ...rest }) => (
        <a href={to} {...rest}>
            {children}
        </a>
    ),
}), { virtual: true });

// 設定頁是三層結構：設定 → UI 大小 → 各分類 → 滑桿
// 這裡確認每一層該有的東西有出現，且滑桿數量正確
describe("設定頁", () => {
    let container;
    let root;

    beforeAll(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    });

    beforeEach(() => {
        localStorage.clear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const renderAt = (element) => {
        act(() => root.render(element));
    };

    const sliders = () => [...container.querySelectorAll('input[type="range"]')];

    test("主頁只有分類入口，沒有滑桿", () => {
        renderAt(<Settings />);
        expect(container.textContent).toContain("設定");
        expect(container.textContent).toContain("UI 大小");
        expect(sliders()).toHaveLength(0);
    });

    test("UI 大小頁列出各分類，仍然沒有滑桿", () => {
        renderAt(<SettingsUI />);
        for (const title of ["通用 UI", "牌效率 UI", "進張數計算 UI", "清一色 UI", "手牌算點 UI", "記憶訓練 UI"]) {
            expect(container.textContent).toContain(title);
        }
        expect(sliders()).toHaveLength(0);
        // 點數計算等純輸入頁不該出現
        expect(container.textContent).not.toContain("點數計算 UI");
    });

    test("通用 UI 只有一個導航按鈕大小滑桿", () => {
        renderAt(<SettingsCommon />);
        expect(sliders()).toHaveLength(1);
        expect(container.textContent).toContain("導航列按鈕大小");
    });

    test("牌效率 UI 正好三個滑桿", () => {
        renderAt(<SettingsEfficiency />);
        expect(sliders()).toHaveLength(3);
        expect(container.textContent).toContain("上方手牌大小");
        expect(container.textContent).toContain("調整用於切牌的牌大小");
        expect(container.textContent).toContain("按鈕大小");
    });

    test("手牌算點 UI 有響應式開關，預設開啟時滑桿停用", () => {
        renderAt(<SettingsTilePage pageKey="hand-score" />);
        expect(container.textContent).toContain("響應式大小");
        expect(sliders()).toHaveLength(1);
        expect(sliders()[0].disabled).toBe(true);
    });

    test("記憶訓練 UI 也有響應式開關", () => {
        renderAt(<SettingsTilePage pageKey="memory" />);
        expect(container.textContent).toContain("響應式大小");
        expect(sliders()[0].disabled).toBe(true);
    });

    test("進張數計算 UI 沒有響應式開關，滑桿可用", () => {
        renderAt(<SettingsTilePage pageKey="shanten" />);
        expect(container.textContent).not.toContain("響應式大小");
        expect(sliders()[0].disabled).toBe(false);
    });

    test("拖動滑桿會存進 localStorage", () => {
        renderAt(<SettingsEfficiency />);
        const slider = sliders()[0];
        act(() => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(slider, "50");
            slider.dispatchEvent(new Event("input", { bubbles: true }));
        });
        const saved = JSON.parse(localStorage.getItem("app-settings"));
        expect(saved.handTileSize).toBe(50);
    });

    // 回歸測試：返回鈕以前用 position:absolute 定位在窄容器上，會壓到標題
    test("返回鈕不與標題重疊（用三欄版面，不是絕對定位）", () => {
        renderAt(<SettingsUI />);

        const back = [...container.querySelectorAll("a")].find((a) => a.textContent.includes("返回"));
        expect(back).toBeTruthy();
        expect(back.style.position).not.toBe("absolute");

        // 返回鈕與標題必須是同一層的兄弟節點，各佔一欄
        const row = back.parentElement.parentElement;
        expect(row.style.display).toBe("flex");
        const children = [...row.children];
        expect(children).toHaveLength(3); // 左欄（返回）、中間標題、右欄（留白）
        expect(children[0].contains(back)).toBe(true);
        expect(children[1].textContent).toContain("UI 大小");
        expect(children[1].style.flex).toBe("1");
        expect(children[1].style.textAlign).toBe("center");
    });
});
