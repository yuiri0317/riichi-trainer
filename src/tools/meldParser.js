// 副露解析
//
// 規則：每組「數字+花色」是一個副露單位，數字按「書寫順序」每 3 張切一刀。
//   123m        → 一個順子
//   123123123m  → 三個順子（123 / 123 / 123）
//   111222333m  → 三個刻子（111 / 222 / 333）
//   1111m       → 明槓
//   1111m-      → 暗槓（尾端加減號；也接受舊寫法 [1111m]）
// 關鍵：絕不重排數字，否則 123123123 會被誤判成 111222333。

// 牌名 → 34 索引（"1m" → 0）
export const tileToIndex = (tile) => {
    if (!tile) return undefined;
    const n = tile.replace(/\D/g, "");
    const type = tile.slice(-1);
    if (type === "m") return n === "0" ? 4 : parseInt(n, 10) - 1;
    if (type === "p") return 9 + (n === "0" ? 4 : parseInt(n, 10) - 1);
    if (type === "s") return 18 + (n === "0" ? 4 : parseInt(n, 10) - 1);
    if (type === "z") return 27 + (parseInt(n, 10) - 1);
    return undefined;
};

// 34 索引 → 牌名（0 → "1m"）
export const indexToTile = (i) => {
    if (i < 9) return i + 1 + "m";
    if (i < 18) return i - 8 + "p";
    if (i < 27) return i - 17 + "s";
    return i - 26 + "z";
};

export const MELD_LABEL = { chi: "吃", pon: "碰", minkan: "明槓", ankan: "暗槓" };

export const parseMelds = (input) => {
    const melds = [];
    const errors = [];
    // 支援三種寫法：1111m-（暗槓）、[1111m]（舊寫法）、123m
    const groups = (input || "").match(/\[[^\]]*\]|\d+[mpsz]-?/g) || [];

    groups.forEach((group) => {
        const isAnkan = group.startsWith("[") || group.endsWith("-");
        const inner = group.replace(/[\[\]\-]/g, "").trim();
        const matched = inner.match(/(\d+)([mpsz])/);
        if (!matched) {
            errors.push(`看不懂「${group}」`);
            return;
        }
        const [, digits, type] = matched;
        const toIdx = (ch) => tileToIndex(ch + type);

        // 四張 → 槓
        if (digits.length === 4) {
            if (!digits.split("").every((c) => c === digits[0])) {
                errors.push(`「${group}」不是四張相同，無法當槓`);
                return;
            }
            melds.push({ type: isAnkan ? "ankan" : "minkan", tile: toIdx(digits[0]) });
            return;
        }

        if (isAnkan) {
            errors.push(`「${group}」加減號表示暗槓，但暗槓必須是四張相同`);
            return;
        }

        if (digits.length % 3 !== 0) {
            errors.push(`「${group}」的張數必須是 3 或 4 的倍數`);
            return;
        }

        // 按書寫順序切，每 3 張一組
        for (let i = 0; i < digits.length; i += 3) {
            const chunk = digits.slice(i, i + 3);
            const a = toIdx(chunk[0]);
            const b = toIdx(chunk[1]);
            const c = toIdx(chunk[2]);
            if (a === undefined || b === undefined || c === undefined) {
                errors.push(`「${chunk}${type}」有無效的牌`);
                return;
            }
            if (a === b && b === c) {
                melds.push({ type: "pon", tile: a });
            } else if (type !== "z" && b === a + 1 && c === a + 2) {
                melds.push({ type: "chi", tile: a });
            } else {
                errors.push(`「${chunk}${type}」既不是刻子也不是順子`);
            }
        }
    });

    if (melds.length > 4) errors.push("副露最多 4 組");
    return { melds, errors };
};

// 副露包含哪些牌名（吃 → 3 張連續；碰 → 3 張相同；槓 → 4 張）
export const meldTileNames = (meld) => {
    if (meld.type === "chi") return [meld.tile, meld.tile + 1, meld.tile + 2].map(indexToTile);
    if (meld.type === "pon") return [meld.tile, meld.tile, meld.tile].map(indexToTile);
    return [meld.tile, meld.tile, meld.tile, meld.tile].map(indexToTile);
};

// 副露 → 文字碼（給「刪除某一組」時重建字串用）
export const meldToCode = (meld) => {
    const suitChar = meld.tile < 9 ? "m" : meld.tile < 18 ? "p" : meld.tile < 27 ? "s" : "z";
    const base = (meld.tile % 9) + 1;

    if (meld.type === "chi") return `${base}${base + 1}${base + 2}${suitChar}`;
    if (meld.type === "pon") return `${base}${base}${base}${suitChar}`;
    return `${base}${base}${base}${base}${suitChar}${meld.type === "ankan" ? "-" : ""}`;
};

// 由「點選的牌」組出一組副露的文字碼（給點選式副露用）
// 回傳 { code } 或 { error }
export const buildMeldCode = (kind, tiles) => {
    if (!tiles.length) return { error: "沒有選牌" };
    const suitChar = tiles[0].slice(-1);

    if (kind === "chi") {
        if (tiles.length !== 3) return { error: "吃需要三張牌" };
        if (suitChar === "z") return { error: "字牌不能吃" };
        if (!tiles.every((t) => t.slice(-1) === suitChar)) return { error: "吃必須同花色" };
        const nums = tiles.map((t) => parseInt(t, 10)).sort((a, b) => a - b);
        if (nums[1] !== nums[0] + 1 || nums[2] !== nums[0] + 2) return { error: "吃必須是連續三張" };
        return { code: nums.join("") + suitChar };
    }

    if (kind === "pon") {
        if (tiles.length !== 3) return { error: "碰需要三張牌" };
        if (!tiles.every((t) => t === tiles[0])) return { error: "碰必須三張相同" };
        return { code: tiles[0][0].repeat(3) + suitChar };
    }

    if (kind === "minkan" || kind === "ankan") {
        if (tiles.length !== 4) return { error: "槓需要四張牌" };
        if (!tiles.every((t) => t === tiles[0])) return { error: "槓必須四張相同" };
        return { code: tiles[0][0].repeat(4) + suitChar + (kind === "ankan" ? "-" : "") };
    }

    return { error: "未知的副露類型" };
};
