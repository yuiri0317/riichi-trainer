# 一鍵：安裝依賴 + 打包 Windows 安裝檔
#
# 所有下載都會落在專案目錄裡（不污染系統槽）：
#   <專案>\.npm-cache               npm 快取
#   <專案>\.cache\electron          Electron 二進位檔
#   <專案>\.cache\electron-builder  NSIS / winCodeSign 等工具
#   node_modules、dist               也都在專案目錄
#
# 用法（在專案根目錄）：
#   .\scripts\build-desktop.ps1

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cacheDir = Join-Path $root '.cache'

$env:npm_config_cache = Join-Path $root '.npm-cache'
$env:ELECTRON_CACHE = Join-Path $cacheDir 'electron'
$env:electron_config_cache = Join-Path $cacheDir 'electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $cacheDir 'electron-builder'

$env:npm_config_registry = 'https://registry.npmmirror.com'
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'

New-Item -ItemType Directory -Force -Path $env:ELECTRON_CACHE, $env:ELECTRON_BUILDER_CACHE, $env:npm_config_cache | Out-Null

Set-Location (Join-Path $PSScriptRoot '..')

Write-Host ''
Write-Host '=== 1/3 安裝依賴（含 Electron，約 100 MB） ===' -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

Write-Host ''
Write-Host '=== 2/3 建置前端 ===' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

Write-Host ''
Write-Host '=== 3/3 打包 Windows 安裝檔 ===' -ForegroundColor Cyan
npx electron-builder --win nsis
if ($LASTEXITCODE -ne 0) { throw 'electron-builder failed' }

Write-Host ''
Write-Host '=== 完成 ===' -ForegroundColor Green

$exeList = Get-ChildItem 'dist' -Filter '*.exe' -ErrorAction SilentlyContinue
foreach ($exe in $exeList) {
    $sizeMb = [math]::Round($exe.Length / 1MB, 1)
    Write-Host ("  " + $exe.FullName + "  (" + $sizeMb + " MB)")
}
