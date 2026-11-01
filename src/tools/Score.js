// 手牌算點引擎（支援副露）
//
// 輸入：
//   tiles34  門前部分的牌（34 格計數），張數 = 14 - 3 × melds.length
//   melds    副露陣列 [{ type: 'chi'|'pon'|'minkan'|'ankan', tile: 起始索引 }]
//   winTile  和了牌（必須在門前部分）
//
// 已支援：
//   立直、一發、門前清自摸和、平和、斷么九、一盃口、二盃口、三色同順、一氣通貫、
//   混全帶么九、純全帶么九、混一色、清一色、對對和、三暗刻、三色同刻、小三元、
//   混老頭、七對子、役牌（白發中／場風／自風）
//   役滿：國士無雙、四暗刻、大三元、字一色、清老頭、綠一色、九蓮寶燈、小四喜、大四喜
//
// 尚未支援：寶牌指示牌自動換算（由上層計算張數傳入）、天和／地和、流局滿貫。

const HONOR = (i) => i >= 27;
const TERMINALS = new Set([0, 8, 9, 17, 18, 26]);
const isYaochu = (i) => HONOR(i) || TERMINALS.has(i);
const num = (i) => i % 9;
const suit = (i) => (i < 9 ? 0 : i < 18 ? 1 : i < 27 ? 2 : 3);

const DRAGONS = [31, 32, 33]; // 白發中
const WIND_TILES = [27, 28, 29, 30]; // 東南西北
const WIND_NAMES = ["東", "南", "西", "北"];

// ---------- 分解：把門前部分拆成 (4 - 副露數) 個面子 + 1 個雀頭 ----------
const extractMelds = (counts, start, current, target, out) => {
    let i = start;
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) {
        if (current.length === target) out.push(current.map((m) => ({ ...m })));
        return;
    }
    if (current.length >= target) return;

    if (counts[i] >= 3) {
        counts[i] -= 3;
        current.push({ type: "trip", tile: i, open: false });
        extractMelds(counts, i, current, target, out);
        current.pop();
        counts[i] += 3;
    }
    if (i < 27 && num(i) <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
        counts[i] -= 1;
        counts[i + 1] -= 1;
        counts[i + 2] -= 1;
        current.push({ type: "run", tile: i, open: false });
        extractMelds(counts, i, current, target, out);
        current.pop();
        counts[i] += 1;
        counts[i + 1] += 1;
        counts[i + 2] += 1;
    }
};

const decompose = (counts, target) => {
    const results = [];
    const work = counts.slice();
    for (let p = 0; p < 34; p++) {
        if (work[p] >= 2) {
            work[p] -= 2;
            const out = [];
            extractMelds(work, 0, [], target, out);
            // out 是「所有拆法」的列表，每個元素才是面子陣列
            out.forEach((meldList) => results.push({ pair: p, melds: meldList }));
            work[p] += 2;
        }
    }
    return results;
};

const meldTiles = (m) => {
    if (m.type === "run") return [m.tile, m.tile + 1, m.tile + 2];
    if (m.type === "kan") return [m.tile, m.tile, m.tile, m.tile];
    return [m.tile, m.tile, m.tile];
};

// 和了牌落在這個面子時的聽牌型
const waitTypeOf = (meld, winTile) => {
    if (meld === null) return "tanki";
    if (meld.type !== "run") return "shanpon";
    const start = meld.tile;
    const pos = winTile - start;
    if (pos === 1) return "kanchan";
    if (pos === 0 && num(start) === 6) return "penchan";
    if (pos === 2 && num(start) === 0) return "penchan";
    return "ryanmen";
};

// ---------- 單一分解的役判定 ----------
const scoreDecomposition = (decomp, opts) => {
    const { winTile, tsumo, seatWind, roundWind, riichi, doubleRiichi, ippatsu, haitei, houtei, rinshan, chankan, tenhou, chiihou } = opts;

    // 門前拆出來的面子 + 副露，合成一份
    const melds = [...decomp.melds.map((m) => ({ ...m, open: false })), ...(opts.melds || [])];
    const pair = decomp.pair;
    const menzen = melds.every((m) => !m.open);

    const winMeld = decomp.melds.find((m) => meldTiles(m).includes(winTile)) || null;
    const wait = waitTypeOf(winMeld, winTile);

    const seatIdx = WIND_NAMES.indexOf(seatWind);
    const roundIdx = WIND_NAMES.indexOf(roundWind);

    // 整手牌的牌（門前 + 副露）
    const allTiles = [];
    for (let i = 0; i < 34; i++) {
        for (let k = 0; k < opts.tiles34[i]; k++) allTiles.push(i);
    }
    melds.forEach((m) => allTiles.push(...meldTiles(m)));

    const yaku = [];
    const push = (name, han) => yaku.push({ name, han });

    const runs = melds.filter((m) => m.type === "run");
    const trips = melds.filter((m) => m.type === "trip");
    const kans = melds.filter((m) => m.type === "kan");
    const blocks = melds.filter((m) => m.type !== "run"); // 刻子 + 槓子
    const blockTiles = blocks.map((m) => m.tile);

    // ---- 役滿 ----
    const isAllHonors = allTiles.every((t) => HONOR(t));
    const isAllTerminals = allTiles.every((t) => TERMINALS.has(t));
    const isAllYaochu = allTiles.every((t) => isYaochu(t));

    const dragonTrips = blockTiles.filter((t) => DRAGONS.includes(t)).length;
    const windTrips = blockTiles.filter((t) => WIND_TILES.includes(t)).length;

    const GREEN = new Set([19, 20, 21, 23, 25, 32]);
    const isGreen = allTiles.every((t) => GREEN.has(t));

    // 役滿要保留各自的役名，不能統一叫「役滿」
    const yakumanYaku = [];
    const addYakuman = (name, han = 13) => yakumanYaku.push({ name, han });

    if (isAllHonors) addYakuman("字一色");
    if (isAllTerminals && !isAllHonors) addYakuman("清老頭");
    if (isGreen) addYakuman("綠一色");
    if (dragonTrips === 3) addYakuman("大三元");
    if (windTrips === 4) addYakuman("大四喜", 26);
    else if (windTrips === 3 && WIND_TILES.includes(pair)) addYakuman("小四喜");
    if (menzen && tenhou) addYakuman("天和");
    if (menzen && chiihou) addYakuman("地和");

    // 四暗刻：只算門前的刻子/槓子；榮和落在刻子上時該刻子算明刻
    const ronOnTrip = !tsumo && winMeld && winMeld.type === "trip";
    const concealedBlocks = blocks.filter((m) => !m.open && !(ronOnTrip && m === winMeld)).length;
    if (concealedBlocks === 4) {
        // 單騎聽（和了牌是雀頭）是雙倍役滿
        if (wait === "tanki") addYakuman("四暗刻單騎", 26);
        else addYakuman("四暗刻");
    }

    // 四槓子
    if (kans.length === 4) addYakuman("四槓子");

    // 國士／九蓮只可能完全門前，由 scoreHand 另外處理

    if (yakumanYaku.length > 0) {
        const yakumanHan = yakumanYaku.reduce((s, y) => s + y.han, 0);
        return { yaku: yakumanYaku, han: yakumanHan, fu: 0, wait, isYakuman: true, menzen };
    }

    // ---- 一般役 ----
    if (doubleRiichi && menzen) push("雙立直", 2);
    else if (riichi && menzen) push("立直", 1);
    if ((riichi || doubleRiichi) && menzen && ippatsu) push("一發", 1);
    if (tsumo && menzen) push("門前清自摸和", 1);
    if (haitei) push("海底摸月", 1);
    if (houtei) push("河底撈魚", 1);
    if (rinshan) push("嶺上開花", 1);
    if (chankan) push("搶槓", 1);

    // 平和（必須門前、四面子的順子、非役牌雀頭、兩面聽）
    const pairIsValue = DRAGONS.includes(pair) || (seatIdx >= 0 && WIND_TILES[seatIdx] === pair) || (roundIdx >= 0 && WIND_TILES[roundIdx] === pair);
    const isPinfu = menzen && runs.length === 4 && !pairIsValue && wait === "ryanmen";
    if (isPinfu) push("平和", 1);

    // 斷么九
    if (!allTiles.some((t) => isYaochu(t))) push("斷么九", 1);

    // 一盃口 / 二盃口（門前限定）
    if (menzen) {
        const runKeys = runs.map((m) => suit(m.tile) + "-" + num(m.tile));
        const keyCount = {};
        runKeys.forEach((k) => (keyCount[k] = (keyCount[k] || 0) + 1));
        const dupRuns = Object.values(keyCount).filter((c) => c >= 2).length;
        if (dupRuns === 2) push("二盃口", 3);
        else if (dupRuns === 1) push("一盃口", 1);
    }

    // 三色同順 / 一氣通貫（副露 -1 飜）
    const runByNum = {};
    runs.forEach((m) => {
        runByNum[num(m.tile)] = runByNum[num(m.tile)] || new Set();
        runByNum[num(m.tile)].add(suit(m.tile));
    });
    if (Object.values(runByNum).some((s) => s.size === 3)) push("三色同順", menzen ? 2 : 1);

    const suitRuns = [0, 1, 2].some((s) => [0, 3, 6].every((n) => runs.some((m) => suit(m.tile) === s && num(m.tile) === n)));
    if (suitRuns) push("一氣通貫", menzen ? 2 : 1);

    // 三色同刻（刻子或槓子）
    const blockByNum = {};
    blocks.forEach((m) => {
        blockByNum[num(m.tile)] = blockByNum[num(m.tile)] || new Set();
        blockByNum[num(m.tile)].add(suit(m.tile));
    });
    if (Object.values(blockByNum).some((s) => s.size === 3)) push("三色同刻", 2);

    // 對對和
    if (runs.length === 0) push("對對和", 2);

    // 三槓子（四槓子是役滿，上面已處理）
    if (kans.length === 3) push("三槓子", 2);

    // 三暗刻
    if (concealedBlocks >= 3) push("三暗刻", 2);

    // 小三元
    if (dragonTrips === 2 && DRAGONS.includes(pair)) push("小三元", 2);

    // 混老頭
    if (isAllYaochu && !isAllHonors && !isAllTerminals) push("混老頭", 2);

    // 混全帶 / 純全帶（副露 -1 飜）
    const everyBlockHasYaochu = melds.every((m) => meldTiles(m).some((t) => isYaochu(t))) && isYaochu(pair);
    if (everyBlockHasYaochu) {
        const hasHonor = allTiles.some((t) => HONOR(t));
        if (hasHonor) push("混全帶么九", menzen ? 2 : 1);
        else push("純全帶么九", menzen ? 3 : 2);
    }

    // 混一色 / 清一色（副露 -1 飜）
    const suitsInHand = new Set(allTiles.filter((t) => !HONOR(t)).map(suit));
    const hasHonors2 = allTiles.some((t) => HONOR(t));
    if (suitsInHand.size === 1) {
        if (hasHonors2) push("混一色", menzen ? 3 : 2);
        else push("清一色", menzen ? 6 : 5);
    }

    // 役牌
    blockTiles.forEach((t) => {
        if (DRAGONS.includes(t)) push("役牌 " + ["白", "發", "中"][t - 31], 1);
        else if (WIND_TILES.includes(t)) {
            let name = "";
            if (t === WIND_TILES[roundIdx]) name += "場風" + WIND_NAMES[t - 27];
            if (t === WIND_TILES[seatIdx]) name += (name ? " " : "") + "自風" + WIND_NAMES[t - 27];
            if (name) push("役牌 " + name, 1);
        }
    });

    // ---- 符 ----
    let fu = 20;
    const fuDetail = ["底符 20 符"];

    if (isPinfu && tsumo) {
        fu = 20;
        fuDetail.length = 0;
        fuDetail.push("平和自摸：固定 20 符（不計自摸的 2 符）");
    } else {
        let pairFu = 0;
        if (DRAGONS.includes(pair)) pairFu += 2;
        if (pair === WIND_TILES[roundIdx]) pairFu += 2;
        if (pair === WIND_TILES[seatIdx]) pairFu += 2;
        if (pairFu) {
            fu += pairFu;
            fuDetail.push("雀頭 " + pairFu + " 符");
        }

        trips.forEach((m) => {
            const yao = isYaochu(m.tile);
            const isOpen = m.open || (ronOnTrip && m === winMeld);
            const add = yao ? (isOpen ? 4 : 8) : isOpen ? 2 : 4;
            fu += add;
            fuDetail.push((yao ? "么九" : "中張") + (isOpen ? "明刻" : "暗刻") + " " + add + " 符");
        });

        kans.forEach((m) => {
            const yao = isYaochu(m.tile);
            const add = m.open ? (yao ? 16 : 8) : yao ? 32 : 16;
            fu += add;
            fuDetail.push((yao ? "么九" : "中張") + (m.open ? "明槓" : "暗槓") + " " + add + " 符");
        });

        if (wait === "tanki" || wait === "kanchan" || wait === "penchan") {
            fu += 2;
            fuDetail.push("聽牌 " + { tanki: "單騎", kanchan: "嵌張", penchan: "邊張" }[wait] + " 2 符");
        }

        if (tsumo) {
            fu += 2;
            fuDetail.push("自摸 2 符");
        } else if (menzen) {
            fu += 10;
            fuDetail.push("門清榮和 10 符");
        }

        const raw = fu;
        fu = Math.ceil(fu / 10) * 10;
        fuDetail.push(`小計 ${raw} 符 → 進位為 ${fu} 符`);
    }

    const han = yaku.reduce((s, y) => s + y.han, 0);
    return { yaku, han, fu, wait, fuDetail, isYakuman: false, menzen };
};

// 國士無雙（必須完全門前）
const isKokushi = (tiles34) => {
    let pairs = 0;
    let kinds = 0;
    let nonYaochu = 0;
    for (let i = 0; i < 34; i++) {
        if (isYaochu(i)) {
            if (tiles34[i] > 0) kinds++;
            if (tiles34[i] >= 2) pairs++;
        } else {
            nonYaochu += tiles34[i];
        }
    }
    return nonYaochu === 0 && kinds === 13 && pairs >= 1;
};

// 九蓮寶燈：同一花色 1112345678999 + 任一張（必須完全門前）
const isChuuren = (tiles34) => {
    const NEED = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    for (let s = 0; s < 3; s++) {
        let ok = true;
        let extra = 0;
        for (let i = 0; i < 9; i++) {
            const c = tiles34[s * 9 + i];
            if (c < NEED[i]) {
                ok = false;
                break;
            }
            extra += c - NEED[i];
        }
        if (ok && extra === 1) return true;
    }
    return false;
};

// 七對子（必須完全門前）
const scoreChiitoitsu = (tiles34, opts) => {
    let pairs = 0;
    let kinds = 0;
    for (let i = 0; i < 34; i++) {
        if (tiles34[i] >= 2) pairs++;
        if (tiles34[i] > 0) kinds++;
    }
    if (pairs !== 7 || kinds !== 7) return null;

    const all = [];
    for (let i = 0; i < 34; i++) for (let k = 0; k < tiles34[i]; k++) all.push(i);

    if (all.every((t) => HONOR(t))) {
        return { yaku: [{ name: "字一色", han: 13 }], han: 13, fu: 0, fuDetail: ["役滿"], isYakuman: true, menzen: true };
    }

    const yaku = [{ name: "七對子", han: 2 }];
    if (opts.riichi) yaku.push({ name: "立直", han: 1 });
    if (opts.riichi && opts.ippatsu) yaku.push({ name: "一發", han: 1 });
    if (opts.tsumo) yaku.push({ name: "門前清自摸和", han: 1 });
    if (!all.some((t) => isYaochu(t))) yaku.push({ name: "斷么九", han: 1 });
    if (all.every((t) => isYaochu(t))) yaku.push({ name: "混老頭", han: 2 });

    const suitsInHand = new Set(all.filter((t) => !HONOR(t)).map(suit));
    const hasHonor = all.some((t) => HONOR(t));
    if (suitsInHand.size === 1) yaku.push({ name: hasHonor ? "混一色" : "清一色", han: hasHonor ? 3 : 6 });

    const han = yaku.reduce((s, y) => s + y.han, 0);
    return { yaku, han, fu: 25, wait: "tanki", fuDetail: ["七對子固定 25 符"], isYakuman: false, menzen: true };
};

// ---------- 點數 ----------
const pointsTable = (han, fu, isDealer, isTsumo) => {
    let base;
    if (han >= 13) base = 8000 * Math.max(1, Math.floor(han / 13));
    else if (han >= 11) base = 6000;
    else if (han >= 8) base = 4000;
    else if (han >= 6) base = 3000;
    else if (han >= 5) base = 2000;
    else base = Math.min(fu * Math.pow(2, han + 2), 2000);

    const round100 = (x) => Math.ceil(x / 100) * 100;

    if (isDealer) {
        if (isTsumo) {
            const each = round100(base * 2);
            return { type: "tsumo", each, total: each * 3 };
        }
        return { type: "ron", ron: round100(base * 6) };
    }
    if (isTsumo) {
        const dealerPay = round100(base * 2);
        const childPay = round100(base);
        return { type: "tsumo", dealerPay, childPay, total: dealerPay + childPay * 2 };
    }
    return { type: "ron", ron: round100(base * 4) };
};

// ---------- 入口 ----------
export const scoreHand = (opts) => {
    const { tiles34, winTile } = opts;
    // 副露型別正規化：chi/pon/minkan/ankan → run/trip/kan（帶 open 旗標）
    const melds = (opts.melds || []).map((m) => {
        if (m.type === "chi") return { type: "run", tile: m.tile, open: true };
        if (m.type === "pon") return { type: "trip", tile: m.tile, open: true };
        if (m.type === "minkan") return { type: "kan", tile: m.tile, open: true };
        if (m.type === "ankan") return { type: "kan", tile: m.tile, open: false };
        return m;
    });

    if (melds.length > 4) return { ok: false, error: "副露最多 4 組" };

    const expected = 14 - 3 * melds.length;
    const total = tiles34.reduce((a, b) => a + b, 0);
    if (total !== expected) {
        return {
            ok: false,
            error: `門前部分應該 ${expected} 張（副露 ${melds.length} 組），目前 ${total} 張`,
        };
    }
    if (winTile == null || tiles34[winTile] === 0) return { ok: false, error: "請指定和了牌（必須在門前部分）" };

    const noMelds = melds.length === 0;

    // 完全門前才可能：國士／九蓮／七對子
    if (noMelds && isKokushi(tiles34)) {
        return {
            ok: true,
            yaku: [{ name: "國士無雙", han: 13 }],
            han: 13,
            fu: 0,
            fuDetail: ["役滿"],
            dora: 0,
            points: pointsTable(13, 0, opts.dealer, opts.tsumo),
            isYakuman: true,
            menzen: true,
        };
    }
    if (noMelds && isChuuren(tiles34)) {
        return {
            ok: true,
            yaku: [{ name: "九蓮寶燈", han: 13 }],
            han: 13,
            fu: 0,
            fuDetail: ["役滿"],
            dora: 0,
            points: pointsTable(13, 0, opts.dealer, opts.tsumo),
            isYakuman: true,
            menzen: true,
        };
    }
    if (noMelds) {
        const chiitoi = scoreChiitoitsu(tiles34, opts);
        if (chiitoi) {
            if (chiitoi.isYakuman) {
                return { ok: true, ...chiitoi, dora: 0, points: pointsTable(13, 0, opts.dealer, opts.tsumo) };
            }
            const han = chiitoi.han + (opts.dora || 0);
            return { ok: true, ...chiitoi, han, dora: opts.dora || 0, points: pointsTable(han, 25, opts.dealer, opts.tsumo) };
        }
    }

    // 一般型（含副露）
    const target = 4 - melds.length;
    const decomps = decompose(tiles34.slice(), target);
    if (!decomps.length) {
        return { ok: false, error: `門前部分無法拆成 ${target} 組面子 + 1 個雀頭` };
    }

    let best = null;
    for (const d of decomps) {
        const r = scoreDecomposition(d, { ...opts, melds });
        const han = r.han + (r.isYakuman ? 0 : opts.dora || 0);
        const points = pointsTable(han, r.fu, opts.dealer, opts.tsumo);
        const value = points.type === "ron" ? points.ron : points.total;

        if (!best || value > best.value || (value === best.value && (han > best.han || (han === best.han && r.fu > best.fu)))) {
            best = { ...r, han, points, value, dora: r.isYakuman ? 0 : opts.dora || 0 };
        }
    }

    if (!best.yaku.length) {
        return { ok: false, error: "有牌型但沒有役（至少需要一個役才能和牌，寶牌不算役）" };
    }

    return { ok: true, ...best };
};

export const helpers = { isYaochu, meldTiles, num, suit };
