import { act } from "react";
import { createRoot } from "react-dom/client";
import MemoryTrainer from "./MemoryTrainer";

// 用元件測試模擬完整流程：挑戰 3 題全對 → 計分 → 排行榜依張數分開
describe("MemoryTrainer 挑戰模式", () => {
    let container;
    let root;

    beforeAll(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    });

    beforeEach(() => {
        jest.useFakeTimers();
        localStorage.clear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<MemoryTrainer />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        jest.useRealTimers();
    });

    const selects = () => [...container.querySelectorAll("select")];
    const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
    const changeSelect = (select, value) => {
        act(() => {
            select.value = value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    };
    const click = (element) => {
        act(() => {
            element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
    };

    // 看牌時記下答案，按「記住了」後照著點回來
    // 挑戰模式記的是「看牌（記憶）」時間，所以先讓看牌讀秒走一段，再按「記住了」
    const playRound = () => {
        const answer = [...container.querySelectorAll("img")].map((img) => img.alt);
        act(() => {
            jest.advanceTimersByTime(600); // 模擬記憶用掉 0.6 秒
        });
        click(button("記住了"));
        act(() => {
            jest.advanceTimersByTime(1500); // 作答時間不計入，走多久都不影響成績
        });
        for (const tile of answer) {
            const picker = [...container.querySelectorAll("img")].find((img) => img.alt === tile && img.style.cursor === "pointer");
            click(picker);
        }
        return answer;
    };

    test("三題全對會記錄總記憶時間與準確率，並只計入該張數的排行榜", () => {
        changeSelect(selects()[0], "challenge");
        changeSelect(selects()[1], "7");
        // 挑戰模式固定不限時：記憶時間下拉選單被鎖住
        expect(selects()[2].disabled).toBe(true);
        expect(selects()[2].value).toBe("0");
        changeSelect(selects()[3], "3");

        click(button("開始挑戰"));
        expect([...container.querySelectorAll("img")].map((img) => img.alt)).toHaveLength(7);

        playRound();
        expect(container.textContent).toContain("全對！");
        expect(container.textContent).toContain("本題記憶用時 0.60 秒");

        for (let round = 2; round <= 3; round++) {
            click(button("下一題"));
            playRound();
        }

        expect(container.textContent).toContain("挑戰完成！");
        expect(container.textContent).toContain("7 張 · 共 3 題");
        expect(container.textContent).toContain("總準確率 100.0%");
        expect(container.textContent).toContain("答對 21 / 21 張");
        expect(container.textContent).toContain("總記憶時間 1.80 秒");
        expect(container.textContent).toContain("7 張 · 準確率最高");
        expect(container.textContent).toContain("7 張 · 最快");

        const saved = JSON.parse(localStorage.getItem("memory-trainer-leaderboard"));
        expect(Object.keys(saved)).toEqual(["7"]);
        expect(saved["7"]).toHaveLength(1);
        expect(saved["7"][0]).toMatchObject({ rounds: 3, accuracy: 100, timeMs: 1800 });

        // 換成 10 張，排行榜要是空的（不同張數分開）
        click(button("回到開始"));
        changeSelect(selects()[1], "10");
        expect(container.textContent).toContain("10 張 · 準確率最高");
        expect(container.textContent).toContain("尚無紀錄");
        expect(container.textContent).not.toContain("100.0%");
    });

    test("亂序是開關按鈕，點了會從關變開", () => {
        const toggle = () => button("亂序：");
        expect(toggle().textContent).toContain("關");
        click(toggle());
        expect(toggle().textContent).toContain("開");
        click(toggle());
        expect(toggle().textContent).toContain("關");
    });

    test("赤寶開關開啟後，點選牌堆會多出三張赤寶", () => {
        const toggle = () => button("赤寶：");
        expect(toggle().textContent).toContain("關");
        click(toggle());
        expect(toggle().textContent).toContain("開");

        click(button("開始記憶"));
        click(button("記住了"));
        const reds = [...container.querySelectorAll("img")].filter((img) => img.alt[0] === "0");
        expect(reds).toHaveLength(3);
    });

    test("挑戰模式看牌不限時，而且作答中不能偷看", () => {
        changeSelect(selects()[0], "challenge");
        changeSelect(selects()[1], "7");
        changeSelect(selects()[3], "3");
        click(button("開始挑戰"));

        // 看牌階段：停很久也不會自己跳進作答（不限時）
        act(() => {
            jest.advanceTimersByTime(30000);
        });
        expect(container.textContent).toContain("記住這副手牌");
        expect(button("記住了")).toBeTruthy();

        click(button("記住了"));
        expect(container.textContent).toContain("憑記憶點出這 7 張牌");

        // 作答階段的偷看按鈕被鎖住
        const peekButton = button("偷看一眼");
        expect(peekButton).toBeTruthy();
        expect(peekButton.disabled).toBe(true);

        click(peekButton);
        expect(container.textContent).not.toContain("再看一眼");
        expect(container.textContent).toContain("憑記憶點出這 7 張牌");
    });
});
