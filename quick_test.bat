@echo off
REM Quick Test Script für AWTRIX3 Web Interface

title AWTRIX3 Quick Test

echo.
echo  ╔══════════════════════════════════════╗
echo  ║        AWTRIX3 Quick Test            ║
echo  ║        Modernized Web Interface      ║
echo  ╚══════════════════════════════════════╝
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Install Python from: https://python.org
    pause
    exit /b 1
)

REM Check files
if not exist "index.html" (
    echo [ERROR] Please run from AWTRIX3 directory
    pause
    exit /b 1
)

echo [INFO] Starting test server...
echo [INFO] Browser will open automatically
echo [INFO] Press Ctrl+C in server window to stop
echo.

REM Start simple server (most compatible)
python simple_server.py

echo.
echo Test completed. Press any key to exit...
pause >nul