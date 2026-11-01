import { useEffect, useRef, useState } from "react";
import { scoreHand } from "../tools/Score";
import { parseMelds, meldTileNames, MELD_LABEL, buildMeldCode, meldToCode } from "../tools/meldParser";

const ALL_TILES = (() => {
    const list = [];
    ["m", "p", "s"].forEach((s) => {
        for (let n = 1; n <= 9; n++) list.push(`${n}${s}`);
        // 赤寶牌：0m / 0p / 0s，排在該花色 9 之後
        list.push(`0${s}`);
    });
    for (let n = 1; n <= 7; n++) list.push(`${n}z`);
    return list;
})();

const tileToIndex = (tile) => {
    const n = tile.replace(/\D/g, "");
    const type = tile.slice(-1);
    if (type === "m") return n === "0" ? 4 : parseInt(n, 10) - 1;
    if (type === "p") return 9 + (n === "0" ? 4 : parseInt(n, 10) - 1);
    if (type === "s") return 18 + (n === "0" ? 4 : parseInt(n, 10) - 1);
    if (type === "z") return 27 + (parseInt(n, 10) - 1);
    return undefined;
};

// 牌字串 → 34 格計數陣列
const toTiles34 = (tiles) => {
    const arr = new Array(34).fill(0);
    tiles.forEach((tile) => {
        const idx = tileToIndex(tile);
        if (idx !== undefined && idx >= 0 && idx < 34) arr[idx]++;
    });
    return arr;
};

// 牌字串 → 單張陣列（"123m45p" → ["1m","2m","3m","4p","5p"]）
const parseTiles = (input) => {
    const groups = input.match(/(\d+)([mpsz])/g) || [];
    const out = [];
    groups.forEach((g) => {
        const [, nums, type] = g.match(/(\d+)([mpsz])/);
        for (const ch of nums) out.push(ch + type);
    });
    return out;
};

// 單張陣列 → 壓縮字串（["1m","2m","3p"] → "123p1m"... 這裡按 m→p→s→z 分組輸出）
const toTilesStr = (tiles) => {
    const groups = { m: [], p: [], s: [], z: [] };
    tiles.forEach((tile) => {
        const type = tile.slice(-1);
        groups[type].push(tile.replace(/\D/g, ""));
    });
    return ["m", "p", "s", "z"]
        .filter((s) => groups[s].length)
        .map((s) => groups[s].sort((a, b) => (a === "0" ? 5 : a) - (b === "0" ? 5 : b)).join("") + s)
        .join("");
};

// 指示牌 → 寶牌本體
const indicatorToDora = (idx) => {    if (idx < 27) {
        const suit = Math.floor(idx / 9);
        const n = idx % 9;
        return suit * 9 + ((n + 1) % 9);
    }
    if (idx < 31) return 27 + ((idx - 27 + 1) % 4); // 東南西北
    return 31 + ((idx - 31 + 1) % 3); // 白發中
};

const WINDS = ["東", "南", "西", "北"];

// 牌面尺寸：點選面板與手牌共用同一個值，確保兩者一樣大
// 窄螢幕會縮到 24px（14 張仍能擠在一行），寬螢幕放大到 38px
const TILE_SIZE = "clamp(24px, 6.2vw, 38px)";

const HandScoreCalculator = () => {
    const [mode, setMode] = useState("text"); // text | pick
    const [tiles, setTiles] = useState([]);
    const [input, setInput] = useState("");
    const [winIndex, setWinIndex] = useState(null);
    const [meldInput, setMeldInput] = useState(""); // 副露，每組一個「數字+花色」

    // 點選式副露：先選吃/碰/槓，再點牌湊滿
    const [meldKind, setMeldKind] = useState(null); // null | chi | pon | minkan | ankan
    const [pendingMeld, setPendingMeld] = useState([]);
    const [meldError, setMeldError] = useState("");

    const parsedMelds = parseMelds(meldInput);
    const meldCount = parsedMelds.melds.length;
    const expectedConcealed = 14 - 3 * meldCount; // 門前部分需要的張數

    const [isTsumo, setIsTsumo] = useState(false);
    const [isDealer, setIsDealer] = useState(false);
    const [roundWind, setRoundWind] = useState("東");
    const [seatWind, setSeatWind] = useState("東");
    const [riichi, setRiichi] = useState(false);
    const [doubleRiichi, setDoubleRiichi] = useState(false);
    const [tenchi, setTenchi] = useState(false); // 天和（親家）／地和（子家），同一個開關
    const [ippatsu, setIppatsu] = useState(false);
    const [haitei, setHaitei] = useState(false);
    const [rinshan, setRinshan] = useState(false);
    const [chankan, setChankan] = useState(false);
    const [showFuDetail, setShowFuDetail] = useState(false);

    const [doraMode, setDoraMode] = useState("count"); // count | indicator
    const [doraCount, setDoraCount] = useState(0);
    const [indicatorTiles, setIndicatorTiles] = useState([]); // 寶牌指示牌（只能點選）
    const [pickTarget, setPickTarget] = useState("hand"); // hand | indicator

    // 長按刪除用的計時器
    const longPressTimer = useRef(null);
    const longPressFired = useRef(false);
    const meldPressTimer = useRef(null);
    const meldPressFired = useRef(false);

    const [result, setResult] = useState(null);

    // 手牌更新：同步文字、預設和了牌為最後一張
    const applyHand = (nextTiles) => {
        setTiles(nextTiles);
        setInput(toTilesStr(nextTiles));
        setWinIndex(nextTiles.length ? nextTiles.length - 1 : null);
    };

    const handleTextChange = (value) => {
        setInput(value);
        const parsed = parseTiles(value);
        setTiles(parsed);
        setWinIndex(parsed.length === expectedConcealed ? parsed.length - 1 : null);
    };

    const handlePick = (tile) => {
        if (tiles.length >= expectedConcealed) return;
        // 0m 與 5m 是同一張牌，共用 4 張上限
        const used = tiles.filter((t) => tileToIndex(t) === tileToIndex(tile)).length;
        if (used >= 4) return;
        applyHand([...tiles, tile]);
    };

    const handleUndo = () => {
        if (!tiles.length) return;
        applyHand(tiles.slice(0, -1));
    };

    // 移除指定位置的手牌（和了牌位置會跟著調整）
    const removeTile = (index) => {
        const next = tiles.filter((_, i) => i !== index);
        let nextWin = winIndex;
        if (nextWin !== null) {
            if (index === nextWin) nextWin = next.length - 1;
            else if (index < nextWin) nextWin = nextWin - 1;
        }
        setTiles(next);
        setInput(toTilesStr(next));
        setWinIndex(next.length ? nextWin : null);
    };

    // 清空：手牌、副露、寶牌設定一起重置
    const clearAll = () => {
        applyHand([]);
        setMeldInput("");
        setPendingMeld([]);
        setMeldKind(null);
        setMeldError("");
        setDoraCount(0);
        setIndicatorTiles([]);
    };

    // 長按副露 → 刪掉那一組（用剩下的副露重建文字碼）
    const removeMeld = (index) => {
        const remaining = parsedMelds.melds.filter((_, i) => i !== index);
        setMeldInput(remaining.map(meldToCode).join(" "));
    };

    const startMeldLongPress = (index) => {
        meldPressFired.current = false;
        meldPressTimer.current = setTimeout(() => {
            meldPressFired.current = true;
            removeMeld(index);
        }, 500);
    };

    const cancelMeldLongPress = () => {
        if (meldPressTimer.current) {
            clearTimeout(meldPressTimer.current);
            meldPressTimer.current = null;
        }
    };

    // 加入 / 移除寶牌指示牌（只能點選）
    const addIndicator = (tile) => setIndicatorTiles((prev) => [...prev, tile]);
    const removeIndicator = (index) => setIndicatorTiles((prev) => prev.filter((_, i) => i !== index));

    // ---- 點選式副露：先選吃/碰/槓，再點牌湊滿 ----
    const cancelPendingMeld = () => {
        setPendingMeld([]);
        setMeldKind(null);
        setMeldError("");
    };

    const commitMeld = (picked) => {
        const built = buildMeldCode(meldKind, picked);
        if (built.error) {
            setMeldError(built.error);
            setPendingMeld([]);
            return;
        }
        setMeldInput((prev) => (prev ? prev + " " : "") + built.code);
        setPendingMeld([]);
        setMeldKind(null);
        setMeldError("");
    };

    const pickForMeld = (tile) => {
        const need = meldKind === "chi" || meldKind === "pon" ? 3 : 4;
        const next = [...pendingMeld, tile];
        if (next.length < need) {
            setPendingMeld(next);
            return;
        }
        commitMeld(next);
    };

    // 點手牌＝設為和了牌；長按 500ms＝刪除那一張
    const startLongPress = (index) => {
        longPressFired.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            removeTile(index);
        }, 500);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleHandTileClick = (index) => {
        if (longPressFired.current) {
            // 剛剛是長按，這次 click 是長按附帶的，忽略
            longPressFired.current = false;
            return;
        }
        setWinIndex(index);
    };

    // 寶牌張數
    // 寶牌張數（指示牌換算 + 赤寶牌）
    const redCount = tiles.filter((t) => t[0] === "0").length; // 0m/0p/0s 各算 1 張寶牌
    const doraBase = (() => {
        if (doraMode === "count") return Number(doraCount) || 0;

        const indicators = toTiles34(indicatorTiles);
        const hand = toTiles34(tiles);
        let count = 0;
        indicators.forEach((c, i) => {
            if (c > 0) count += c * hand[indicatorToDora(i)];
        });
        return count;
    })();
    const doraValue = doraBase + redCount;

    useEffect(() => {
        if (parsedMelds.errors.length > 0 || tiles.length !== expectedConcealed || winIndex === null) {
            setResult(null);
            return;
        }
        const tiles34 = toTiles34(tiles);
        const winTile = tileToIndex(tiles[winIndex]);
        // 嶺上／天和／地和 都是自摸；搶槓一定是榮和；海底／河底依此自動分派
        const tsumoEffective = (isTsumo || rinshan || tenchi) && !chankan;
        setResult(
            scoreHand({
                tiles34,
                winTile,
                melds: parsedMelds.melds,
                tsumo: tsumoEffective,
                dealer: isDealer,
                roundWind,
                seatWind,
                riichi,
                doubleRiichi,
                ippatsu,
                rinshan,
                chankan,
                // 親家是天和、子家是地和，由「親家」勾選決定
                tenhou: tenchi && isDealer,
                chiihou: tenchi && !isDealer,
                haitei: haitei && tsumoEffective,
                houtei: haitei && !tsumoEffective,
                dora: doraValue,
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tiles, winIndex, isTsumo, isDealer, roundWind, seatWind, riichi, doubleRiichi, ippatsu, haitei, rinshan, chankan, tenchi, doraValue, meldInput]);

    const checkbox = (label, checked, onChange) => (
        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "16px" }}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );

    const select = (value, onChange, options) => (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ fontSize: "16px", padding: "2px 6px" }}>
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    );

    const modeButton = (key, label) => (
        <button
            onClick={() => setMode(key)}
            style={{
                padding: "6px 14px",
                fontSize: "16px",
                fontWeight: "bold",
                borderRadius: "6px",
                cursor: "pointer",
                border: "1px solid #007BFF",
                backgroundColor: mode === key ? "#007BFF" : "transparent",
                color: mode === key ? "#fff" : "#007BFF",
            }}
        >
            {label}
        </button>
    );

    const doraButton = (key, label) => (
        <button
            onClick={() => {
                setDoraMode(key);
                // 點「指示牌」就自動切到點選指示牌；點「張數」回到點選手牌
                setPickTarget(key === "indicator" ? "indicator" : "hand");
            }}
            style={{
                padding: "3px 10px",
                fontSize: "15px",
                borderRadius: "5px",
                cursor: "pointer",
                border: "1px solid #007BFF",
                backgroundColor: doraMode === key ? "#007BFF" : "transparent",
                color: doraMode === key ? "#fff" : "#007BFF",
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "clamp(28px, 2vw, 32px)", fontWeight: "bold" }}>手牌算點</div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                {modeButton("text", "手動輸入")}
                {modeButton("pick", "點選牌")}
            </div>

            {mode === "text" && (
                <div style={{ marginTop: "12px" }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={`輸入 ${expectedConcealed} 張門前手牌，例如：123m456p789s11222z`}
                        style={{ width: "420px", maxWidth: "90vw", padding: "10px", border: "2px solid #000", borderRadius: "5px", fontSize: "16px" }}
                    />
                </div>
            )}

            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>副露</span>
                <input
                    type="text"
                    value={meldInput}
                    onChange={(e) => setMeldInput(e.target.value)}
                    placeholder="例：123m 111p 1111s-（尾端 - 表示暗槓）"
                    style={{ width: "360px", maxWidth: "86vw", padding: "8px", border: "1px solid #888", borderRadius: "5px", fontSize: "15px" }}
                />
                {meldCount > 0 && <span style={{ fontSize: "15px", color: "#007BFF" }}>門前需 {expectedConcealed} 張</span>}
            </div>

            {parsedMelds.errors.length > 0 && (
                <div style={{ color: "#dc3545", fontSize: "15px", marginTop: "4px", textAlign: "center" }}>
                    {parsedMelds.errors.map((err, i) => (
                        <div key={i}>{err}</div>
                    ))}
                </div>
            )}

            {meldCount > 0 && (
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
                    {parsedMelds.melds.map((m, mi) => (
                        <div
                            key={mi}
                            onMouseDown={() => startMeldLongPress(mi)}
                            onMouseUp={cancelMeldLongPress}
                            onMouseLeave={cancelMeldLongPress}
                            onTouchStart={() => startMeldLongPress(mi)}
                            onTouchEnd={cancelMeldLongPress}
                            onTouchCancel={cancelMeldLongPress}
                            title="長按可刪除這組副露"
                            style={{ textAlign: "center", border: "1px solid #007BFF", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", userSelect: "none" }}
                        >
                            <div style={{ fontSize: "13px", color: "#007BFF", fontWeight: "bold" }}>{MELD_LABEL[m.type]}</div>
                            <div style={{ display: "flex", gap: "1px", marginTop: "2px" }}>
                                {meldTileNames(m).map((t, ti) => (
                                    <img key={ti} src={`${process.env.PUBLIC_URL}/images/${t}.png`} alt={t} style={{ width: TILE_SIZE, height: "auto", borderRadius: "4px" }} />
                                ))}
                            </div>
                        </div>
                    ))}
                    <span style={{ alignSelf: "center", fontSize: "13px", color: "#666" }}>長按可刪除</span>
                </div>
            )}

            {mode === "pick" && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", color: "#666" }}>點選加入：</span>
                        {[
                            [null, "手牌"],
                            ["chi", "吃"],
                            ["pon", "碰"],
                            ["minkan", "明槓"],
                            ["ankan", "暗槓"],
                        ].map(([kind, label]) => (
                            <button
                                key={label}
                                onClick={() => {
                                    setMeldKind(kind);
                                    setPendingMeld([]);
                                    setMeldError("");
                                    setPickTarget("hand");
                                }}
                                style={{
                                    padding: "4px 12px",
                                    fontSize: "15px",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    border: "1px solid #007BFF",
                                    backgroundColor: meldKind === kind ? "#007BFF" : "transparent",
                                    color: meldKind === kind ? "#fff" : "#007BFF",
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {meldKind && (
                        <div style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
                            已選 {pendingMeld.length} / {meldKind === "chi" || meldKind === "pon" ? 3 : 4} 張
                            {pendingMeld.length > 0 && (
                                <span>
                                    {" "}
                                    <span style={{ color: "#b8860b" }}>{pendingMeld.join(" ")}</span>
                                    <button
                                        onClick={cancelPendingMeld}
                                        style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "13px", borderRadius: "4px", border: "1px solid #888", background: "#fff", cursor: "pointer" }}
                                    >
                                        取消
                                    </button>
                                </span>
                            )}
                        </div>
                    )}

                    {meldError && <div style={{ color: "#dc3545", fontSize: "14px", textAlign: "center" }}>{meldError}</div>}

                    {["m", "p", "s", "z"].map((suit) => (
                        <div key={suit} style={{ display: "flex", gap: "2px", justifyContent: "center", flexWrap: "wrap" }}>
                            {ALL_TILES.filter((t) => t.slice(-1) === suit).map((tile) => {
                                const targetIsIndicator = doraMode === "indicator" && pickTarget === "indicator";
                                const buildingMeld = !!meldKind;
                                const used = targetIsIndicator
                                    ? indicatorTiles.filter((t) => tileToIndex(t) === tileToIndex(tile)).length
                                    : buildingMeld
                                    ? pendingMeld.filter((t) => tileToIndex(t) === tileToIndex(tile)).length
                                    : tiles.filter((t) => tileToIndex(t) === tileToIndex(tile)).length;
                                const disabled = used >= 4 || (!targetIsIndicator && !buildingMeld && tiles.length >= expectedConcealed);
                                const isIndicator = indicatorTiles.includes(tile);
                                const isPending = pendingMeld.includes(tile);
                                return (
                                    <img
                                        key={tile}
                                        src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                        alt={tile}
                                        onClick={() => {
                                            if (disabled) return;
                                            if (targetIsIndicator) addIndicator(tile);
                                            else if (buildingMeld) pickForMeld(tile);
                                            else handlePick(tile);
                                        }}
                                        style={{
                                            width: TILE_SIZE,
                                            height: "auto",
                                            cursor: disabled ? "not-allowed" : "pointer",
                                            opacity: disabled ? 0.3 : 1,
                                            borderRadius: "4px",
                                            border: isIndicator
                                                ? "2px solid #66ccff"
                                                : isPending
                                                ? "2px solid #ffc107"
                                                : "1px solid #ddd",
                                            boxSizing: "border-box",
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "6px" }}>
                        <button
                            onClick={handleUndo}
                            disabled={!tiles.length}
                            style={{
                                padding: "6px 14px",
                                fontSize: "15px",
                                borderRadius: "6px",
                                border: "1px solid #888",
                                backgroundColor: tiles.length ? "#fff" : "#eee",
                                cursor: tiles.length ? "pointer" : "not-allowed",
                            }}
                        >
                            退回一張
                        </button>
                        <button
                            onClick={clearAll}
                            disabled={!tiles.length}
                            style={{
                                padding: "6px 14px",
                                fontSize: "15px",
                                borderRadius: "6px",
                                border: "1px solid #888",
                                backgroundColor: tiles.length ? "#fff" : "#eee",
                                cursor: tiles.length ? "pointer" : "not-allowed",
                            }}
                        >
                            清空
                        </button>
                        <span style={{ alignSelf: "center", fontSize: "16px", color: "#666" }}>
                            {tiles.length} / {expectedConcealed}
                        </span>
                    </div>
                </div>
            )}

            {tiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", marginTop: "12px", justifyContent: "center" }}>
                    {tiles.map((tile, i) => (
                        <img
                            key={tile + i}
                            src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                            alt={tile}
                            onClick={() => handleHandTileClick(i)}
                            onMouseDown={() => startLongPress(i)}
                            onMouseUp={cancelLongPress}
                            onMouseLeave={cancelLongPress}
                            onTouchStart={() => startLongPress(i)}
                            onTouchEnd={cancelLongPress}
                            onTouchCancel={cancelLongPress}
                            title="點擊設為和了牌，長按刪除"
                            style={{
                                width: TILE_SIZE,
                                height: "auto",
                                cursor: "pointer",
                                borderRadius: "5px",
                                border: i === winIndex ? "2px solid #dc3545" : "2px solid transparent",
                                boxSizing: "border-box",
                            }}
                        />
                    ))}
                </div>
            )}

            {tiles.length > 0 && tiles.length !== expectedConcealed && (
                <div style={{ color: "#dc3545", fontWeight: "bold", marginTop: "8px" }}>
                    目前 {tiles.length} 張，門前需要 {expectedConcealed} 張
                </div>
            )}
            {winIndex !== null && (
                <div style={{ color: "#666", marginTop: "6px", fontSize: "15px" }}>紅框＝和了牌（點手牌可改，長按可刪除）</div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "center", marginTop: "14px" }}>
                {checkbox("自摸", isTsumo, setIsTsumo)}
                {checkbox("親家（莊家）", isDealer, setIsDealer)}
                {checkbox("立直", riichi, setRiichi)}
                {checkbox("雙立直", doubleRiichi, setDoubleRiichi)}
                {checkbox("一發", ippatsu, setIppatsu)}
                {checkbox("天和／地和", tenchi, setTenchi)}
                {checkbox("海底／河底", haitei, setHaitei)}
                {checkbox("嶺上開花", rinshan, setRinshan)}
                {checkbox("搶槓", chankan, setChankan)}
                {checkbox("顯示符數明細", showFuDetail, setShowFuDetail)}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "center", marginTop: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "16px" }}>
                    場風 {select(roundWind, setRoundWind, WINDS)}
                </span>
                <span style={{ fontSize: "16px" }}>
                    自風 {select(seatWind, setSeatWind, WINDS)}
                </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>寶牌</span>
                {doraButton("count", "張數")}
                {doraButton("indicator", "指示牌")}
                {doraMode === "count" ? (
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={doraCount}
                        onChange={(e) => setDoraCount(Number(e.target.value))}
                        style={{ width: "70px", fontSize: "16px", padding: "3px 6px" }}
                    />
                ) : (
                    <span style={{ fontSize: "15px", color: "#666" }}>
                        {mode === "pick" ? "點下方牌堆選指示牌" : "切到「點選牌」模式才能選指示牌"}
                    </span>
                )}
                <span style={{ fontSize: "15px", color: "#007BFF", fontWeight: "bold" }}>
                    ＝ {doraValue} 張{redCount > 0 ? `（含赤寶 ${redCount}）` : ""}
                </span>
            </div>

            {doraMode === "indicator" && (
                <div style={{ display: "flex", gap: "3px", justifyContent: "center", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
                    {indicatorTiles.length === 0 && <span style={{ fontSize: "14px", color: "#999" }}>尚未選指示牌</span>}
                    {indicatorTiles.map((tile, i) => (
                        <img
                            key={`ind-${tile}-${i}`}
                            src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                            alt={tile}
                            title="點擊移除這張指示牌"
                            onClick={() => removeIndicator(i)}
                            style={{
                                width: TILE_SIZE,
                                height: "auto",
                                borderRadius: "4px",
                                border: "2px solid #66ccff",
                                boxSizing: "border-box",
                                cursor: "pointer",
                            }}
                        />
                    ))}
                    {indicatorTiles.length > 0 && <span style={{ fontSize: "14px", color: "#666", marginLeft: "6px" }}>點圖可移除</span>}
                    {mode === "pick" && (
                        <button
                            onClick={() => {
                                setPickTarget(pickTarget === "indicator" ? "hand" : "indicator");
                                setMeldKind(null);
                                setPendingMeld([]);
                            }}
                            style={{
                                marginLeft: "10px",
                                padding: "4px 10px",
                                fontSize: "14px",
                                borderRadius: "5px",
                                cursor: "pointer",
                                border: pickTarget === "indicator" ? "1px solid #66ccff" : "1px solid #007BFF",
                                color: pickTarget === "indicator" ? "#fff" : "#007BFF",
                                backgroundColor: pickTarget === "indicator" ? "#66ccff" : "transparent",
                            }}
                        >
                            {pickTarget === "indicator" ? "目前點選：指示牌（點擊切換）" : "目前點選：手牌（點擊切換）"}
                        </button>
                    )}
                </div>
            )}

            <div style={{ marginTop: "20px", minHeight: "200px", width: "min(760px, 94vw)" }}>
                {!result && <div style={{ color: "#888", textAlign: "center" }}>完成 {expectedConcealed} 張門前手牌後自動計算</div>}

                {result && !result.ok && <div style={{ color: "#dc3545", fontWeight: "bold", textAlign: "center" }}>{result.error}</div>}

                {result && result.ok && (
                    <div style={{ border: "2px solid #007BFF", borderRadius: "10px", padding: "15px" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "18px", alignItems: "baseline", flexWrap: "wrap" }}>
                            <div style={{ fontSize: "26px", fontWeight: "bold", color: "#007BFF" }}>
                                {result.isYakuman ? `役滿${result.han > 13 ? ` ×${Math.floor(result.han / 13)}` : ""}` : `${result.han} 飜`}
                            </div>
                            {!result.isYakuman && <div style={{ fontSize: "26px", fontWeight: "bold", color: "#007BFF" }}>{result.fu} 符</div>}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "12px" }}>
                            {result.yaku.map((y) => (
                                <span key={y.name} style={{ border: "1px solid #007BFF", borderRadius: "6px", padding: "3px 8px", fontSize: "15px" }}>
                                    {y.name} {y.han}飜
                                </span>
                            ))}
                            {result.dora > 0 && (
                                <span style={{ border: "1px solid #888", borderRadius: "6px", padding: "3px 8px", fontSize: "15px" }}>
                                    寶牌 {result.dora}飜
                                </span>
                            )}
                        </div>

                        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "22px", fontWeight: "bold" }}>
                            {result.points.type === "ron"
                                ? `${result.points.ron} 點`
                                : `自摸：${result.points.dealerPay ?? result.points.each} / ${result.points.childPay ?? result.points.each}（合計 ${result.points.total}）`}
                        </div>

                        {showFuDetail && result.fuDetail && result.fuDetail.length > 0 && (
                            <div style={{ marginTop: "12px", borderTop: "1px dashed #bbb", paddingTop: "10px", textAlign: "left" }}>
                                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#555", marginBottom: "4px" }}>符數計算</div>
                                {result.fuDetail.map((d, i) => (
                                    <div key={i} style={{ fontSize: "14px", color: "#555", lineHeight: 1.8 }}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HandScoreCalculator;
