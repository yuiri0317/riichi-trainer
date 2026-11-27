# ---------------------------------------------------------------
# Build Android APK
#
#   .\scripts\build-apk.ps1            direct connection
#   .\scripts\build-apk.ps1 -Proxy     download Gradle deps via Clash
#
# Prerequisites:
#   1. run .\scripts\setup-android.ps1 once
#   2. npm install includes @capacitor/*
#
# NOTE: ASCII-only on purpose (Windows PowerShell reads BOM-less .ps1
#       as ANSI; non-ASCII characters break parsing).
# ---------------------------------------------------------------

param(
    [switch]$Proxy,
    [string]$ProxyUrl = 'http://127.0.0.1:7897'
)

$ErrorActionPreference = 'Stop'

$project = Split-Path $PSScriptRoot -Parent
$apkOut  = Join-Path (Split-Path $project -Parent) 'RiichiTrainer-0.1.1.apk'

# ---- locate Android SDK (Android Studio's SDK counts) ----
$sdkCandidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    'E:\androidsdk',
    "$env:LOCALAPPDATA\Android\Sdk",
    'D:\Android\sdk',
    'C:\Android\Sdk'
) | Where-Object { $_ -and $_.Trim() -ne '' }

$sdkRoot = $null
foreach ($c in $sdkCandidates) {
    if ((Test-Path (Join-Path $c 'platform-tools\adb.exe')) -and (Test-Path (Join-Path $c 'platforms'))) {
        $sdkRoot = $c
        break
    }
}
if (-not $sdkRoot) { throw 'Android SDK not found. Install Android Studio, or set ANDROID_HOME.' }

# ---- locate JDK ----
# Capacitor 7 compiles with `-source 21`, so a JDK 17 (e.g. Android Studio's
# bundled jbr) fails with "invalid source release: 21". Prefer JDK 21+ and
# only fall back to 17 when nothing newer exists.
$jdkCandidates = @(
    'E:\java\jdk21',
    $env:JAVA_HOME
)

$regJdk = Get-ItemProperty 'HKLM:\SOFTWARE\JavaSoft\JDK\21.0.1' -ErrorAction SilentlyContinue
if ($regJdk -and $regJdk.JavaHome) { $jdkCandidates += $regJdk.JavaHome }

$regStudio = Get-ItemProperty 'HKLM:\SOFTWARE\Android Studio' -ErrorAction SilentlyContinue
if ($regStudio -and $regStudio.Path) { $jdkCandidates += (Join-Path $regStudio.Path 'jbr') }
$jdkCandidates += 'E:\android studio\jbr'
$jdkCandidates += 'C:\Program Files\Android\Android Studio\jbr'

$jdkCandidates = $jdkCandidates | Where-Object { $_ } | Select-Object -Unique

function Get-JavaMajor([string]$javaHome) {
    $javac = Join-Path $javaHome 'bin\javac.exe'
    if (-not (Test-Path $javac)) { return 0 }
    $out = (& $javac -version 2>&1) -join ' '
    if ($out -match 'javac\s+(\d+)') { return [int]$Matches[1] }
    return 0
}

$jdk = $null
$jdkMajor = 0
foreach ($c in $jdkCandidates) {
    $m = Get-JavaMajor $c
    if ($m -ge 21) { $jdk = $c; $jdkMajor = $m; break }
}
if (-not $jdk) {
    # no JDK 21+ -> fall back, but warn (Capacitor 7 needs 21)
    foreach ($c in $jdkCandidates) {
        $m = Get-JavaMajor $c
        if ($m -ge 17) { $jdk = $c; $jdkMajor = $m; break }
    }
    if ($jdk) {
        Write-Host "WARNING: only JDK $jdkMajor found. Capacitor 7 needs JDK 21 to compile." -ForegroundColor Yellow
        Write-Host "         It will likely fail with 'invalid source release: 21'." -ForegroundColor Yellow
    }
}
if (-not $jdk) { throw 'No JDK found. Install JDK 21 (Capacitor 7 requires it).' }

$env:JAVA_HOME        = $jdk
$env:ANDROID_HOME     = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:PATH = "$jdk\bin;$sdkRoot\platform-tools;$env:PATH"

Write-Host "JDK: $jdk" -ForegroundColor DarkGray
Write-Host "SDK: $sdkRoot" -ForegroundColor DarkGray
& (Join-Path $jdk 'bin\javac.exe') -version 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }

if ($Proxy) {
    $p = [uri]$ProxyUrl
    if (-not (Test-NetConnection -ComputerName $p.Host -Port $p.Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
        throw "Proxy $ProxyUrl is not reachable. Start Clash first, or run without -Proxy."
    }
    $env:GRADLE_OPTS = "-Dhttp.proxyHost=$($p.Host) -Dhttp.proxyPort=$($p.Port) -Dhttps.proxyHost=$($p.Host) -Dhttps.proxyPort=$($p.Port)"
    Write-Host "Gradle proxy: $ProxyUrl" -ForegroundColor DarkGray
} else {
    # Clear any proxy left over from an earlier -Proxy run in the same shell.
    if ($env:GRADLE_OPTS) {
        Write-Host "Clearing stale GRADLE_OPTS: $env:GRADLE_OPTS" -ForegroundColor Yellow
    }
    $env:GRADLE_OPTS = $null
}

Set-Location $project

# ---- 1. web build ----
Write-Host ''
Write-Host '=== 1/4 Building web assets ===' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

# ---- 2. capacitor sync ----
Write-Host ''
Write-Host '=== 2/4 Syncing Capacitor ===' -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $project 'android'))) {
    Write-Host '  First run: creating android project...' -ForegroundColor Yellow
    npx cap add android
    if ($LASTEXITCODE -ne 0) { throw 'npx cap add android failed (did npm install @capacitor/* ?)' }
}
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'npx cap sync failed' }

# Tell Gradle where the SDK is (escaped backslashes for .properties)
$localProps = Join-Path $project 'android\local.properties'
$sdkDirLine = 'sdk.dir=' + ($sdkRoot -replace '\\', '\\')
Set-Content -Path $localProps -Value $sdkDirLine -Encoding ASCII
Write-Host "  local.properties -> $sdkRoot" -ForegroundColor DarkGray

# Gradle wrapper points at services.gradle.org which is unreachable in China.
# Rewrite it to the Tencent mirror. NOTE: the colon is escaped in this file
# (https\://...), so the pattern must allow the optional backslash.
$wrapper = Join-Path $project 'android\gradle\wrapper\gradle-wrapper.properties'
if (Test-Path $wrapper) {
    $w = Get-Content $wrapper -Raw
    if ($w -match 'services\.gradle\.org') {
        $w = $w -replace 'https(\\?)://services\.gradle\.org/distributions/', "https`$1://mirrors.cloud.tencent.com/gradle/"
        Set-Content -Path $wrapper -Value $w -NoNewline -Encoding ASCII
        Write-Host '  Gradle wrapper -> Tencent mirror' -ForegroundColor DarkGray
    }
}

# Put Aliyun Maven mirrors BEFORE google()/mavenCentral() so Gradle never
# touches dl.google.com (very slow / blocked in China). Idempotent.
function Add-MavenMirrors([string]$file) {
    if (-not (Test-Path $file)) { return }
    $c = Get-Content $file -Raw
    if ($c -match 'maven\.aliyun\.com') { return }
    $c = $c -replace '(?m)^(\s*)google\(\)', "`$1maven { url 'https://maven.aliyun.com/repository/google' }`n`$1google()"
    $c = $c -replace '(?m)^(\s*)mavenCentral\(\)', "`$1maven { url 'https://maven.aliyun.com/repository/public' }`n`$1mavenCentral()"
    $c = $c -replace '(?m)^(\s*)gradlePluginPortal\(\)', "`$1maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }`n`$1gradlePluginPortal()"
    Set-Content -Path $file -Value $c -NoNewline -Encoding ASCII
    Write-Host ("  mirrors added: " + (Split-Path $file -Leaf)) -ForegroundColor DarkGray
}

foreach ($g in 'android\build.gradle', 'android\settings.gradle', 'android\app\build.gradle') {
    Add-MavenMirrors (Join-Path $project $g)
}

# ---- 3. gradle build ----
Write-Host ''
Write-Host '=== 3/4 Gradle assembleDebug (first run downloads deps, 5-10 min) ===' -ForegroundColor Cyan
Push-Location (Join-Path $project 'android')
try {
    & '.\gradlew.bat' 'assembleDebug' '--no-daemon'
    if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed - see errors above' }
} finally {
    Pop-Location
}

# ---- 4. copy apk ----
Write-Host ''
Write-Host '=== 4/4 Copying APK ===' -ForegroundColor Cyan
$built = Join-Path $project 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $built)) { throw "APK not found: $built" }

Copy-Item $built $apkOut -Force
$mb = [math]::Round((Get-Item $apkOut).Length / 1MB, 1)

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Green
Write-Host "  APK: $apkOut ($mb MB)"
Write-Host ''
Write-Host '  Install: copy to phone, tap it, allow unknown sources' -ForegroundColor DarkGray
Write-Host "  Or USB:  adb install -r `"$apkOut`"" -ForegroundColor DarkGray
