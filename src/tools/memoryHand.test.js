import { TILE_TYPES, compareHands, drawRandomHand, shuffleTiles, sortTiles, tileIndex } from "./memoryHand";

describe("記憶訓練工具", () => {
    test("牌種共 34 種", () => {
        expect(TILE_TYPES).toHaveLength(34);
        expect(new Set(TILE_TYPES).size).toBe(34);
    });

    test("抽牌數量正確，且同一種不超過 4 張", () => {
        [7, 13, 14, 136].forEach((count) => {
            const hand = drawRandomHand(count);
            expect(hand).toHaveLength(count);
            const counts = {};
            hand.forEach((tile) => {
                counts[tile] = (counts[tile] || 0) + 1;
            });
            Object.values(counts).forEach((n) => expect(n).toBeLessThanOrEqual(4));
            hand.forEach((tile) => {
                expect(tileIndex(tile)).toBeGreaterThanOrEqual(0);
                expect(tileIndex(tile)).toBeLessThan(34);
            });
        });
    });

    test("手牌依 m、p、s、z 排序", () => {
        expect(sortTiles(["1z", "3p", "2m", "1s"])).toEqual(["2m", "3p", "1s", "1z"]);
    });

    test("亂序只改順序，內容與張數不變", () => {
        const hand = sortTiles(["1m", "1m", "2p", "3s", "4z"]);
        const shuffled = shuffleTiles(hand);
        expect(shuffled).toHaveLength(hand.length);
        expect(sortTiles(shuffled)).toEqual(hand);
    });

    test("完全正確時 perfect，且不看點選順序", () => {
        const target = sortTiles(["1m", "2m", "3p"]);
        const result = compareHands(target, ["3p", "1m", "2m"]);
        expect(result.perfect).toBe(true);
        expect(result.matched).toBe(3);
        expect(result.missing).toEqual([]);
        expect(result.extra).toEqual([]);
    });

    test("重複牌要一對一抵銷", () => {
        const result = compareHands(["1m", "1m", "2m"], ["1m", "2m", "2m"]);
        expect(result.perfect).toBe(false);
        expect(result.matched).toBe(2);
        expect(result.targetStatus).toEqual([true, false, true]);
        expect(result.guessStatus).toEqual([true, true, false]);
        expect(result.missing).toEqual(["1m"]);
        expect(result.extra).toEqual(["2m"]);
    });

    test("不開赤寶時牌山不會出現 0m / 0p / 0s", () => {
        const hand = drawRandomHand(136);
        expect(hand).toHaveLength(136);
        expect(hand.some((tile) => tile[0] === "0")).toBe(false);
    });

    test("開赤寶時每花色各一張赤寶，5 的總數仍是 4 張", () => {
        const hand = drawRandomHand(136, Math.random, true);
        expect(hand).toHaveLength(136);
        ["m", "p", "s"].forEach((suit) => {
            expect(hand.filter((tile) => tile === `0${suit}`)).toHaveLength(1);
            expect(hand.filter((tile) => tile === `5${suit}`)).toHaveLength(3);
        });
        expect(hand.filter((tile) => tile[0] === "0")).toHaveLength(3);
    });

    test("赤寶與普通 5 視為不同牌", () => {
        const result = compareHands(["0m", "5m"], ["5m", "5m"]);
        expect(result.matched).toBe(1);
        expect(result.perfect).toBe(false);
        expect(result.missing).toEqual(["0m"]);
        expect(result.extra).toEqual(["5m"]);
    });

    test("赤寶排在該花色 5 的後面", () => {
        expect(sortTiles(["6m", "0m", "5m"])).toEqual(["5m", "0m", "6m"]);
        expect(sortTiles(["0p", "5p", "4p"])).toEqual(["4p", "5p", "0p"]);
    });
});
