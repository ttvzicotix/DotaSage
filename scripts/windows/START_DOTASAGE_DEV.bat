@echo off
setlocal
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
cd /d "%ROOT%"
title DotaSage Local Development
echo.
echo ========================================
echo   DotaSage local development server
echo ========================================
echo.
if not exist node_modules (
  echo First run: installing dependencies...
  call npm.cmd install
  if errorlevel 1 goto :error
)
call npm.cmd run dev
goto :eof
:error
echo.
echo DotaSage could not start. Copy this window's error into ChatGPT.
pause
