@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   DotaSage local development server :5175
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
echo DotaSage could not start. Copy this window's error into your debugging notes.
pause
