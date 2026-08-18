@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
cd /d "%ROOT%"
title DotaSage Local Live Sync Bridge
echo.
echo ============================================================
echo        DotaSage - Local Live Sync Bridge ONLY
echo ============================================================
echo.
echo Website: https://dotasage.vercel.app
echo Bridge:  http://127.0.0.1:31982
echo.
echo Keep this window open while using Live Sync.
echo.
node companion\dotasage-gsi.js
echo.
echo [STOPPED] The DotaSage bridge exited.
pause
