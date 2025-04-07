#!/bin/bash
# AWTRIX3 Web Interface Test Server - Unix Shell Script
# Simple wrapper for the Python server script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo
echo -e "${PURPLE}=====================================${NC}"
echo -e "${PURPLE} AWTRIX3 Web Interface Test Server${NC}"
echo -e "${PURPLE}=====================================${NC}"
echo

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}[ERROR] Python is not installed or not in PATH!${NC}"
    echo
    echo "Please install Python 3.6+ using your package manager:"
    echo "  Ubuntu/Debian: sudo apt install python3"
    echo "  macOS: brew install python3"
    echo "  Or download from: https://python.org"
    echo
    exit 1
fi

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Check Python version
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 6 ]); then
    echo -e "${RED}[ERROR] Python 3.6+ required, found Python $PYTHON_VERSION${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo -e "${RED}[ERROR] index.html not found in current directory!${NC}"
    echo "Please run this script from the AWTRIX3 web interface directory."
    echo
    exit 1
fi

# Make the script executable if it isn't already
if [ ! -x "start_server.py" ]; then
    chmod +x start_server.py
fi

# Start the server
echo "Starting server with $PYTHON_CMD..."
echo

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Server stopped by user${NC}"; exit 0' INT

$PYTHON_CMD start_server.py "$@"