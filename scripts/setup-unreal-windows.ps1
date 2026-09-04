# Unreal Engine setup helper for Windows.
#
# Installs the Epic Games Launcher via winget after checking disk headroom.
# The engine itself is installed from INSIDE the launcher after you sign in —
# Epic gates the download behind your (free) Epic Games account, so that part
# stays manual:
#   Launcher -> Unreal Engine -> Library -> "+" next to Engine Versions -> Install
#
# Run from a normal PowerShell prompt:  .\setup-unreal-windows.ps1

$ErrorActionPreference = 'Stop'

$drive = Get-PSDrive -Name C
$freeGB = [math]::Round($drive.Free / 1GB)
if ($freeGB -ge 150) {
    Write-Host "[ OK ] Free space on C: ${freeGB} GB" -ForegroundColor Green
} elseif ($freeGB -ge 100) {
    Write-Host "[WARN] Free space on C: ${freeGB} GB - enough for the engine, tight once projects pile up" -ForegroundColor Yellow
} else {
    Write-Host "[FAIL] Free space on C: ${freeGB} GB - the engine wants ~100 GB minimum." -ForegroundColor Red
    Write-Host "       Free up space first, or install the engine to another drive from the launcher."
}

if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Installing Epic Games Launcher via winget..."
    winget install --id EpicGames.EpicGamesLauncher -e --source winget --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[WARN] winget not available. Download the launcher manually:" -ForegroundColor Yellow
    Start-Process "https://www.unrealengine.com/download"
}

Write-Host ""
Write-Host "Next steps (manual, needs your Epic sign-in):"
Write-Host "  1. Open the Epic Games Launcher and sign in (free account)."
Write-Host "  2. Sidebar: Unreal Engine  ->  tab: Library."
Write-Host "  3. Click '+' next to Engine Versions, pick the newest, click Install."
Write-Host "  4. Expect a download in the tens of GB; first editor launch is slow (shader compile)."
