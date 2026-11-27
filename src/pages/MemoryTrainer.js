import { useEffect, useRef, useState } from "react";
import { accuracyOf, topByAccuracy, topByTime } from "../tools/memoryChallenge";
import { TILE_TYPES, compareHands, drawRandomHand, shuffleTiles, tileIndex } from "../tools/memoryHand";
import { loadSettings, tileWidth } from "../tools/settings";

const STATS_KEY = "memory-trainer-stats";
const LEADERBOARD_KEY = "memory-trainer-leaderboard";
const COUNT_OPTIONS = [7, 10, 13, 14];
const SECOND_OPTIONS = [0, 3, 5, 8, 12]; // 0 = 不限時
const ROUND_OPTIONS = [3, 5];
const EMPTY_STATS = { played: 0, perfect: 0, streak: 0, best: 0 };

const primaryButton = {
    padding: "9px 22px",
    fontSize: "17px",
    fontWeight: "bold",
    borderRadius: "8px",
    border: "1px solid #007BFF",
    backgroundColor: "#007BFF",
    color: "#fff",
    cursor: "pointer",
};

const secondaryButton = {
    padding: "9px 22px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "8px",
    border: "1px solid #007BFF",
    backgroundColor: "transparent",
    color: "#007BFF",
    cursor: "pointer",
};

const outlineButton = {
    padding: "5px 14px",
    fontSize: "15px",
    fontWeight: "bold",
    borderRadius: "6px",
    border: "1px solid #007BFF",
    backgroundColor: "transparent",
    color: "#007BFF",
    cursor: "pointer",
};

const selectStyle = { fontSize: "16px", padding: "3px 6px" };

const smallButton = (enabled) => ({
    padding: "6px 14px",
    fontSize: "15px",
    borderRadius: "6px",
    border: "1px solid #888",
    backgroundColor: enabled ? "#fff" : "#eee",
    color: enabled ? "#333" : "#999",
    cursor: enabled ? "pointer" : "not-allowed",
});

// 開關按鈕：開＝藍底，關＝灰底（和「牌效率何切」的自動理牌一致）
const toggleButton = (on, locked) => ({
    padding: "5px 14px",
    fontSize: "15px",
    fontWeight: "bold",
    backgroundColor: locked ? "#aaaaaa" : on ? "#007BFF" : "#777777",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: locked ? "not-allowed" : "pointer",
    transition: "all 0.3s ease",
});

const cellStyle = { padding: "3px 8px", borderBottom: "1px solid #eee", textAlign: "center" };
const headStyle = { ...cellStyle, color: "#666", fontWeight: "bold", borderBottom: "1px solid #ccc" };

const LeaderboardTable = ({ title, rows }) => (
    <div style={{ flex: "1 1 260px", minWidth: "250px" }}>
        <div style={{ fontSize: "15px", fontWeight: "bold", color: "#007BFF", textAlign: "center" }}>{title}</div>
        {rows.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: "14px", color: "#999", padding: "8px 0" }}>尚無紀錄</div>
        ) : (
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }}>
                <thead>
                    <tr>
                        <th style={headStyle}>#</th>
                        <th style={headStyle}>準確率</th>
                        <th style={headStyle}>總記憶時間</th>
                        <th style={headStyle}>題數</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={`${row.at}-${i}`}>
                            <td style={cellStyle}>{i + 1}</td>
                            <td style={cellStyle}>{row.accuracy.toFixed(1)}%</td>
                            <td style={cellStyle}>{(row.timeMs / 1000).toFixed(2)} 秒</td>
                            <td style={cellStyle}>{row.rounds} 題</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);

const loadStats = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STATS_KEY));
        if (parsed && typeof parsed === "object") return { ...EMPTY_STATS, ...parsed };
    } catch {
        // 資料壞掉就從零開始
    }
    return { ...EMPTY_STATS };
};

// { "7": [紀錄...], "13": [...] }，不同張數分開排行
const loadLeaderboard = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY));
        if (parsed && typeof parsed === "object") return parsed;
    } catch {
        // 資料壞掉就從空榜開始
    }
    return {};
};

const MemoryTrainer = () => {
    // 牌面尺寸：響應式就沿用 clamp()，否則用設定頁的固定 px
    const [tileSettings, setTileSettings] = useState(() => {
        const s = loadSettings();
        return { size: s.memoryTileSize, responsive: s.memoryResponsive };
    });
    const TILE_SIZE = tileWidth(tileSettings.size, tileSettings.responsive);

    useEffect(() => {
        const sync = () => {
            const s = loadSettings();
            setTileSettings({ size: s.memoryTileSize, responsive: s.memoryResponsive });
        };
        window.addEventListener("storage", sync);
        window.addEventListener("focus", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("focus", sync);
        };
    }, []);

    const [phase, setPhase] = useState("idle"); // idle | view | recall | result | summary
    const [mode, setMode] = useState("normal"); // normal | challenge
    const [tileCount, setTileCount] = useState(13);
    const [memorySeconds, setMemorySeconds] = useState(5);
    const [shuffleDisplay, setShuffleDisplay] = useState(false);
    const [redFives, setRedFives] = useState(false);
    const [challengeRounds, setChallengeRounds] = useState(3);

    const [target, setTarget] = useState([]);
    const [guess, setGuess] = useState([]);
    const [viewKind, setViewKind] = useState("start"); // start | peek
    const [viewDuration, setViewDuration] = useState(5); // 0 = 不限時
    const [timeLeft, setTimeLeft] = useState(0);
    const [viewNonce, setViewNonce] = useState(0); // 讓「刷新」能重啟同一個計時器
    const [result, setResult] = useState(null);
    const [scored, setScored] = useState(false);
    const [stats, setStats] = useState(loadStats);
    const [leaderboard, setLeaderboard] = useState(loadLeaderboard);

    const [challenge, setChallenge] = useState(null);
    const [challengeResult, setChallengeResult] = useState(null);
    const [lastRoundMs, setLastRoundMs] = useState(0);
    const [recallClock, setRecallClock] = useState(0);

    // 作答計時：只算「實際在選牌」的時間，偷看時暫停
    const recallTiming = useRef({ startedAt: null, accumulatedMs: 0 });
    // 記憶計時：挑戰模式只算「看牌」的時間（不限時時也照算），進入作答就停止
    const viewTiming = useRef({ startedAt: null, accumulatedMs: 0 });

    const busy = phase === "view" || phase === "recall";
    const challengeActive = challenge !== null;
    const settingsLocked = busy || challengeActive;
    const boardEntries = leaderboard[tileCount] || [];

    useEffect(() => {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        } catch {
            // 無痕模式等情況寫不進去，不影響練習
        }
    }, [stats]);

    useEffect(() => {
        try {
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
        } catch {
            // 同上
        }
    }, [leaderboard]);

    // 倒數或正計時：一律以實際時間計算，切到背景再回來也不會失準
    useEffect(() => {
        if (phase !== "view") return undefined;
        // 挑戰模式永遠不限時，就算 state 一時沒同步也不會被倒數踢進作答
        const unlimited = challenge !== null || viewDuration === 0;
        setTimeLeft(unlimited ? 0 : viewDuration);
        const startedAt = Date.now();
        const id = setInterval(() => {
            const elapsed = (Date.now() - startedAt) / 1000;
            if (unlimited) {
                setTimeLeft(elapsed);
                return;
            }
            const left = viewDuration - elapsed;
            if (left <= 0) {
                clearInterval(id);
                setTimeLeft(0);
                setPhase("recall");
            } else {
                setTimeLeft(left);
            }
        }, 50); // 不限時要顯示到小數第二位，更新得比 0.1 秒細一點
        return () => clearInterval(id);
        // viewNonce 只用在「刷新」時重啟同一個計時器
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, viewDuration, viewNonce, challenge]);

    // 進入作答就開始計時；偷看回到看牌時暫停，回來再繼續累加
    useEffect(() => {
        if (phase !== "recall") return undefined;
        if (recallTiming.current.startedAt == null) {
            recallTiming.current.startedAt = Date.now();
        }
        return () => {
            const timing = recallTiming.current;
            if (timing.startedAt != null) {
                timing.accumulatedMs += Date.now() - timing.startedAt;
                timing.startedAt = null;
            }
        };
    }, [phase]);

    // 看牌計時：進入看牌就開始（挑戰模式不限時也要計），多段加總
    useEffect(() => {
        if (phase !== "view") return undefined;
        const timing = viewTiming.current;
        if (timing.startedAt == null) {
            timing.startedAt = Date.now();
        }
        return () => {
            if (timing.startedAt != null) {
                timing.accumulatedMs += Date.now() - timing.startedAt;
                timing.startedAt = null;
            }
        };
    }, [phase]);

    // 挑戰模式在作答時顯示即時用時（此時停在記憶時間上，不再走動；偷看才會繼續累加）
    useEffect(() => {
        if (phase !== "recall" || !challenge) return undefined;
        const id = setInterval(() => {
            const vt = viewTiming.current;
            const ms = vt.accumulatedMs + (vt.startedAt != null ? Date.now() - vt.startedAt : 0);
            setRecallClock(ms);
        }, 100);
        return () => clearInterval(id);
    }, [phase, challenge]);

    const takeRecallMs = () => {
        const timing = recallTiming.current;
        if (timing.startedAt != null) {
            timing.accumulatedMs += Date.now() - timing.startedAt;
            timing.startedAt = null;
        }
        return Math.round(timing.accumulatedMs);
    };

    // 收走「看牌」時間：挑戰模式把整段時間歸零，從作答開始重新記
    const takeViewMs = () => {
        const timing = viewTiming.current;
        if (timing.startedAt != null) {
            timing.accumulatedMs += Date.now() - timing.startedAt;
            timing.startedAt = null;
        }
        const ms = Math.round(timing.accumulatedMs);
        viewTiming.current = { startedAt: null, accumulatedMs: 0 };
        return ms;
    };

    const enterView = (kind, duration) => {
        setViewKind(kind);
        setViewDuration(duration);
        setTimeLeft(duration);
        setViewNonce((n) => n + 1);
        setPhase("view");
    };

    const peekDuration = () => (memorySeconds > 0 ? Math.min(2, memorySeconds) : 2);

    const beginRound = (inChallenge) => {
        let hand = drawRandomHand(tileCount, Math.random, redFives);
        if (shuffleDisplay) hand = shuffleTiles(hand);
        setTarget(hand);
        setGuess([]);
        setResult(null);
        setScored(false);
        setLastRoundMs(0);
        setRecallClock(0);
        recallTiming.current = { startedAt: null, accumulatedMs: 0 };
        viewTiming.current = { startedAt: null, accumulatedMs: 0 };
        // 挑戰模式一律不限時：看多久由使用者決定，計時記的就是這段記憶時間
        // 用參數傳入而不是看 challenge state —— startChallenge 剛 setChallenge 時 state 還沒更新
        enterView("start", inChallenge ? 0 : memorySeconds);
    };

    const startRound = () => {
        setChallenge(null);
        setChallengeResult(null);
        beginRound(false);
    };

    const startChallenge = () => {
        setChallenge({ rounds: challengeRounds, index: 0, matched: 0, total: 0, elapsedMs: 0, roundTimes: [], roundResults: [] });
        setChallengeResult(null);
        beginRound(true);
    };

    const nextChallengeRound = () => {
        if (!challenge) return;
        setChallenge({ ...challenge, index: challenge.index + 1 });
        beginRound(true);
    };

    // 「刷新」回到開始畫面，由使用者自己再按一次開始；挑戰中按刷新會結束這次挑戰
    const resetToIdle = () => {
        setTarget([]);
        setGuess([]);
        setResult(null);
        setScored(false);
        setChallenge(null);
        setChallengeResult(null);
        setViewKind("start");
        setViewDuration(memorySeconds);
        setTimeLeft(0);
        recallTiming.current = { startedAt: null, accumulatedMs: 0 };
        viewTiming.current = { startedAt: null, accumulatedMs: 0 };
        setPhase("idle");
    };

    const checkGuess = (nextGuess) => {
        if (!target.length) return;
        const compared = compareHands(target, nextGuess);
        // 普通模式記作答時間；挑戰模式記「記憶時間」（看牌那段，事後偷看也照算）
        const roundMs = challenge ? takeViewMs() : takeRecallMs();
        setLastRoundMs(roundMs);
        setResult(compared);

        if (challenge) {
            const updated = {
                ...challenge,
                matched: challenge.matched + compared.matched,
                total: challenge.total + compared.total,
                elapsedMs: challenge.elapsedMs + roundMs,
                roundTimes: [...challenge.roundTimes, roundMs],
                roundResults: [...challenge.roundResults, compared],
            };
            setChallenge(updated);
            if (updated.index + 1 >= updated.rounds) {
                const accuracy = accuracyOf(updated.matched, updated.total);
                const entry = { rounds: updated.rounds, accuracy, timeMs: updated.elapsedMs, at: Date.now() };
                setChallengeResult({ ...updated, accuracy });
                setLeaderboard((prev) => ({ ...prev, [tileCount]: [entry, ...(prev[tileCount] || [])].slice(0, 100) }));
                setPhase("summary");
            } else {
                setPhase("result");
            }
            return;
        }

        setPhase("result");
        if (!scored) {
            setScored(true);
            setStats((prev) => {
                const streak = compared.perfect ? prev.streak + 1 : 0;
                return {
                    played: prev.played + 1,
                    perfect: prev.perfect + (compared.perfect ? 1 : 0),
                    streak,
                    best: Math.max(prev.best, streak),
                };
            });
        }
    };

    const handlePick = (tile) => {
        if (phase !== "recall" || guess.length >= target.length) return;
        const index = tileIndex(tile);
        const used = guess.filter((t) => tileIndex(t) === index).length;
        const limit = tile[0] === "0" ? 1 : 4;
        if (used >= limit) return;
        const next = [...guess, tile];
        setGuess(next);
        if (next.length === target.length) checkGuess(next);
    };

    const handleUndo = () => {
        if (phase !== "recall" || !guess.length) return;
        setGuess(guess.slice(0, -1));
    };

    const clearGuess = () => {
        if (phase !== "recall") return;
        setGuess([]);
    };

    const peek = () => {
        if (phase !== "recall" || challenge) return; // 挑戰模式不能偷看
        enterView("peek", peekDuration());
    };

    const reviewAgain = () => {
        setGuess([]);
        setResult(null);
        enterView("peek", peekDuration());
    };

    const accuracy = result && result.total ? Math.round((result.matched / result.total) * 100) : 0;
    const boardTitle = `${tileCount} 張`;

    return (
        <div style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "clamp(28px, 2vw, 32px)", fontWeight: "bold" }}>記憶訓練</div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginTop: "12px", fontSize: "16px" }}>
                <label>
                    模式{" "}
                    <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={settingsLocked} style={selectStyle}>
                        <option value="normal">普通</option>
                        <option value="challenge">挑戰</option>
                    </select>
                </label>
                <label>
                    張數{" "}
                    <select value={tileCount} onChange={(e) => setTileCount(Number(e.target.value))} disabled={settingsLocked} style={selectStyle}>
                        {COUNT_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n} 張
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    記憶時間{" "}
                    <select
                        value={mode === "challenge" ? 0 : memorySeconds}
                        onChange={(e) => setMemorySeconds(Number(e.target.value))}
                        disabled={settingsLocked || mode === "challenge"}
                        title={mode === "challenge" ? "挑戰模式固定不限時" : undefined}
                        style={selectStyle}
                    >
                        {mode === "challenge" ? (
                            <option value={0}>不限時（挑戰固定）</option>
                        ) : (
                            SECOND_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                    {s === 0 ? "不限時" : `${s} 秒`}
                                </option>
                            ))
                        )}
                    </select>
                </label>
                {mode === "challenge" && (
                    <label>
                        題數{" "}
                        <select value={challengeRounds} onChange={(e) => setChallengeRounds(Number(e.target.value))} disabled={settingsLocked} style={selectStyle}>
                            {ROUND_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n} 題
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <button
                    type="button"
                    onClick={() => setShuffleDisplay((value) => !value)}
                    disabled={settingsLocked}
                    title={shuffleDisplay ? "目前顯示順序已打亂（作答仍不看順序）" : "目前顯示順序按萬筒索字排列"}
                    style={toggleButton(shuffleDisplay, settingsLocked)}
                >
                    {shuffleDisplay ? "亂序：開" : "亂序：關"}
                </button>
                <button
                    type="button"
                    onClick={() => setRedFives((value) => !value)}
                    disabled={settingsLocked}
                    title={redFives ? "手牌可能出現赤寶牌，作答要點對應的赤寶 0m / 0p / 0s" : "手牌不會出現赤寶牌"}
                    style={toggleButton(redFives, settingsLocked)}
                >
                    {redFives ? "赤寶：開" : "赤寶：關"}
                </button>
                <button type="button" onClick={resetToIdle} style={outlineButton} title="回到開始畫面（挑戰中會結束本次挑戰）">
                    刷新
                </button>
            </div>

            {phase === "idle" && mode === "normal" && (
                <div style={{ marginTop: "20px", textAlign: "center", maxWidth: "640px" }}>
                    <div style={{ fontSize: "17px", lineHeight: 1.8 }}>
                        看一手牌，記住後憑記憶把它點回來。
                        <br />
                        點選方式和「手牌算點」一樣，順序不限。
                        <br />
                        選「不限時」可以自己按「記住了」再開始作答。
                    </div>
                    <button onClick={startRound} style={{ ...primaryButton, marginTop: "18px", fontSize: "20px", padding: "12px 34px" }}>
                        開始記憶
                    </button>
                </div>
            )}

            {phase === "idle" && mode === "challenge" && (
                <div style={{ marginTop: "20px", textAlign: "center", maxWidth: "640px" }}>
                    <div style={{ fontSize: "17px", lineHeight: 1.8 }}>
                        連續 {challengeRounds} 題，每題都是 {tileCount} 張。
                        <br />
                        看牌不限時，記多久由你決定；用的時間會計入成績。
                        <br />
                        全部做完後統計總準確率和總記憶時間，並列入 {tileCount} 張的排行榜。
                        <br />
                        作答不計時，但作答時不能再偷看。
                    </div>
                    <button onClick={startChallenge} style={{ ...primaryButton, marginTop: "18px", fontSize: "20px", padding: "12px 34px" }}>
                        開始挑戰
                    </button>
                </div>
            )}

            {phase === "idle" && mode === "challenge" && (
                <div style={{ width: "min(760px, 94vw)", marginTop: "22px" }}>
                    <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
                        <LeaderboardTable title={`${boardTitle} · 準確率最高`} rows={topByAccuracy(boardEntries)} />
                        <LeaderboardTable title={`${boardTitle} · 最快`} rows={topByTime(boardEntries)} />
                    </div>
                </div>
            )}

            {phase === "view" && (
                <div style={{ marginTop: "18px", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#007BFF" }}>{viewKind === "peek" ? "再看一眼" : "記住這副手牌"}</div>
                    {challenge && (
                        <div style={{ fontSize: "15px", color: "#555", marginTop: "2px" }}>
                            第 {challenge.index + 1} / {challenge.rounds} 題 · 記多久都可以，按「記住了」才開始作答
                        </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", justifyContent: "center", marginTop: "12px" }}>
                        {target.map((tile, i) => (
                            <img
                                key={tile + i}
                                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                alt={tile}
                                draggable={false}
                                style={{ width: TILE_SIZE, height: "auto", borderRadius: "5px", border: "2px solid transparent", boxSizing: "border-box", userSelect: "none" }}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: "14px", fontSize: "18px", fontWeight: "bold" }}>
                        {viewDuration === 0
                            ? challenge
                                ? `已記 ${timeLeft.toFixed(2)} 秒 · 不限時，計入成績`
                                : `已用 ${timeLeft.toFixed(2)} 秒 · 不限時`
                            : `剩餘 ${Math.ceil(timeLeft)} 秒`}
                    </div>
                    {viewDuration > 0 && (
                        <div style={{ width: "min(420px, 86vw)", height: "8px", background: "#eee", borderRadius: "4px", margin: "8px auto 0", overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, (timeLeft / viewDuration) * 100))}%`, height: "100%", background: "#007BFF" }} />
                        </div>
                    )}
                    <button onClick={() => setPhase("recall")} style={{ ...primaryButton, marginTop: "16px" }}>
                        記住了，開始回憶
                    </button>
                </div>
            )}

            {phase === "recall" && (
                <div style={{ marginTop: "16px", width: "min(760px, 94vw)" }}>
                    <div style={{ textAlign: "center", fontSize: "17px", fontWeight: "bold" }}>憑記憶點出這 {target.length} 張牌（順序不限）</div>
                    {challenge ? (
                        <div style={{ textAlign: "center", fontSize: "15px", color: "#007BFF", fontWeight: "bold", marginTop: "2px" }}>
                            第 {challenge.index + 1} / {challenge.rounds} 題 · 本題記憶用時 {(recallClock / 1000).toFixed(2)} 秒（作答不計時，挑戰中不能偷看）
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", fontSize: "15px", color: "#666", marginTop: "4px" }}>
                            已選 {guess.length} / {target.length}，點滿自動判定
                        </div>
                    )}
                    <div style={{ textAlign: "center", fontSize: "14px", color: "#666" }}>
                        已選 {guess.length} / {target.length}，點滿自動判定
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", justifyContent: "center", minHeight: "56px", marginTop: "10px" }}>
                        {guess.length === 0 && <span style={{ alignSelf: "center", fontSize: "15px", color: "#999" }}>尚未選牌</span>}
                        {guess.map((tile, i) => (
                            <img
                                key={tile + i}
                                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                alt={tile}
                                draggable={false}
                                style={{ width: TILE_SIZE, height: "auto", borderRadius: "5px", border: "2px solid #66ccff", boxSizing: "border-box", userSelect: "none" }}
                            />
                        ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                        <button onClick={handleUndo} disabled={!guess.length} style={smallButton(!!guess.length)}>
                            退回一張
                        </button>
                        <button onClick={clearGuess} disabled={!guess.length} style={smallButton(!!guess.length)}>
                            清空
                        </button>
                        <button onClick={peek} disabled={!!challenge} style={smallButton(!challenge)} title={challenge ? "挑戰模式不能偷看" : undefined}>
                            偷看一眼（2 秒）
                        </button>
                    </div>

                    <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "3px" }}>
                        {["m", "p", "s", "z"].map((suit) => {
                            const suitTiles = TILE_TYPES.filter((t) => t.slice(-1) === suit);
                            if (redFives && suit !== "z") suitTiles.push(`0${suit}`);
                            return (
                                <div key={suit} style={{ display: "flex", gap: "2px", justifyContent: "center", flexWrap: "wrap" }}>
                                    {suitTiles.map((tile) => {
                                        const index = tileIndex(tile);
                                        const used = guess.filter((t) => tileIndex(t) === index).length;
                                        const limit = tile[0] === "0" ? 1 : 4;
                                        const disabled = used >= limit || guess.length >= target.length;
                                        return (
                                            <img
                                                key={tile}
                                                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                                alt={tile}
                                                draggable={false}
                                                onClick={() => handlePick(tile)}
                                                style={{
                                                    width: TILE_SIZE,
                                                    height: "auto",
                                                    cursor: disabled ? "not-allowed" : "pointer",
                                                    opacity: disabled ? 0.3 : 1,
                                                    borderRadius: "4px",
                                                    border: used > 0 ? "2px solid #66ccff" : "1px solid #ddd",
                                                    boxSizing: "border-box",
                                                    userSelect: "none",
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {phase === "result" && result && (
                <div style={{ marginTop: "16px", width: "min(760px, 94vw)", textAlign: "center" }}>
                    {challenge && (
                        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#007BFF", marginBottom: "6px" }}>
                            第 {challenge.index + 1} / {challenge.rounds} 題 · 本題記憶用時 {(lastRoundMs / 1000).toFixed(2)} 秒
                        </div>
                    )}
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: result.perfect ? "#28a745" : "#dc3545" }}>
                        {result.perfect ? "全對！" : `答對 ${result.matched} / ${result.total} 張（${accuracy}%）`}
                    </div>

                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#555", marginTop: "14px" }}>正確答案</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", justifyContent: "center", marginTop: "4px" }}>
                        {target.map((tile, i) => (
                            <img
                                key={tile + i}
                                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                alt={tile}
                                draggable={false}
                                title={result.targetStatus[i] ? "有答對" : "漏掉"}
                                style={{
                                    width: TILE_SIZE,
                                    height: "auto",
                                    borderRadius: "5px",
                                    border: `2px solid ${result.targetStatus[i] ? "#28a745" : "#dc3545"}`,
                                    boxSizing: "border-box",
                                    userSelect: "none",
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#555", marginTop: "12px" }}>你的答案</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", justifyContent: "center", marginTop: "4px" }}>
                        {guess.map((tile, i) => (
                            <img
                                key={tile + i}
                                src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                alt={tile}
                                draggable={false}
                                title={result.guessStatus[i] ? "有答對" : "多選"}
                                style={{
                                    width: TILE_SIZE,
                                    height: "auto",
                                    borderRadius: "5px",
                                    border: `2px solid ${result.guessStatus[i] ? "#28a745" : "#dc3545"}`,
                                    boxSizing: "border-box",
                                    userSelect: "none",
                                }}
                            />
                        ))}
                    </div>

                    {!result.perfect && (
                        <div style={{ marginTop: "12px", fontSize: "15px", color: "#555", lineHeight: 1.8 }}>
                            {result.missing.length > 0 && (
                                <div>
                                    漏掉：<span style={{ color: "#dc3545", fontWeight: "bold" }}>{result.missing.join(" ")}</span>
                                </div>
                            )}
                            {result.extra.length > 0 && (
                                <div>
                                    多選：<span style={{ color: "#dc3545", fontWeight: "bold" }}>{result.extra.join(" ")}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
                        {!challenge && (
                            <button onClick={reviewAgain} style={secondaryButton}>
                                再記一次（2 秒）
                            </button>
                        )}
                        {challenge ? (
                            <button onClick={nextChallengeRound} style={primaryButton}>
                                下一題（第 {challenge.index + 2} / {challenge.rounds} 題）
                            </button>
                        ) : (
                            <button onClick={startRound} style={primaryButton}>
                                下一題
                            </button>
                        )}
                    </div>
                </div>
            )}

            {phase === "summary" && challengeResult && (
                <div style={{ marginTop: "16px", width: "min(760px, 94vw)", textAlign: "center" }}>
                    <div style={{ fontSize: "26px", fontWeight: "bold", color: "#007BFF" }}>挑戰完成！</div>
                    <div style={{ fontSize: "16px", color: "#555", marginTop: "4px" }}>
                        {tileCount} 張 · 共 {challengeResult.rounds} 題
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: "bold", color: "#28a745", marginTop: "10px" }}>
                        總準確率 {challengeResult.accuracy.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "17px", marginTop: "4px" }}>
                        答對 {challengeResult.matched} / {challengeResult.total} 張 · 總記憶時間 {(challengeResult.elapsedMs / 1000).toFixed(2)} 秒
                    </div>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "6px" }}>
                        {challengeResult.roundTimes.map((ms, i) => `第 ${i + 1} 題 ${(ms / 1000).toFixed(2)} 秒`).join(" · ")}
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
                        <button onClick={startChallenge} style={primaryButton}>
                            再挑戰一次
                        </button>
                        <button onClick={resetToIdle} style={secondaryButton}>
                            回到開始
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", marginTop: "22px" }}>
                        <LeaderboardTable title={`${boardTitle} · 準確率最高`} rows={topByAccuracy(boardEntries)} />
                        <LeaderboardTable title={`${boardTitle} · 最快`} rows={topByTime(boardEntries)} />
                    </div>
                </div>
            )}

            {mode === "normal" && (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginTop: "22px", fontSize: "15px", color: "#555" }}>
                    <span>已完成 {stats.played} 題</span>
                    <span>全對 {stats.perfect} 題</span>
                    <span>連續全對 {stats.streak} 次</span>
                    <span>最佳 {stats.best} 次</span>
                </div>
            )}
        </div>
    );
};

export default MemoryTrainer;
