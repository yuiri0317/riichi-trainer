# ---------------------------------------------------------------
# Install Android SDK (run once)
#
#   .\scripts\setup-android.ps1
#
# Steps:
#   1. download Android command-line tools (Tencent mirror first)
#   2. extract to D:\Android\sdk\cmdline-tools\latest
#   3. install platform-tools / platforms;android-35 / build-tools;35.0.0
#   4. accept licenses
#
# NOTE: this file is ASCII-only on purpose -- Windows PowerShell reads
#       BOM-less .ps1 as ANSI and non-ASCII chars would break parsing.
# ---------------------------------------------------------------

$ErrorActionPreference = 'Stop'

$sdkRoot = 'D:\Android\sdk'
$jdk     = 'E:\java\jdk21'

# ---- locate JDK 17+ ----
if (-not (Test-Path (Join-Path $jdk 'bin\javac.exe'))) {
    $reg = Get-ItemProperty 'HKLM:\SOFTWARE\JavaSoft\JDK\21.0.1' -ErrorAction SilentlyContinue
    if ($reg -and (Test-Path (Join-Path $reg.JavaHome 'bin\javac.exe'))) {
        $jdk = $reg.JavaHome
    } else {
        throw 'JDK 17+ not found. Android Gradle Plugin requires JDK 17 or newer.'
    }
}
Write-Host "JDK: $jdk" -ForegroundColor Green

# ---- download cmdline-tools ----
$zip = 'D:\Android\cmdline-tools.zip'
$sdkmanager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'

if (Test-Path $sdkmanager) {
    Write-Host 'cmdline-tools already installed, skipping download' -ForegroundColor Yellow
} else {
    $mirrors = @(
        'https://mirrors.cloud.tencent.com/AndroidSDK/commandlinetools-win-11076708_latest.zip',
        'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
    )
    New-Item -ItemType Directory -Path 'D:\Android' -Force | Out-Null
    if (Test-Path $zip) { Remove-Item $zip -Force }

    $ok = $false
    foreach ($url in $mirrors) {
        Write-Host "Downloading: $url" -ForegroundColor Cyan
        curl.exe -L --ssl-no-revoke --retry 2 -o $zip $url
        if ((Test-Path $zip) -and ((Get-Item $zip).Length -gt 50MB)) { $ok = $true; break }
        Write-Host '  failed, trying next mirror' -ForegroundColor DarkYellow
    }
    if (-not $ok) { throw 'Download failed. Turn on proxy and retry.' }

    Write-Host 'Extracting...' -ForegroundColor Cyan
    $tmp = 'D:\Android\tmp'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force

    New-Item -ItemType Directory -Path (Join-Path $sdkRoot 'cmdline-tools') -Force | Out-Null
    $dest = Join-Path $sdkRoot 'cmdline-tools\latest'
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Move-Item (Join-Path $tmp 'cmdline-tools') $dest
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
    Write-Host 'cmdline-tools ready' -ForegroundColor Green
}

# ---- install packages ----
$env:JAVA_HOME        = $jdk
$env:ANDROID_HOME     = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot

Write-Host ''
Write-Host '=== Accepting licenses ===' -ForegroundColor Cyan
('y' + "`n") * 30 | & $sdkmanager --licenses 2>&1 | Select-Object -Last 2

Write-Host ''
Write-Host '=== Installing packages ===' -ForegroundColor Cyan
& $sdkmanager 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' 2>&1 | Select-Object -Last 6
if ($LASTEXITCODE -ne 0) { throw 'sdkmanager failed' }

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Green
Write-Host "  SDK: $sdkRoot"
Write-Host '  Next: .\scripts\build-apk.ps1'
