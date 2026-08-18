@echo off
setlocal EnableExtensions
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
cd /d "%ROOT%"
title DotaSage Live Sync Check
echo ============================================================
echo DotaSage Live Sync Diagnostics
echo ============================================================
echo.
set "INSTALLED="
if exist "%ROOT%\LIVE_SYNC_INSTALL_PATH.txt" set /p INSTALLED=<"%ROOT%\LIVE_SYNC_INSTALL_PATH.txt"
if defined INSTALLED (
  if exist "%INSTALLED%\gamestate_integration_dotasage.cfg" (
    echo [OK] Dota GSI config exists:
    echo      %INSTALLED%\gamestate_integration_dotasage.cfg
  ) else (
    echo [FAIL] Recorded GSI path exists, but the config file is missing.
    echo        Re-run scripts\windows\INSTALL_LIVE_SYNC.bat.
  )
) else (
  echo [UNKNOWN] No recorded install path. Run scripts\windows\INSTALL_LIVE_SYNC.bat once.
)
echo.
where curl >nul 2>nul
if errorlevel 1 (
  echo [INFO] curl is unavailable, so bridge health cannot be checked automatically.
) else (
  curl -s --max-time 2 http://127.0.0.1:31982/health > "%TEMP%\dotasage_health.json" 2>nul
  if errorlevel 1 (
    echo [OFFLINE] Local bridge is not running on 127.0.0.1:31982.
    echo           Launch scripts\windows\START_DOTASAGE_BRIDGE.bat.
  ) else (
    echo [OK] Local bridge answered:
    type "%TEMP%\dotasage_health.json"
    echo.
    curl -s --max-time 2 http://127.0.0.1:31982/state > "%TEMP%\dotasage_state.json" 2>nul
    echo.
    echo [STATE]
    type "%TEMP%\dotasage_state.json"
    echo.
  )
)
echo.
echo Setup guide: docs\live-sync-setup.md
pause
