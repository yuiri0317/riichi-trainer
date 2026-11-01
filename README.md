# 立直麻將練習

日麻（立直麻將）的離線練習工具。純前端，所有計算都在瀏覽器裡完成，不需要後端、不需要連網。

> **聲明**
>
> 這是一個**個人學習用途的非商業專案**，與任何麻將遊戲廠商、開源專案作者均無隸屬或背書關係。
>
> - 介面結構與牌面圖片改作自 [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)，該專案未附授權條款；本專案保留出處標註，若原作者認為不妥，請[開 issue](https://github.com/yuiri0317/riichi-trainer/issues) 告知，會立即下架相關內容
> - 本專案**不收取任何費用**、無廣告、無商業行為
> - 軟體按「現狀」提供，不對任何計算結果的正確性作擔保；用於實戰前請自行核對
> - 「立直」「麻雀」「Riichi Mahjong」等為通用名詞，相關商標權利歸各自所有者
>
> 詳細的授權範圍見文末[授權與來源](#授權與來源)。

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

### 致謝

- [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)：本專案的起點，介面與牌面圖片皆源於此
- [tomohxx/shanten-number](https://github.com/tomohxx)：進張數與向聽數演算法的原始出處
- [Create React App](https://create-react-app.dev/)、[Electron](https://www.electronjs.org/)、[electron-builder](https://www.electron.build/)：建置與打包工具鏈

### 免責聲明

```text
本軟體為個人學習作品，按「現狀」（AS IS）提供，不附帶任何明示或暗示的擔保，
包括但不限於適售性、特定用途適用性及不侵權之擔保。

在任何情況下，作者均不對因使用或無法使用本軟體而產生之任何直接、間接、
偶然、特殊或衍生性損害負責，包括但不限於資料損失、點數計算錯誤、
對局判斷失誤或其他經濟損失。

本軟體非商業產品，不收費、無廣告、不收集個人資料（完全離線運行，
所有計算皆在使用者瀏覽器或本機完成，不會上傳任何資料）。
```

### 權利主張與下架

本專案**無意侵犯任何人的權利**。若你是上游專案作者、牌面素材權利人，
或認為本專案內容侵害你的權益：

1. [開一個 issue](https://github.com/yuiri0317/riichi-trainer/issues) 說明具體內容
2. 或透過 GitHub 個人頁面聯絡我

我會在確認後**立即移除相關內容或整個專案**，不要求任何證明文件、不拖延。


