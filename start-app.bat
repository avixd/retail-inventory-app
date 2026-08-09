@echo off
title Retail Inventory App - Dev Server
cd /d "%~dp0"
echo ============================================
echo   Retail Inventory App - starting dev server
echo ============================================
echo.
if not exist "node_modules\vite\package.json" (
  echo node_modules missing or incomplete - installing dependencies...
  call npm install
  echo.
)
echo Launching Vite (a browser tab will open automatically)...
echo Keep this window open while you use the app. Close it to stop the server.
echo.
call npm run dev -- --open
echo.
echo Server stopped. Press any key to close this window.
pause >nul
