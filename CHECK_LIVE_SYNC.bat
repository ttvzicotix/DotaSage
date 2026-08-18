@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title DotaSage Live Sync Check

echo ============================================================
echo DotaSage Live Sync Diagnostics v0.16
echo ============================================================
echo.

set "INSTALLED="
if exist "%~dp0LIVE_SYNC_INSTALL_PATH.txt" set /p INSTALLED=<"%~dp0LIVE_SYNC_INSTALL_PATH.txt"
if defined INSTALLED (
  if exist "%INSTALLED%\gamestate_integration_dotasage.cfg" (
    echo [OK] Dota GSI config exists:
    echo      %INSTALLED%\gamestate_integration_dotasage.cfg
  ) else (
    echo [FAIL] Recorded GSI path exists, but the config file is missing.
    echo        Re-run INSTALL_LIVE_SYNC.bat.
  )
) else (
  echo [UNKNOWN] No recorded install path. Re-run INSTALL_LIVE_SYNC.bat once.
)

echo.
echo [CHECK] Dota must be fully restarted after installing/changing GSI.
echo         The config file itself is the primary integration setup.
echo         A launch option is NOT required if Dota is already posting payloads.
echo.

where curl >nul 2>nul
if errorlevel 1 (
  echo [INFO] curl is not available, so bridge health cannot be checked automatically.
) else (
  curl -s --max-time 2 http://127.0.0.1:31982/health > "%TEMP%\dotasage_health.json" 2>nul
  if errorlevel 1 (
    echo [OFFLINE] Local bridge is not running on 127.0.0.1:31982.
    echo           Launch START_DOTASAGE_BRIDGE.bat.
  ) else (
    echo [OK] Local bridge answered:
    type "%TEMP%\dotasage_health.json"
    echo.
    echo.
    curl -s --max-time 2 http://127.0.0.1:31982/state > "%TEMP%\dotasage_state.json" 2>nul
    echo [STATE]
    type "%TEMP%\dotasage_state.json"
    echo.
    echo.
    echo INTERPRETATION:
    echo   postCount = 0  ^> Dota has never contacted the bridge this run.
    echo                    Check cfg install, restart Dota,
    echo                    then enter Demo Hero or an actual match.
    echo   postCount ^> 0 + connected=false ^> Dota sent data before, but it is stale.
    echo   connected=true ^> Live Sync is working.
  )
)

echo.
echo Full setup guide: LIVE_SYNC_SETUP.md
echo.
pause
