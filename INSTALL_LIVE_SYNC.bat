@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title DotaSage Live Sync Installer v0.16

set "LOG=%~dp0LIVE_SYNC_INSTALL_LOG.txt"
set "CFG_SOURCE=%~dp0companion\gamestate_integration_dotasage.cfg"
set "DOTA_CFG="
set "STEAMROOT="

> "%LOG%" echo DotaSage Live Sync installer started %DATE% %TIME%
echo.
echo ============================================================
echo DotaSage Live Sync Installer v0.16
echo ============================================================
echo This copies one Dota GSI config into your Dota cfg folder.
echo Dota does NOT need to be closed for the copy, but it MUST be
echo fully restarted before it will read the new integration config.
echo.

if not exist "%CFG_SOURCE%" goto missing_source

rem First ask Steam itself where it is installed.
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Valve\Steam" /v SteamPath 2^>nul ^| find /i "SteamPath"') do set "STEAMROOT=%%B"
if defined STEAMROOT if exist "%STEAMROOT%\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%STEAMROOT%\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found

rem Common default location.
if exist "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found
if exist "C:\Program Files\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=C:\Program Files\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found

rem Scan common library-folder names on every drive letter instead of assuming C-F only.
for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
  if not defined DOTA_CFG if exist "%%D:\SteamLibrary\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%%D:\SteamLibrary\steamapps\common\dota 2 beta\game\dota\cfg"
  if not defined DOTA_CFG if exist "%%D:\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%%D:\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
)
if defined DOTA_CFG goto found

:manual
echo DotaSage did not find Dota automatically.
echo.
echo In Steam: Dota 2 ^> Properties ^> Installed Files ^> Browse
echo Then open: game\dota\cfg
echo.
echo Paste or drag that cfg folder into this window, then press Enter.
set /p "DOTA_CFG=Dota cfg folder: "
set "DOTA_CFG=%DOTA_CFG:"=%"
if not exist "%DOTA_CFG%" goto bad_path

:found
>> "%LOG%" echo Using cfg path: %DOTA_CFG%
set "TARGET=%DOTA_CFG%\gamestate_integration"
if exist "%TARGET%" goto target_ready
mkdir "%TARGET%" >> "%LOG%" 2>&1
if not exist "%TARGET%" goto mkdir_failed

:target_ready
copy /Y "%CFG_SOURCE%" "%TARGET%\gamestate_integration_dotasage.cfg" >> "%LOG%" 2>&1
if errorlevel 1 goto copy_failed

> "%~dp0LIVE_SYNC_INSTALL_PATH.txt" echo %TARGET%
>> "%LOG%" echo SUCCESS: %TARGET%\gamestate_integration_dotasage.cfg

echo.
echo [OK] DotaSage Live Sync config installed:
echo %TARGET%\gamestate_integration_dotasage.cfg
echo.
echo REQUIRED NEXT STEPS:
echo   1. FULLY EXIT and restart Dota 2.
echo   2. Run START_DOTASAGE_BRIDGE.bat.
echo   3. Open https://dotasage.vercel.app and click CONNECT LIVE SYNC.
echo   4. Enter Demo Hero, a bot lobby, or a real match.
echo   5. Run CHECK_LIVE_SYNC.bat if DotaSage still says waiting.
echo.
echo Install log: %LOG%
echo Install path: %~dp0LIVE_SYNC_INSTALL_PATH.txt
echo Setup guide: %~dp0LIVE_SYNC_SETUP.md
goto finish

:missing_source
>> "%LOG%" echo ERROR: Missing source config %CFG_SOURCE%
echo [ERROR] DotaSage's companion GSI config is missing.
echo Make sure you extracted the entire project folder before running this.
goto finish

:bad_path
>> "%LOG%" echo ERROR: Invalid manual cfg path: %DOTA_CFG%
echo.
echo [ERROR] That folder does not exist:
echo %DOTA_CFG%
echo.
echo Re-run this installer and paste the folder ending in game\dota\cfg.
goto finish

:mkdir_failed
>> "%LOG%" echo ERROR: Could not create %TARGET%
echo [ERROR] Could not create:
echo %TARGET%
echo Try running this installer as Administrator once, or verify the folder is writable.
goto finish

:copy_failed
>> "%LOG%" echo ERROR: Copy failed to %TARGET%
echo [ERROR] The config copy failed.
echo See %LOG%
goto finish

:finish
echo.
echo This window will stay open so errors cannot disappear instantly.
pause
endlocal
