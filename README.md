# 立直麻將練習

日麻（立直麻將）的離線練習工具。純前端，所有計算都在瀏覽器裡完成，不需要後端、不需要連網。

## 功能

| 頁面 | 說明 |
|---|---|
| 進張數計算 | 輸入手牌，算出切哪張進張最多 |
| 牌效率何切 | 隨機出題的切牌練習（自動理牌可開關、支援反悔、顯示切牌前手牌） |
| 清一色何切 / 清一色聽牌 | 清一色專項練習 |
| 點數計算 | 飜＋符 → 點數（含青天井規則） |
| 符數計算 | 隨機牌型的符數練習 |
| **手牌算點** | 輸入完整手牌自動判定役種、飜數、符數、點數 |

手牌算點支援：

- 門前 14 張，或帶副露（吃／碰／明槓／暗槓）
- 副露語法：`123m`＝吃、`111p`＝碰、`1111s`＝明槓、`1111s-`＝暗槓；`123123123m` 會切成三個順子，不會被重排成 `111222333`
- 自摸／榮和、親家／子家、立直／雙立直／一發、天和／地和、海底／河底、嶺上開花、搶槓
- 寶牌：手填張數，或點選指示牌自動換算（含赤寶牌）
- 可展開符數明細，看到每一項加符與進位過程

## 開發

```bash
npm install
npm start          # http://localhost:3000
```

## 測試

算點引擎與副露解析有回歸測試（27 個）：

```bash
npm test -- --watchAll=false --runInBand
```

`--runInBand` 是必要的，否則 jest 會 fork 子程序，在部分受限環境會 `spawn EPERM`。

## 建置

```bash
npm run build      # 產出 build/
```

`build/` 是純靜態檔案，可以直接丟到任何靜態主機（GitHub Pages / Netlify / Cloudflare Pages）。

## 桌面版（Windows）

```powershell
.\scripts\build-desktop.ps1
```

會依序安裝依賴、建置前端、用 electron-builder 打包出 NSIS 安裝檔（`dist\立直麻將練習 Setup 0.1.0.exe`）。
所有下載都會落在專案目錄下的 `.npm-cache` / `.cache`，不污染系統槽。

## PWA

`public/sw.js` + `public/manifest.json` 已就緒。部署到 HTTPS 後，手機瀏覽器可以「加到主畫面」，
裝完有圖示、全屏執行、斷網可用。Service Worker 只在 production 建置註冊，`npm start` 不受影響。

## 授權與來源

### 本專案自行撰寫的部分

以下程式碼由本專案獨立完成，採用 [MIT 授權](https://opensource.org/licenses/MIT)，可自由使用、修改、再分發（保留著作權聲明即可）：

| 範圍 | 內容 |
|---|---|
| `src/tools/Score.js`、`src/tools/meldParser.js` | 算點引擎、副露解析（含 27 個回歸測試） |
| `src/pages/HandScoreCalculator.js` | 手牌算點頁面 |
| `src/i18n/` | 繁簡轉換 |
| `electron/`、`public/sw.js`、`public/manifest.json` | 桌面版封裝、PWA |
| `scripts/`、`.github/workflows/` | 打包與部署腳本 |
| 各頁面新增的功能 | 自動理牌開關、反悔與計數、切牌前回顯、副露輸入、寶牌指示牌等 |

### 沿用自上游的部分

介面結構、牌效率演算法與 `public/images/` 內的牌面圖片，
改作自 [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)。
**該專案未附授權條款**，因此這部分沒有明確的使用許可。

若你要複製、修改或再分發本專案，請注意：

- 上述 MIT 授權**只涵蓋本專案自行撰寫的部分**
- 上游部分請自行判斷風險；商用或大規模再分發前，建議先取得原作者同意，或全部重寫

### 牌面圖片

`public/images/` 內的牌面圖非本專案原創。若需要可安全再分發的替代方案，
可改用公有領域素材，例如 [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)（CC0，可商用）。

