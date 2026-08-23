@echo off
echo ============================================================
echo  ForestNet - Starting Backend + Frontend
echo ============================================================
echo.

REM Set UTF-8 encoding to prevent emoji charmap errors on Windows
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo [1/2] Starting Flask Backend (Port 5000)...
start "ForestNet Backend" cmd /k "cd /d %~dp0 && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && .venv\Scripts\python.exe app.py"

echo Waiting for backend to start...
timeout /t 4 /nobreak > nul

echo [2/2] Starting Frontend Dev Server (Port 5173)...
start "ForestNet Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo  ForestNet is starting up!
echo  - Backend API: http://127.0.0.1:5000
echo  - Frontend (Dev): http://localhost:5173
echo  - Or visit: http://127.0.0.1:5000 (serves built frontend)
echo ============================================================
echo.
pause
