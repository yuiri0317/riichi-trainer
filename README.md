# 立直麻将练习

日麻（立直麻将）的离线练习工具。纯前端，所有计算都在浏览器里完成，不需要后端、不需要联网。

> **声明**
>
> 这是一个**个人学习用途的非商业项目**，与任何麻将游戏厂商、开源项目作者均无隶属或背书关系。
>
> - 界面结构与牌面图片改作自 [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)，该项目未附授权条款；本项目保留出处标注，若原作者认为不妥，请[开 issue](https://github.com/yuiri0317/riichi-trainer/issues) 告知，会立即下架相关内容
> - 本项目**不收取任何费用**、无广告、无商业行为
> - 软件按「现状」提供，不对任何计算结果的正确性作担保；用于实战前请自行核对
> - 「立直」「麻雀」「Riichi Mahjong」等为通用名词，相关商标权利归各自所有者
>
> 详细的授权范围见文末[授权与来源](#授权与来源)。

## 功能

| 页面 | 说明 |
|---|---|
| 进张数计算 | 输入手牌，算出切哪张进张最多 |
| 牌效率何切 | 随机出题的切牌练习（自动理牌可开关、支持反悔、显示切牌前手牌） |
| 清一色何切 / 清一色听牌 | 清一色专项练习 |
| 点数计算 | 番＋符 → 点数（含青天井规则） |
| 符数计算 | 随机牌型的符数练习 |
| **手牌算点** | 输入完整手牌自动判定役种、番数、符数、点数 |

手牌算点支持：

- 门前 14 张，或带副露（吃／碰／明杠／暗杠）
- 副露语法：`123m`＝吃、`111p`＝碰、`1111s`＝明杠、`1111s-`＝暗杠；`123123123m` 会切成三个顺子，不会被重排成 `111222333`
- 自摸／荣和、亲家／子家、立直／双立直／一发、天和／地和、海底／河底、岭上开花、抢杠
- 宝牌：手填张数，或点选指示牌自动换算（含赤宝牌）
- 赤宝牌 `0m` / `0p` / `0s` 可直接在牌堆里点选，与普通 `5` 共用 4 张上限
- 可展开符数明细，看到每一项加符与进位过程
- 「清空」一键重置手牌、副露与宝牌

## 开发

```bash
npm install
npm start          # http://localhost:3000
```

## 测试

算点引擎与副露解析有回归测试（27 个）：

```bash
npm test -- --watchAll=false --runInBand
```

`--runInBand` 是必要的，否则 jest 会 fork 子进程，在部分受限环境会 `spawn EPERM`。

## 构建

```bash
npm run build      # 产出 build/
```

`build/` 是纯静态文件，可以直接丢到任何静态主机（GitHub Pages / Netlify / Cloudflare Pages）。

## 桌面版（Windows）

```powershell
.\scripts\build-desktop.ps1
```

会依次安装依赖、构建前端、用 electron-builder 打包出 NSIS 安装档（`dist\立直麻将练习 Setup 0.1.0.exe`）。
所有下载都会落在项目目录下的 `.npm-cache` / `.cache`，不污染系统盘。

也提供免安装版：整个 `dist\win-unpacked\` 目录可以压缩分发，解压后双击 exe 即可运行（需保留完整目录）。

## PWA

`public/sw.js` + `public/manifest.json` 已就绪。部署到 HTTPS 后，手机浏览器可以「加到主画面」，
装完有图标、全屏执行、断网可用。Service Worker 只在 production 构建注册，`npm start` 不受影响。

## 授权与来源

### 本项目自行撰写的部分

以下代码由本项目独立完成，采用 [MIT 授权](https://opensource.org/licenses/MIT)，可自由使用、修改、再分发（保留著作权声明即可）：

| 范围 | 内容 |
|---|---|
| `src/tools/Score.js`、`src/tools/meldParser.js` | 算点引擎、副露解析（含 27 个回归测试） |
| `src/pages/HandScoreCalculator.js` | 手牌算点页面 |
| `src/i18n/` | 繁简转换 |
| `electron/`、`public/sw.js`、`public/manifest.json` | 桌面版封装、PWA |
| `scripts/`、`.github/workflows/` | 打包与部署脚本 |
| 各页面新增的功能 | 自动理牌开关、反悔与计数、切牌前回显、副露输入、宝牌指示牌等 |

### 沿用自上游的部分

界面结构、牌效率算法与 `public/images/` 内的牌面图片，
改作自 [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)。
**该项目未附授权条款**，因此这部分没有明确的使用许可。

若你要复制、修改或再分发本项目，请注意：

- 上述 MIT 授权**只涵盖本项目自行撰写的部分**
- 上游部分请自行判断风险；商用或大规模再分发前，建议先取得原作者同意，或全部重写

### 牌面图片

`public/images/` 内的牌面图非本项目原创。若需要可安全再分发的替代方案，
可改用公有领域素材，例如 [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)（CC0，可商用）。

### 致谢

- [riichimahjongtrainer](https://github.com/riichimahjongtrainer/riichimahjongtrainer)：本项目的起点，界面与牌面图片皆源于此
- [tomohxx/shanten-number](https://github.com/tomohxx)：进张数与向听数算法的原始出处
- [Create React App](https://create-react-app.dev/)、[Electron](https://www.electronjs.org/)、[electron-builder](https://www.electron.build/)：构建与打包工具链

### 免责声明

```text
本软件为个人学习作品，按「现状」（AS IS）提供，不附带任何明示或暗示的担保，
包括但不限于适销性、特定用途适用性及不侵权之担保。

在任何情况下，作者均不对因使用或无法使用本软件而产生之任何直接、间接、
偶然、特殊或衍生性损害负责，包括但不限于数据丢失、点数计算错误、
对局判断失误或其他经济损失。

本软件非商业产品，不收费、无广告、不收集个人数据（完全离线运行，
所有计算皆在用户浏览器或本机完成，不会上传任何数据）。
```

### 权利主张与下架

本项目**无意侵犯任何人的权利**。若你是上游项目作者、牌面素材权利人，
或认为本项目内容侵害你的权益：

1. [开一个 issue](https://github.com/yuiri0317/riichi-trainer/issues) 说明具体内容
2. 或通过 GitHub 个人页面联系我

我会在确认后**立即移除相关内容或整个项目**，不要求任何证明文件、不拖延。
