@echo off
setlocal

cd /d "%~dp0.."

if not exist ".env" (
  echo PRINT_AGENT_START_ERROR: .env wurde nicht gefunden.
  exit /b 2
)

if not exist "dist\index.js" (
  echo PRINT_AGENT_START_ERROR: dist\index.js wurde nicht gefunden. Bitte zuerst npm run build ausfuehren.
  exit /b 3
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo PRINT_AGENT_START_ERROR: node.exe wurde nicht im PATH gefunden.
  exit /b 4
)

node.exe --env-file=.env dist\index.js
exit /b %errorlevel%