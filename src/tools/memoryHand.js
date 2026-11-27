// 記憶訓練用的純函式：抽牌、排序、比對
// 與畫面無關，方便單獨測試。

// 34 種牌（不含赤寶牌）
export const TILE_TYPES = (() => {
    const list = [];
    ["m", "p", "s"].forEach((suit) => {
        for (let n = 1; n <= 9; n++) list.push(`${n}${suit}`);
    });
    for (let n = 1; n <= 7; n++) list.push(`${n}z`);
    return list;
})();

// 赤寶牌（紅五）：開啟後牌山每個花色各有一張
export const RED_FIVES = ["0m", "0p", "0s"];

// "3p" → 11（0 起算的 34 格索引）；赤寶獨立成 34~36，才不會和普通 5 混在一起
export const tileIndex = (tile) => {
    const suit = tile.slice(-1);
    if (tile[0] === "0") {
        if (suit === "m") return 34;
        if (suit === "p") return 35;
        return 36;
    }
    const num = parseInt(tile, 10);
    if (suit === "m") return num - 1;
    if (suit === "p") return 9 + num - 1;
    if (suit === "s") return 18 + num - 1;
    return 27 + num - 1;
};

export const indexToTile = (index) => {
    if (index < 9) return `${index + 1}m`;
    if (index < 18) return `${index - 9 + 1}p`;
    if (index < 27) return `${index - 18 + 1}s`;
    return `${index - 27 + 1}z`;
};

// 赤寶排在該花色 5 的後面
const RED_SORT_BASE = { "0m": 4, "0p": 13, "0s": 22 };
const sortKey = (tile) => (tile[0] === "0" ? RED_SORT_BASE[tile] * 10 + 5 : tileIndex(tile) * 10);

export const sortTiles = (tiles) => [...tiles].sort((a, b) => sortKey(a) - sortKey(b));

// 只打亂顯示順序，內容不變（作答仍然不看順序）
export const shuffleTiles = (tiles, random = Math.random) => {
    const copy = [...tiles];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

// 從 136 張牌山隨機抽 count 張（每種最多 4 張）；redFives 開啟時每花色各一張赤寶
export const drawRandomHand = (count, random = Math.random, redFives = false) => {
    const wall = [];
    for (let i = 0; i < 34; i++) {
        for (let copy = 0; copy < 4; copy++) wall.push(indexToTile(i));
    }
    if (redFives) {
        RED_FIVES.forEach((red) => {
            const at = wall.indexOf(`5${red.slice(-1)}`);
            if (at >= 0) wall[at] = red;
        });
    }
    for (let i = wall.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [wall[i], wall[j]] = [wall[j], wall[i]];
    }
    return sortTiles(wall.slice(0, Math.min(count, wall.length)));
};

const countByIndex = (tiles) => {
    const counts = new Array(37).fill(0);
    tiles.forEach((tile) => {
        counts[tileIndex(tile)] += 1;
    });
    return counts;
};

// 以「不計順序」比對：
// targetStatus / guessStatus 逐張標記是否對上，
// missing 是答案裡沒被點到的牌，extra 是多點的牌。
export const compareHands = (target, guess) => {
    const targetCount = countByIndex(target);
    const guessCount = countByIndex(guess);

    let matched = 0;
    for (let i = 0; i < 37; i++) matched += Math.min(targetCount[i], guessCount[i]);

    const targetLeft = [...guessCount];
    const targetStatus = target.map((tile) => {
        const i = tileIndex(tile);
        if (targetLeft[i] > 0) {
            targetLeft[i] -= 1;
            return true;
        }
        return false;
    });

    const guessLeft = [...targetCount];
    const guessStatus = guess.map((tile) => {
        const i = tileIndex(tile);
        if (guessLeft[i] > 0) {
            guessLeft[i] -= 1;
            return true;
        }
        return false;
    });

    return {
        matched,
        total: target.length,
        perfect: matched === target.length && guess.length === target.length,
        targetStatus,
        guessStatus,
        missing: target.filter((_, i) => !targetStatus[i]),
        extra: guess.filter((_, i) => !guessStatus[i]),
    };
};
