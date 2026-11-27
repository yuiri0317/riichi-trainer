import { accuracyOf, topByAccuracy, topByTime } from "./memoryChallenge";

const entry = (accuracy, timeMs) => ({ accuracy, timeMs });

describe("memoryChallenge", () => {
    test("準確率四捨五入到小數第一位", () => {
        expect(accuracyOf(6, 13)).toBe(46.2);
        expect(accuracyOf(13, 13)).toBe(100);
        expect(accuracyOf(0, 0)).toBe(0);
    });

    test("準確率榜：準確率高的在前，同分時用時短的在前", () => {
        const rows = topByAccuracy([entry(80, 5000), entry(100, 9000), entry(80, 3000), entry(100, 7000)]);
        expect(rows).toEqual([entry(100, 7000), entry(100, 9000), entry(80, 3000), entry(80, 5000)]);
    });

    test("速度榜：用時短的在前，同時長時準確率高的在前", () => {
        const rows = topByTime([entry(80, 5000), entry(100, 9000), entry(90, 5000), entry(100, 8000)]);
        expect(rows).toEqual([entry(90, 5000), entry(80, 5000), entry(100, 8000), entry(100, 9000)]);
    });

    test("每個榜最多保留五筆", () => {
        const many = Array.from({ length: 8 }, (_, i) => entry(50 + i, 10000 - i * 100));
        expect(topByAccuracy(many)).toHaveLength(5);
        expect(topByTime(many)).toHaveLength(5);
    });
});
