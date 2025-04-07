@echo off
REM AWTRIX3 Web Interface Test Server - Windows Batch Script
REM Simple wrapper for the Python server script

echo.
echo =====================================
echo  AWTRIX3 Web Interface Test Server
echo =====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo.
    echo Please install Python 3.6+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "index.html" (
    echo [ERROR] index.html not found in current directory!
    echo Please run this script from the AWTRIX3 web interface directory.
    echo.
    pause
    exit /b 1
)

REM Try the advanced server first, fallback to simple server
echo Starting server...
echo.

python start_server.py %*
if errorlevel 1 (
    echo.
    echo Advanced server failed, trying simple server...
    echo.
    python simple_server.py
)

REM If we get here, the server was stopped
echo.
echo Server stopped. Press any key to exit...
pause >nul