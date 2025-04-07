#!/usr/bin/env python3
"""
AWTRIX3 Simple Test Server
Lightweight fallback server for older Python versions
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

PORT = 8000

def find_free_port(start_port=8000):
    """Find a free port"""
    import socket
    for port in range(start_port, start_port + 20):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return start_port

def main():
    # Check if we're in the right directory
    if not os.path.exists('index.html'):
        print("❌ Error: index.html not found!")
        print("Please run this script from the AWTRIX3 directory.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Find available port
    port = find_free_port(PORT)
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("🚀 AWTRIX3 Simple Test Server")
    print("=" * 40)
    print(f"✓ Server: http://localhost:{port}")
    print(f"✓ Directory: {os.getcwd()}")
    print()
    print("Press Ctrl+C to stop")
    print()
    
    try:
        # Create server
        handler = http.server.SimpleHTTPRequestHandler
        
        with socketserver.TCPServer(("", port), handler) as httpd:
            # Open browser
            try:
                webbrowser.open(f'http://localhost:{port}')
                print("🌐 Browser opened automatically")
            except:
                print("⚠️  Please open browser manually")
            
            print(f"🟢 Server running on port {port}...")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")

if __name__ == '__main__':
    main()