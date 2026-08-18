@echo off
setlocal
cd /d "%~dp0"
title DotaSage Local Live Sync Bridge
echo.
echo ============================================================
echo        DotaSage - Local Live Sync Bridge ONLY
echo ============================================================
echo.
echo This starts ONLY the private localhost GSI companion.
echo It does NOT start another local website.
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
