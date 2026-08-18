@echo off
setlocal
cd /d "%~dp0"
title DotaSage Live Sync
echo.
echo DotaSage is hosted at https://dotasage.vercel.app
echo Starting the localhost bridge only...
echo.
call "%~dp0START_DOTASAGE_BRIDGE.bat"
