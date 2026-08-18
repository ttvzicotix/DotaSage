@echo off
setlocal EnableExtensions
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
cd /d "%ROOT%"
title DotaSage Live Sync Installer
set "LOG=%ROOT%\LIVE_SYNC_INSTALL_LOG.txt"
set "CFG_SOURCE=%ROOT%\companion\gamestate_integration_dotasage.cfg"
set "DOTA_CFG="
set "STEAMROOT="
> "%LOG%" echo DotaSage Live Sync installer started %DATE% %TIME%
echo.
echo ============================================================
echo DotaSage Live Sync Installer
echo ============================================================
echo This installs one Dota GSI config into your Dota cfg folder.
echo Dota must be fully restarted after installation.
echo.
if not exist "%CFG_SOURCE%" goto missing_source
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Valve\Steam" /v SteamPath 2^>nul ^| find /i "SteamPath"') do set "STEAMROOT=%%B"
if defined STEAMROOT if exist "%STEAMROOT%\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%STEAMROOT%\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found
if exist "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found
if exist "C:\Program Files\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=C:\Program Files\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
if defined DOTA_CFG goto found
for %%D in (C D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
  if not defined DOTA_CFG if exist "%%D:\SteamLibrary\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%%D:\SteamLibrary\steamapps\common\dota 2 beta\game\dota\cfg"
  if not defined DOTA_CFG if exist "%%D:\Steam\steamapps\common\dota 2 beta\game\dota\cfg" set "DOTA_CFG=%%D:\Steam\steamapps\common\dota 2 beta\game\dota\cfg"
)
if defined DOTA_CFG goto found
echo DotaSage did not find Dota automatically.
echo In Steam: Dota 2 ^> Properties ^> Installed Files ^> Browse
echo Then open game\dota\cfg and paste that folder below.
set /p "DOTA_CFG=Dota cfg folder: "
set "DOTA_CFG=%DOTA_CFG:"=%"
if not exist "%DOTA_CFG%" goto bad_path
:found
>> "%LOG%" echo Using cfg path: %DOTA_CFG%
set "TARGET=%DOTA_CFG%\gamestate_integration"
if not exist "%TARGET%" mkdir "%TARGET%" >> "%LOG%" 2>&1
if not exist "%TARGET%" goto mkdir_failed
copy /Y "%CFG_SOURCE%" "%TARGET%\gamestate_integration_dotasage.cfg" >> "%LOG%" 2>&1
if errorlevel 1 goto copy_failed
> "%ROOT%\LIVE_SYNC_INSTALL_PATH.txt" echo %TARGET%
echo.
echo [OK] DotaSage Live Sync installed.
echo 1. Fully restart Dota 2.
echo 2. Run scripts\windows\START_DOTASAGE_BRIDGE.bat.
echo 3. Open https://dotasage.vercel.app and connect Live Sync.
echo.
goto finish
:missing_source
echo [ERROR] Missing %CFG_SOURCE%
goto finish
:bad_path
echo [ERROR] That Dota cfg folder does not exist.
goto finish
:mkdir_failed
echo [ERROR] Could not create %TARGET%.
goto finish
:copy_failed
echo [ERROR] Config copy failed. See %LOG%.
:finish
echo.
pause
endlocal
