// 挑戰模式的計分與排行榜排序（純函式，方便測試）
export const TOP_N = 5;

// 準確率以百分比表示，四捨五入到小數第一位
export const accuracyOf = (matched, total) => {
    if (!total) return 0;
    return Math.round((matched / total) * 1000) / 10;
};

// 準確率高的在前；同分時總用時短的在前
export const topByAccuracy = (entries, limit = TOP_N) =>
    [...entries].sort((a, b) => b.accuracy - a.accuracy || a.timeMs - b.timeMs).slice(0, limit);

// 總用時短的在前；同時長時準確率高的在前
export const topByTime = (entries, limit = TOP_N) =>
    [...entries].sort((a, b) => a.timeMs - b.timeMs || b.accuracy - a.accuracy).slice(0, limit);
