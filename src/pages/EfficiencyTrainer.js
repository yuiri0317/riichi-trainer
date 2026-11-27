import { useEffect, useRef, useState } from "react";
import { loadSettings } from "../tools/settings";

// 下方點選盤：全部牌種（含赤寶），依花色分列
const PALETTE_TILES = {
    m: ["1m", "2m", "3m", "4m", "5m", "0m", "6m", "7m", "8m", "9m"],
    p: ["1p", "2p", "3p", "4p", "5p", "0p", "6p", "7p", "8p", "9p"],
    s: ["1s", "2s", "3s", "4s", "5s", "0s", "6s", "7s", "8s", "9s"],
    z: ["1z", "2z", "3z", "4z", "5z", "6z", "7z"],
};

const TILE_BACK = "0z";

// 把牌碼轉成中文名稱，錯誤提示用（例：3m → 三萬、0p → 赤五筒、1z → 東）
const SUIT_NAMES = { m: "萬", p: "筒", s: "索" };
const HONOR_NAMES = { 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" };
const NUM_NAMES = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九" };

const tileName = (tile) => {
    const suit = tile.slice(-1);
    const num = tile.replace(/\D/g, "");
    if (suit === "z") return HONOR_NAMES[num] || tile;
    if (num === "0") return `赤五${SUIT_NAMES[suit]}`;
    return `${NUM_NAMES[num] || num}${SUIT_NAMES[suit]}`;
};

// 開關按鈕：開＝藍底，關＝灰底（和自動理牌、記憶訓練一致）
// fontSize 由「設定」頁控制，預設 20px
const toggleStyle = (on, size = 20) => ({
    padding: "7px 15px",
    fontSize: `${size}px`,
    fontWeight: "bold",
    backgroundColor: on ? "#007BFF" : "#777777",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.3s ease",
});

// 操作按鈕（新的手牌 / 反悔）底色不同，但字級跟「各種按鈕大小」共用
const actionButtonStyle = (size, backgroundColor, disabled = false) => ({
    padding: "7px 15px",
    fontSize: `${size}px`,
    fontWeight: "bold",
    backgroundColor,
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.3s ease",
});

// 生成初始牌山
const generateTiles = () => {
    const types = ["m", "p", "s"];
    const tiles = [];

    // 處理數牌 (m/p/s)
    types.forEach((type) => {
        for (let num = 1; num <= 9; num++) {
            if (num === 5) {
                // 添加三張正常5和一個赤寶牌
                tiles.push(...Array(3).fill(`${num}${type}`));
                tiles.push(`0${type}`);
            } else {
                tiles.push(...Array(4).fill(`${num}${type}`));
            }
        }
    });

    // 處理字牌 (z)
    for (let num = 1; num <= 7; num++) {
        tiles.push(...Array(4).fill(`${num}z`));
    }

    return tiles;
};

// Fisher-Yates 洗牌算法
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

// 排序函數
const compareTiles = (a, b) => {
    const typeOrder = { m: 0, p: 1, s: 2, z: 3 };
    const aType = a.slice(-1);
    const aNum = a.replace(/\D/g, "");
    const aSortNum = aNum === "0" ? 5.5 : parseInt(aNum, 10);

    const bType = b.slice(-1);
    const bNum = b.replace(/\D/g, "");
    const bSortNum = bNum === "0" ? 5.5 : parseInt(bNum, 10);

    if (typeOrder[aType] !== typeOrder[bType]) {
        return typeOrder[aType] - typeOrder[bType];
    }
    return aSortNum - bSortNum;
};

const sortTiles = (tiles) => [...tiles].sort(compareTiles);

// 將手牌轉換為 tilesStr 格式（合併相同種類的牌）
const convertToTilesStr = (handTiles) => {
    const groupedTiles = { m: [], p: [], s: [], z: [] };

    handTiles.forEach((tile) => {
        const type = tile.slice(-1);
        const num = tile.replace(/\D/g, "");
        groupedTiles[type].push(num);
    });

    let result = "";
    Object.entries(groupedTiles).forEach(([type, nums]) => {
        if (nums.length > 0) {
            result += nums.sort((a, b) => (a === "0" ? 5 : a) - (b === "0" ? 5 : b)).join("") + type;
        }
    });

    return result;
};

// 將手牌轉換為 tiles34Arr 格式
const convertToTiles34Arr = (handTiles) => {
    const tiles34Arr = new Array(34).fill(0);

    handTiles.forEach((tile) => {
        const num = tile.replace(/\D/g, "");
        const type = tile.slice(-1);
        let index;

        if (type === "m") {
            index = num === "0" ? 4 : parseInt(num, 10) - 1;
        } else if (type === "p") {
            index = 9 + (num === "0" ? 4 : parseInt(num, 10) - 1);
        } else if (type === "s") {
            index = 18 + (num === "0" ? 4 : parseInt(num, 10) - 1);
        } else if (type === "z") {
            index = 27 + (parseInt(num, 10) - 1);
        }

        if (index !== undefined) {
            tiles34Arr[index]++;
        }
    });

    return tiles34Arr;
};

// 統計牌山剩餘的牌，並按 m → p → s → z 排序
const countRemainingTiles = (tilesWall) => {
    const countMap = {};

    tilesWall.forEach((tile) => {
        if (!countMap[tile]) {
            countMap[tile] = 0;
        }
        countMap[tile]++;
    });

    // 按 m → p → s → z 排序
    const sortedTiles = Object.keys(countMap).sort((a, b) => {
        const typeOrder = { m: 0, p: 1, s: 2, z: 3 };
        const aType = a.slice(-1);
        const bType = b.slice(-1);
        const aNum = a.replace(/\D/g, "");
        const bNum = b.replace(/\D/g, "");

        if (typeOrder[aType] !== typeOrder[bType]) {
            return typeOrder[aType] - typeOrder[bType];
        }
        return (aNum === "0" ? 5 : aNum) - (bNum === "0" ? 5 : bNum);
    });

    const sortedCountMap = {};
    sortedTiles.forEach((tile) => {
        sortedCountMap[tile] = countMap[tile];
    });

    return sortedCountMap;
};

function EfficiencyTrainer() {
    const [tilesWall, setTilesWall] = useState([]);
    const [handTiles, setHandTiles] = useState([]);
    const [discardedTiles, setDiscardedTiles] = useState([]);
    const [tilesStr, setTilesStr] = useState("");
    const [tiles34Arr, setTiles34Arr] = useState([]);
    const [remainingTilesCount, setRemainingTilesCount] = useState({});
    const [shantenNum, setShantenNum] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [improvementResults, setImprovementResults] = useState({});
    const [lastDiscardResult, setLastDiscardResult] = useState(null);
    const [discardAnsList, setDiscardAnsList] = useState([]);

    const [isCalculating, setIsCalculating] = useState(false);
    const [isDiscard, setIsDiscard] = useState(true);
    const [isShanten, setIsShanten] = useState(false);
    const [isCalculatedList, setIsCalculatingList] = useState(false);
    const [isTileWall, setIsTileWall] = useState(false);
    const [autoSort, setAutoSort] = useState(true); // 是否自動理牌
    const [previousAutoSort, setPreviousAutoSort] = useState(true); // 切牌前手牌是否自動理牌（獨立開關）
    const [previousHand, setPreviousHand] = useState([]); // 切牌前的手牌
    const [lastDiscardIndex, setLastDiscardIndex] = useState(null); // 切掉的是第幾張
    const [history, setHistory] = useState([]); // 每次切牌前的狀態快照，供「反悔」使用
    const [undoCount, setUndoCount] = useState(0); // 本局已反悔次數
    const [showPreviousHand, setShowPreviousHand] = useState(true); // 是否顯示切牌前的手牌
    const [coverHand, setCoverHand] = useState(false); // 蓋牌：手牌只顯示牌背，只有剛摸的牌顯示牌面
    const [coverErrorCount, setCoverErrorCount] = useState(0); // 蓋牌模式點錯（手牌裡沒有）的次數
    const [toast, setToast] = useState(null); // 錯誤提示
    const toastTimer = useRef(null);

    // 牌面尺寸：讀「設定」頁的值（預設 38px，和手牌算點一樣大）
    const [tileSizes, setTileSizes] = useState(loadSettings);

    // 從設定頁回來、或另一個分頁改了設定時，跟著更新
    // （storage 事件涵蓋其他分頁；focus 涵蓋切回這個視窗）
    useEffect(() => {
        const sync = () => setTileSizes(loadSettings());
        window.addEventListener("storage", sync);
        window.addEventListener("focus", sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("focus", sync);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, []);

    useEffect(() => {
        initializeGame();
    }, []);

    const initializeGame = () => {
        const allTiles = generateTiles();
        shuffleArray(allTiles);

        const initialHand = allTiles.splice(0, 14);
        const sortedHand = sortTiles(initialHand.slice(0, 13));
        const newHandTiles = [...sortedHand, initialHand[13]];

        setHandTiles(newHandTiles);
        setTilesWall(allTiles);
        updateTilesState(newHandTiles);
        setRemainingTilesCount(countRemainingTiles(allTiles));
        calculateImprovements(newHandTiles, allTiles);
    };

    const updateTilesState = (handTiles) => {
        const newTilesStr = convertToTilesStr(handTiles);
        const newTiles34Arr = convertToTiles34Arr(handTiles);

        setTilesStr(newTilesStr);
        setTiles34Arr(newTiles34Arr);
        setShantenNum(calculateShanten(newTiles34Arr));
    };

    const handleTileClick = async (clickedTile, index) => {
        // 先取得當前分析結果用於判斷
        const currentResults = improvementResults;

        // 先把「切牌前」的完整狀態存起來，供反悔還原（最多保留 50 步）
        setHistory((h) => [
            ...h.slice(-49),
            {
                handTiles,
                tilesWall,
                discardedTiles,
                tilesStr,
                tiles34Arr,
                shantenNum,
                improvementResults,
                lastDiscardResult,
                discardAnsList,
                previousHand,
                lastDiscardIndex,
                remainingTilesCount,
            },
        ]);

        // 記錄切牌前的手牌，供畫面顯示
        setPreviousHand(handTiles);
        setLastDiscardIndex(index);

        // 移除被點擊的牌
        const newHand = handTiles.filter((_, i) => i !== index);

        // 先判斷出牌選擇
        evaluateDiscardChoice(clickedTile, currentResults);

        // 更新已打出牌狀態
        setDiscardedTiles((prev) => [...prev, clickedTile]);

        if (tilesWall.length === 0) {
            setHandTiles(newHand);
            updateTilesState(newHand);
            return;
        }

        // 從牌山抽取新牌
        const [newTile, ...remainingTiles] = tilesWall;
        // 自動理牌開啟時排序；關閉時保留原本手牌順序，新牌仍接在最後
        const sortedNewHand = autoSort ? sortTiles(newHand) : newHand;
        const updatedHandTiles = [...sortedNewHand, newTile];

        // 更新手牌和牌山
        setHandTiles(updatedHandTiles);
        setTilesWall(remainingTiles);
        setRemainingTilesCount(countRemainingTiles(remainingTiles));
        updateTilesState(updatedHandTiles);

        // 計算新的分析結果
        const newResults = await calculateImprovements(updatedHandTiles, remainingTiles);
        setImprovementResults(newResults);
    };

    const evaluateDiscardChoice = (discardedTile, results) => {
        const maxCount = Math.max(...Object.values(results).map((d) => d.totalCount));

        if (!results[discardedTile]) {
            // 出牌不在改進列表中
            const bestChoices = Object.entries(results)
                .filter(([_, data]) => data.totalCount === Math.max(...Object.values(results).map((d) => d.totalCount)))
                .map(([tile]) => tile);

            setLastDiscardResult({
                type: "invalid",
                message: "錯誤！該次切牌退向聽",
                bestChoices,
                discardedTile,
                maxCount,
            });

            setDiscardAnsList([...discardAnsList, "invalid"]);

            return;
        } // 找出最大進張數

        const currentCount = results[discardedTile].totalCount;

        if (currentCount === maxCount) {
            // 最佳選擇
            const sameCountChoices = Object.entries(results)
                .filter(([_, data]) => data.totalCount === maxCount)
                .map(([tile]) => tile);

            setLastDiscardResult({
                type: "best",
                message: "正確！這是最多進張的選擇",
                sameCountChoices,
                discardedTile,
                maxCount,
            });

            setDiscardAnsList([...discardAnsList, "best"]);
        } else {
            // 非最佳選擇
            const bestChoices = Object.entries(results)
                .filter(([_, data]) => data.totalCount === maxCount)
                .map(([tile]) => tile);

            setLastDiscardResult({
                type: "suboptimal",
                message: "該次切牌並非最多進張",
                bestChoices,
                discardedTile,
                currentCount,
                maxCount,
            });

            setDiscardAnsList([...discardAnsList, "suboptimal"]);
        }
    };

    const handleTileHover = (index) => {
        setHoveredIndex(index);
    };

    const calculateShanten = (tiles34Arr) => {
        const Shanten = require("../tools/Shanten");
        const shanten = new Shanten();
        return shanten.calculateShanten(tiles34Arr);
    };

    const analyzeImprovement = (currentHand, currentTiles34, discardedTiles, tilesWall) => {
        const results = {};
        const allTiles = generateTiles();
        const initialCountMap = allTiles.reduce((acc, tile) => {
            acc[tile] = (acc[tile] || 0) + 1;
            return acc;
        }, {});

        // 扣除已使用牌
        const usedTiles = [...currentHand, ...discardedTiles];
        usedTiles.forEach((tile) => {
            initialCountMap[tile] = (initialCountMap[tile] || 0) - 1;
        });

        // 主分析邏輯
        currentHand.forEach((tileToDiscard, discardIndex) => {
            const newHand = currentHand.filter((_, i) => i !== discardIndex);
            const newTiles34 = convertToTiles34Arr(newHand);
            const originalShanten = calculateShanten(currentTiles34);

            const improvements = {};
            let totalCount = 0;

            Object.keys(initialCountMap).forEach((tile) => {
                if (initialCountMap[tile] <= 0) return;

                // 模擬摸牌
                const tempHand = [...newHand, tile];
                const tempTiles34 = convertToTiles34Arr(tempHand);
                const newShanten = calculateShanten(tempTiles34);

                if (newShanten < originalShanten) {
                    const count = initialCountMap[tile];

                    if (count > 0) {
                        improvements[tile] = count;
                        totalCount += count;
                    }
                }
            });

            if (Object.keys(improvements).length > 0) {
                results[tileToDiscard] = {
                    improvements,
                    totalCount,
                };
            }
        });

        return results;
    };

    const calculateImprovements = async (currentHand, currentWall) => {
        setIsCalculating(true);
        const results = await new Promise((resolve) => {
            setTimeout(() => {
                resolve(analyzeImprovement(currentHand, convertToTiles34Arr(currentHand), discardedTiles, currentWall));
            }, 0);
        });

        setImprovementResults(results);
        setIsCalculating(false);

        return results;
    };

    const ResultDisplay = ({ results }) => {
        const sortedResults = Object.entries(results)
            .map(([discarded, data]) => ({ discarded, data }))
            .sort((a, b) => b.data.totalCount - a.data.totalCount);

        return (
            <div style={{ marginTop: "20px" }}>
                {sortedResults.map(({ discarded, data }) => (
                    <div key={discarded} style={{ marginBottom: "5px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ fontWeight: "bold", marginRight: "5px", marginBottom: "22px" }}>切</div>
                            <img src={`${process.env.PUBLIC_URL}/images/${discarded}.png`} alt={discarded} style={{ width: "30px", height: "auto", marginBottom: "22px", marginRight: "10px" }} />
                            <div style={{ fontWeight: "bold", marginRight: "5px", marginBottom: "22px" }}>{shantenNum === 0 ? <div>聽</div> : <div>摸</div>}</div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0px" }}>
                                {Object.entries(data.improvements).map(([tile, count]) => (
                                    <div key={tile} style={{ textAlign: "center" }}>
                                        <img src={`${process.env.PUBLIC_URL}/images/${tile}.png`} alt={tile} style={{ width: "30px", height: "auto" }} />
                                        <div style={{ fontSize: "14px" }}>×{count}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", marginLeft: "10px", marginRight: "5px", marginBottom: "22px" }}>{data.totalCount}張</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const DiscardResultDisplay = ({ result }) => {
        if (!result) return null;

        return (
            <div
                style={{
                    marginTop: "10px",
                    padding: "15px",
                    border: "2px solid",
                    borderColor: result.type === "best" ? "#28a745" : result.type === "suboptimal" ? "#ffc107" : "#dc3545",
                    borderRadius: "5px",
                    backgroundColor: result.type === "best" ? "#d4edda" : result.type === "suboptimal" ? "#fff3cd" : "#f8d7da",
                }}
            >
                <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px", textAlign: "center" }}>{result.message}</div>

                {result.type === "best" && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <img key={result.discardedTile} src={`${process.env.PUBLIC_URL}/images/${result.discardedTile}.png`} alt={result.discardedTile} style={{ width: "30px", height: "auto" }} />
                            <div style={{ fontSize: "16px", fontWeight: "bold", marginLeft: "10px" }}>{result.maxCount}張</div>
                        </div>

                        {sortTiles(result.sameCountChoices).length >= 2 && (
                            <>
                                <div style={{ marginBottom: "10px", marginTop: "10px" }}>其他最大進張數：</div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "1px",
                                        flexWrap: "wrap",
                                        justifyContent: "center", // 水平置中
                                        alignItems: "center", // 垂直置中
                                    }}
                                >
                                    {sortTiles(result.sameCountChoices)
                                        .filter((tile) => tile !== result.discardedTile)
                                        .map((tile) => (
                                            <img key={tile} src={`${process.env.PUBLIC_URL}/images/${tile}.png`} alt={tile} style={{ width: "30px", height: "auto" }} />
                                        ))}
                                    <div style={{ fontSize: "16px", fontWeight: "bold", marginLeft: "10px" }}>{result.maxCount}張</div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {result.type === "suboptimal" && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <img key={result.discardedTile} src={`${process.env.PUBLIC_URL}/images/${result.discardedTile}.png`} alt={result.discardedTile} style={{ width: "30px", height: "auto" }} />
                            <div style={{ fontSize: "16px", fontWeight: "bold", marginLeft: "10px" }}>{result.currentCount}張</div>
                        </div>
                        <div style={{ marginBottom: "10px", marginTop: "10px" }}>最多進張切牌：</div>
                        <div
                            style={{
                                display: "flex",
                                gap: "1px",
                                flexWrap: "wrap",
                                justifyContent: "center", // 水平置中
                                alignItems: "center", // 垂直置中
                                marginTop: "5px",
                            }}
                        >
                            {sortTiles(result.bestChoices).map((tile) => (
                                <img key={tile} src={`${process.env.PUBLIC_URL}/images/${tile}.png`} alt={tile} style={{ width: "30px", height: "auto" }} />
                            ))}
                            <div style={{ fontSize: "16px", fontWeight: "bold", marginLeft: "10px" }}>{result.maxCount}張</div>
                        </div>
                    </div>
                )}

                {result.type === "invalid" && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <img key={result.discardedTile} src={`${process.env.PUBLIC_URL}/images/${result.discardedTile}.png`} alt={result.discardedTile} style={{ width: "30px", height: "auto" }} />
                        </div>

                        {result.maxCount !== -Infinity && (
                            <>
                                <div style={{ marginBottom: "10px", marginTop: "10px" }}>最多進張切牌：</div>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "1px",
                                        flexWrap: "wrap",
                                        justifyContent: "center", // 水平置中
                                        alignItems: "center", // 垂直置中
                                    }}
                                >
                                    {sortTiles(result.bestChoices).map((tile) => (
                                        <img key={tile} src={`${process.env.PUBLIC_URL}/images/${tile}.png`} alt={tile} style={{ width: "30px", height: "auto" }} />
                                    ))}
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: "bold",
                                            marginLeft: "10px",
                                        }}
                                    >
                                        {result.maxCount}張
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const resetGame = () => {
        const allTiles = generateTiles();
        shuffleArray(allTiles);

        const initialHand = allTiles.splice(0, 14);
        const sortedHand = autoSort ? sortTiles(initialHand.slice(0, 13)) : initialHand.slice(0, 13);
        const newHandTiles = [...sortedHand, initialHand[13]];

        // 重置所有相關狀態
        setTilesWall(allTiles);
        setHandTiles(newHandTiles);
        setDiscardedTiles([]);
        setTilesStr("");
        setTiles34Arr([]);
        setRemainingTilesCount(countRemainingTiles(allTiles));
        setShantenNum(null);
        setHoveredIndex(null);
        setImprovementResults({});
        setLastDiscardResult(null);
        setDiscardAnsList([]);
        setPreviousHand([]);
        setLastDiscardIndex(null);
        setHistory([]);
        setUndoCount(0);
        setCoverErrorCount(0);
        setToast(null);
        if (toastTimer.current) clearTimeout(toastTimer.current);

        updateTilesState(newHandTiles);
        calculateImprovements(newHandTiles, allTiles);
    };

    // 切換自動理牌：從關切到開時，立刻把當前手牌整理一次（剛摸的那張維持在最右邊）
    const toggleAutoSort = () => {
        const next = !autoSort;
        setAutoSort(next);

        if (next && handTiles.length === 14) {
            setHandTiles([...sortTiles(handTiles.slice(0, 13)), handTiles[13]]);
        }
    };

    // 顯示錯誤提示，幾秒後自動消失
    const showToast = (text) => {
        setToast(text);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    };

    // 蓋牌模式：開啟時自動關閉自動理牌
    const toggleCoverHand = () => {
        const next = !coverHand;
        setCoverHand(next);
        if (next && autoSort) setAutoSort(false);
    };

    // 從下方完整牌種點選切牌；手牌裡沒有這張就記一次錯誤
    // 赤寶（0m/0p/0s）先找同名赤寶，沒有再退回一般 5（5m/5p/5s）
    const handlePaletteDiscard = (tile) => {
        let index = handTiles.indexOf(tile);
        let matchedTile = tile;

        if (index < 0 && /^0[mps]$/.test(tile)) {
            const five = `5${tile.slice(-1)}`;
            const fiveIndex = handTiles.indexOf(five);
            if (fiveIndex >= 0) {
                index = fiveIndex;
                matchedTile = five;
            }
        }

        if (index < 0) {
            setCoverErrorCount((count) => count + 1);
            showToast(`手牌裡沒有 ${tileName(tile)}，記一次錯誤`);
            return;
        }

        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(null);
        handleTileClick(matchedTile, index);
    };

    // 反悔：回到上一次切牌前的完整狀態（可連續回退）
    const undoLastDiscard = () => {
        if (history.length === 0) return;

        const prev = history[history.length - 1];
        setHistory((h) => h.slice(0, -1));
        setUndoCount((c) => c + 1);

        setHandTiles(prev.handTiles);
        setTilesWall(prev.tilesWall);
        setDiscardedTiles(prev.discardedTiles);
        setTilesStr(prev.tilesStr);
        setTiles34Arr(prev.tiles34Arr);
        setShantenNum(prev.shantenNum);
        setImprovementResults(prev.improvementResults);
        setLastDiscardResult(prev.lastDiscardResult);
        setDiscardAnsList(prev.discardAnsList);
        setPreviousHand(prev.previousHand);
        setLastDiscardIndex(prev.lastDiscardIndex);
        setRemainingTilesCount(prev.remainingTilesCount);
        setHoveredIndex(null);
    };

    // 切牌前的顯示順序：獨立控制是否自動理牌，紅框仍跟著被切掉的那張
    const previousRows = (() => {
        const rows = previousHand.map((tile, index) => ({ tile, index }));
        return previousAutoSort ? rows.sort((a, b) => compareTiles(a.tile, b.tile)) : rows;
    })();

    return (
        <div className="container" style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {toast && (
                <div
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        padding: "12px 22px",
                        borderRadius: "10px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        fontSize: "18px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {toast}
                </div>
            )}
            <div style={{ fontSize: "clamp(28px, 2vw, 32px)", fontWeight: "bold" }}>牌效率何切練習</div>

            {shantenNum !== null && (
                <div style={{ fontSize: "20px", marginTop: "20px", textAlign: "center" }}>
                    {shantenNum === -1 ? (
                        <div
                            style={{
                                fontWeight: "bold",
                                color: "#FFFFFF",
                                background: "#FF0000", // 紅色背景
                                padding: "7px 15px",
                                borderRadius: "10px",
                                display: "inline-block",
                            }}
                        >
                            和牌!!
                        </div>
                    ) : shantenNum === 0 ? (
                        <div
                            style={{
                                fontWeight: "bold",
                                color: "#FFFFFF",
                                background: "#007BFF", // 藍色背景
                                padding: "7px 15px",
                                borderRadius: "10px",
                                display: "inline-block",
                            }}
                        >
                            聽牌
                        </div>
                    ) : isShanten === true ? (
                        <div
                            style={{
                                fontWeight: "bold",
                                color: "#FFFFFF",
                                background: "#777777",
                                padding: "7px 15px",
                                borderRadius: "10px",
                                display: "inline-block",
                            }}
                        >
                            {shantenNum} 向聽
                        </div>
                    ) : (
                        <div
                            style={{
                                fontWeight: "bold",
                                color: "#FFFFFF",
                                background: "#777777",
                                padding: "7px 15px",
                                borderRadius: "10px",
                                display: "inline-block",
                            }}
                        >
                            未聽牌
                        </div>
                    )}
                </div>
            )}

            <div className="hand-tiles" style={{ display: "flex", flexWrap: "wrap", gap: "0px", marginTop: "10px" }}>
                {handTiles.map((tile, index) => {
                    // 蓋牌時只有剛摸的那張（最後一張）顯示牌面
                    const isDrawn = index === 13 && handTiles.length === 14;
                    const faceDown = coverHand && !isDrawn;
                    return (
                        <img
                            key={`${tile}-${index}`}
                            src={`${process.env.PUBLIC_URL}/images/${faceDown ? TILE_BACK : tile}.png`}
                            alt={faceDown ? "牌背" : tile}
                            // 蓋牌時也可以直接點上面的牌背切牌（位置就是那張牌）
                            onClick={() => handleTileClick(tile, index)}
                            onMouseEnter={() => handleTileHover(index)}
                            onMouseLeave={() => handleTileHover(null)}
                            title={faceDown ? "點這張牌背切掉它（也可以從下方牌組選）" : undefined}
                            style={{
                                cursor: "pointer",
                                width: `${tileSizes.handTileSize}px`,
                                maxWidth: `${tileSizes.handTileSize}px`,
                                height: "auto",
                                borderRadius: "5px",
                                transition: "all 0.2s ease",
                                transform: hoveredIndex === index ? "translateY(-5px)" : "none",
                                marginLeft: index === 13 ? "5px" : "0px", // 第 14 張（索引 13）前加入間隔
                            }}
                        />
                    );
                })}
            </div>

            <div style={{ fontSize: "20px", marginTop: "5px" }}>{coverHand ? "手牌：已蓋牌" : `手牌：${tilesStr}`}</div>

            {coverHand && (
                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "1px", alignItems: "center" }}>
                    <div style={{ fontSize: "16px", color: "#666666", marginBottom: "6px" }}>
                        點上面的牌背或下面的牌都可以切牌；手牌裡沒有這張會記一次錯誤
                    </div>
                    {["m", "p", "s", "z"].map((suit) => (
                        <div key={suit} style={{ display: "flex", gap: "0px", justifyContent: "center", flexWrap: "wrap" }}>
                            {PALETTE_TILES[suit].map((tile) => (
                                <img
                                    key={tile}
                                    src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                    alt={tile}
                                    onClick={() => handlePaletteDiscard(tile)}
                                    style={{
                                        width: `${tileSizes.paletteTileSize}px`,
                                        maxWidth: `${tileSizes.paletteTileSize}px`,
                                        height: "auto",
                                        cursor: "pointer",
                                        borderRadius: "5px",
                                        boxSizing: "border-box",
                                        border: "2px solid transparent",
                                        transition: "transform 0.15s ease",
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {showPreviousHand && previousHand.length > 0 && (
                <div
                    style={{
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: "2px",
                        opacity: 0.8,
                    }}
                >
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#666666", marginRight: "8px" }}>切牌前：</span>
                    {previousRows.map(({ tile, index }) => (
                        <img
                            key={`prev-${tile}-${index}`}
                            // 蓋牌模式下「切牌前」也只顯示牌背，否則會把答案漏出來
                            src={`${process.env.PUBLIC_URL}/images/${coverHand ? TILE_BACK : tile}.png`}
                            alt={coverHand ? "牌背" : tile}
                            style={{
                                width: `${tileSizes.handTileSize}px`,
                                maxWidth: `${tileSizes.handTileSize}px`,
                                height: "auto",
                                borderRadius: "5px",
                                boxSizing: "border-box",
                                border: index === lastDiscardIndex ? "2px solid #dc3545" : "2px solid transparent",
                            }}
                        />
                    ))}
                </div>
            )}

            <div style={{ marginTop: "10px", display: "flex", gap: "15px", flexWrap: "wrap", justifyContent: "center" }}>
                <button type="button" onClick={() => setIsDiscard(!isDiscard)} style={toggleStyle(isDiscard, tileSizes.efficiencyButtonSize)}>
                    顯示切牌：{isDiscard ? "開" : "關"}
                </button>
                <button type="button" onClick={() => setIsShanten(!isShanten)} style={toggleStyle(isShanten, tileSizes.efficiencyButtonSize)}>
                    顯示向聽數：{isShanten ? "開" : "關"}
                </button>
                <button type="button" onClick={() => setIsCalculatingList(!isCalculatedList)} style={toggleStyle(isCalculatedList, tileSizes.efficiencyButtonSize)}>
                    顯示進張（聽牌）列表：{isCalculatedList ? "開" : "關"}
                </button>
                <button type="button" onClick={() => setShowPreviousHand(!showPreviousHand)} style={toggleStyle(showPreviousHand, tileSizes.efficiencyButtonSize)}>
                    顯示切牌前：{showPreviousHand ? "開" : "關"}
                </button>
                <button
                    type="button"
                    onClick={() => setPreviousAutoSort(!previousAutoSort)}
                    style={toggleStyle(previousAutoSort, tileSizes.efficiencyButtonSize)}
                    title="只控制上方「切牌前」手牌的排列，不影響目前手牌的自動理牌"
                >
                    切牌前理牌：{previousAutoSort ? "開" : "關"}
                </button>
                <button
                    type="button"
                    onClick={toggleCoverHand}
                    style={toggleStyle(coverHand, tileSizes.efficiencyButtonSize)}
                    title="開啟後手牌只顯示牌背（剛摸的牌例外），並自動關閉自動理牌；下方可用全部牌種點選切牌"
                >
                    蓋牌：{coverHand ? "開" : "關"}
                </button>
            </div>

            <div
                style={{
                    margin: "10px 0",
                    display: "flex",
                    gap: "15px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                }}
            >
                <button onClick={resetGame} style={actionButtonStyle(tileSizes.efficiencyButtonSize, "#007BFF")}>
                    新的手牌
                </button>
                <button
                    onClick={toggleAutoSort}
                    title="關閉後，手牌會保留你目前的排列順序，新摸的牌仍接在最右邊"
                    style={toggleStyle(autoSort, tileSizes.efficiencyButtonSize)}
                >
                    {autoSort ? "自動理牌：開" : "自動理牌：關"}
                </button>
                <button
                    onClick={undoLastDiscard}
                    disabled={history.length === 0}
                    title="回到上一次切牌前的狀態，可連續回退"
                    style={actionButtonStyle(tileSizes.efficiencyButtonSize, history.length === 0 ? "#cccccc" : "#dc3545", history.length === 0)}
                >
                    反悔{history.length > 0 ? `（${history.length}）` : ""}
                </button>
                <span
                    style={{
                        alignSelf: "center",
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: undoCount > 0 ? "#dc3545" : "#999999",
                    }}
                >
                    本局反悔：{undoCount} 次
                </span>
                {coverHand && (
                    <span
                        style={{
                            alignSelf: "center",
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: coverErrorCount > 0 ? "#dc3545" : "#999999",
                        }}
                    >
                        本局錯誤：{coverErrorCount} 次
                    </span>
                )}
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "center", // 水平置中
                    alignItems: "flex-start", // 垂直對齊到頂端
                    gap: "20px", // 設定間距
                    flexWrap: "wrap", // 當空間不足時換行
                }}
            >
                {lastDiscardResult && <DiscardResultDisplay result={lastDiscardResult} />}

                {isDiscard && discardedTiles.length > 0 && (
                    <div
                        style={{
                            padding: "15px",
                            border: "1px solid",
                            borderColor: "#888888",
                            borderRadius: "5px",
                            backgroundColor: "#FDFDFD",
                            marginTop: "10px",
                        }}
                    >
                        {discardedTiles.length > 0 && (
                            <>
                                <div
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: "bold",
                                        textAlign: "center",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    切牌列表
                                </div>
                                <div
                                    style={{
                                        fontSize: "16px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        textAlign: "center",
                                    }}
                                >
                                    正確率：{discardAnsList.filter((status) => status === "best").length} / {discardedTiles.length} (
                                    {((discardAnsList.filter((status) => status === "best").length / discardedTiles.length) * 100).toFixed(2)} %)
                                </div>
                            </>
                        )}

                        <div
                            className="discarded-tiles"
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(5, auto)", // 每列 5 個元素
                                gap: "5px", // 設定間距
                                marginTop: "10px",
                                justifyContent: "center", // 水平置中
                                alignItems: "center", // 垂直置中
                            }}
                        >
                            {discardedTiles.map((tile, index) => {
                                const status = discardAnsList[index]; // 取得該 index 的狀態
                                const borderColor = status === "best" ? "#28a745" : status === "suboptimal" ? "#ffc107" : status === "invalid" ? "#dc3545" : "transparent"; // 預設無色
                                const backgroundColor = status === "best" ? "#d4edda" : status === "suboptimal" ? "#fff3cd" : status === "invalid" ? "#f8d7da" : "transparent";

                                return (
                                    <div
                                        key={`discarded-wrapper-${tile}-${index}`}
                                        style={{
                                            display: "inline-block",
                                            padding: "4px 4px 0px 4px",
                                            backgroundColor,
                                            borderColor,
                                            borderWidth: "2px",
                                            borderStyle: "solid",
                                            borderRadius: "5px", // 圓角
                                        }}
                                    >
                                        <img
                                            key={`discarded-${tile}-${index}`}
                                            src={`${process.env.PUBLIC_URL}/images/${tile}.png`}
                                            alt={tile}
                                            style={{
                                                width: "30px",
                                                height: "auto",
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {isCalculatedList && shantenNum !== -1 && (
                <div
                    style={{
                        padding: "10px",
                        border: "1px solid",
                        borderColor: "#888888",
                        borderRadius: "5px",
                        backgroundColor: "#FDFDFD",
                        marginTop: "10px",
                    }}
                >
                    <div style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>{shantenNum === -1 ? null : shantenNum === 0 ? <div>聽牌列表</div> : <div>進張列表</div>}</div>
                    {isCalculating ? <div>計算中...</div> : Object.keys(improvementResults).length > 0 ? <ResultDisplay results={improvementResults} /> : <div></div>}
                </div>
            )}

            {isTileWall && (
                <div
                    style={{
                        padding: "15px",
                        border: "1px solid",
                        borderColor: "#888888",
                        borderRadius: "5px",
                        backgroundColor: "#FDFDFD",
                        marginTop: "10px",
                    }}
                >
                    <div style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center" }}>牌山剩餘的牌 ({tilesWall.length}張)</div>

                    {/* 牌的排列區域 */}
                    <div
                        className="remaining-tiles"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(10, auto)", // 每行10個
                            gap: "5px", // 設定間距
                            marginTop: "10px",
                            justifyContent: "center", // 水平置中
                            alignItems: "center", // 垂直置中
                        }}
                    >
                        {Object.entries(remainingTilesCount).map(([tile, count]) => (
                            <div key={tile} style={{ textAlign: "center" }}>
                                <img src={`${process.env.PUBLIC_URL}/images/${tile}.png`} alt={tile} style={{ width: "30px", height: "auto" }} />
                                <div style={{ fontSize: "14px", marginTop: "2px" }}>×{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default EfficiencyTrainer;
