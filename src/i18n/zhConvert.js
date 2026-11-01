// 繁體 → 簡體 的字對照表
// 只收錄本專案文案實際用到的字，避免整表過大。
// 若日後新增文案出現表格外的繁體字，該字會維持原樣（不會亂碼），
// 但也不會被轉換，需要把它補進下面的清單。
const PAIRS = `
進进 張张 數数 計计 點点 聽听 麼么 樣样 這这 個个 們们 時时 間间
開开 關关 於于 與与 為为 對对 錯错 誤误 確确 當当 從从 來来 會会
說说 請请 輸输 過过 還还 沒没 幾几 條条 總总 結结 給给 種种 類类
別别 後后 頭头 體体 發发 現现 實实 際际 應应 該该 無无 變变 換换
選选 擇择 認认 讓让 據据 顯显 動动 隱隐 設设 頁页 區区 刪删 連连
網网 線线 資资 讀读 儲储 傳传 敗败 優优 統统 復复 撤撤 銷销 話话
彈弹 窗窗 幫帮 檢检 載载 處处 執执 暫暂 繼继 續续 雖虽 將将 經经
裡里 邊边 內内 嗎吗 圓圆 寶宝 莊庄 閒闲 親亲 榮荣 嶺岭 搶抢 槓杠
順顺 斷断 盃杯 門门 滿满 貫贯 跳跳 倍倍 場场 棒棒 託托 捨舍 牆墙
餘余 飜翻 練练 習习 站站 么幺 壞坏 歲岁 準准 腳脚 參参 魚鱼 撈捞
擊击 圖图 細细 單单 騎骑 帶带 純纯 綠绿 蓮莲 燈灯 簡简 萬万 長长
`;

const T2S = new Map();
PAIRS.trim()
    .split(/\s+/)
    .forEach((pair) => {
        if (pair.length === 2) T2S.set(pair[0], pair[1]);
    });

// 轉成簡體；表格外的字原樣保留
export const toSimplified = (text) => Array.from(text).map((ch) => T2S.get(ch) ?? ch).join("");

// 目前語言："Hant" 繁體 / "Hans" 簡體
let current = "Hant";

// 每個文字節點的原文（切回繁體時用它還原，避免二次轉換失真）
const originals = new WeakMap();

const render = (node) => {
    if (!originals.has(node)) {
        originals.set(node, node.nodeValue);
    }
    const source = originals.get(node);
    const output = current === "Hans" ? toSimplified(source) : source;

    node.__converted = output; // 標記「這是我們寫的」，用来區分 React 的更新
    if (node.nodeValue !== output) {
        node.nodeValue = output;
    }
};

const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
        render(node);
        return;
    }
    // 標了 data-no-convert 的區塊不轉換（例如簡繁切換按鈕本身）
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-no-convert")) {
        return;
    }
    for (let child = node.firstChild; child; child = child.nextSibling) {
        walk(child);
    }
};

let observer = null;

// 切換語言，並在整個 #root 上套用（含之後才渲染出來的新節點）
export const setLanguage = (lang) => {
    current = lang === "Hans" ? "Hans" : "Hant";

    const root = document.getElementById("root");
    if (!root) return;

    if (!observer) {
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "characterData") {
                    const node = mutation.target;
                    // 忽略自己寫入造成的變動
                    if (node.nodeValue === node.__converted) continue;
                    originals.set(node, node.nodeValue); // React 換了文案，重記原文
                    render(node);
                } else {
                    mutation.addedNodes.forEach((added) => walk(added));
                }
            }
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    walk(root);
};
