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

## 授權

本專案的介面與牌面圖片改作自 [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)，
原專案未附授權條款。若要公開分發，請先確認圖片與原始碼的使用權。
