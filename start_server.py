#!/usr/bin/env python3
"""
AWTRIX3 Web Interface Test Server
Simple HTTP server for testing the modernized web interface
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import argparse
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with proper MIME types and CORS headers"""
    
    def __init__(self, *args, **kwargs):
        # Set directory before calling super for compatibility
        self.directory = str(Path(__file__).parent)
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        # Cache control for development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        super().end_headers()
    
    def guess_type(self, path):
        """Enhanced MIME type detection"""
        import mimetypes
        
        # Custom MIME types for modern web development
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript', None
        elif path.endswith('.css'):
            return 'text/css', None
        elif path.endswith('.json'):
            return 'application/json', None
        elif path.endswith('.woff2'):
            return 'font/woff2', None
        elif path.endswith('.woff'):
            return 'font/woff', None
        elif path.endswith('.html'):
            return 'text/html', None
        
        # Fall back to standard detection
        return mimetypes.guess_type(path)
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Enhanced logging with colors"""
        message = format % args
        timestamp = self.log_date_time_string()
        
        # Color codes for different request types
        if 'GET' in message:
            color = '\033[92m'  # Green
        elif 'POST' in message:
            color = '\033[94m'  # Blue
        elif 'PUT' in message:
            color = '\033[93m'  # Yellow
        elif 'DELETE' in message:
            color = '\033[91m'  # Red
        else:
            color = '\033[0m'   # Reset
        
        print(f"{color}[{timestamp}] {message}\033[0m")

def find_free_port(start_port=8000, max_attempts=10):
    """Find a free port starting from start_port"""
    import socket
    
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"No free port found in range {start_port}-{start_port + max_attempts}")

def print_banner(port, open_browser=True):
    """Print startup banner with server information"""
    print("\033[95m" + "=" * 60)
    print("🚀 AWTRIX3 Web Interface Test Server")
    print("=" * 60 + "\033[0m")
    print(f"\033[92m✓ Server running on: http://localhost:{port}\033[0m")
    print(f"\033[92m✓ Document root: {Path.cwd()}\033[0m")
    print()
    print("\033[93mAvailable endpoints:\033[0m")
    print(f"  🏠 Main Interface:     http://localhost:{port}/")
    print(f"  📊 Dashboard:          http://localhost:{port}/index.html")
    print(f"  🎨 CSS (Modern):       http://localhost:{port}/css/modern-style.css")
    print(f"  📱 Components:         http://localhost:{port}/css/components.css")
    print()
    print("\033[96mFeatures enabled:\033[0m")
    print("  ✓ CORS headers for API testing")
    print("  ✓ Proper MIME types for ES6 modules")
    print("  ✓ No-cache headers for development")
    print("  ✓ Enhanced request logging")
    print()
    if open_browser:
        print("\033[93m🌐 Opening browser automatically...\033[0m")
    print("\033[91m⚠️  Press Ctrl+C to stop the server\033[0m")
    print()

def main():
    parser = argparse.ArgumentParser(
        description='Start AWTRIX3 Web Interface Test Server',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start_server.py                    # Start on port 8000
  python start_server.py -p 3000           # Start on port 3000
  python start_server.py --no-browser      # Don't open browser
  python start_server.py -p 8080 --verbose # Verbose logging on port 8080
        """
    )
    
    parser.add_argument('-p', '--port', type=int, default=8000,
                       help='Port to run the server on (default: 8000)')
    parser.add_argument('--no-browser', action='store_true',
                       help='Don\'t open browser automatically')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging')
    parser.add_argument('--host', default='localhost',
                       help='Host to bind to (default: localhost)')
    
    args = parser.parse_args()
    
    # Check if we're in the right directory
    if not Path('index.html').exists():
        print("\033[91m❌ Error: index.html not found in current directory!\033[0m")
        print("\033[93m💡 Please run this script from the AWTRIX3 web interface directory.\033[0m")
        sys.exit(1)
    
    # Find available port if specified port is busy
    try:
        port = find_free_port(args.port)
        if port != args.port:
            print(f"\033[93m⚠️  Port {args.port} is busy, using port {port} instead.\033[0m")
    except RuntimeError as e:
        print(f"\033[91m❌ Error: {e}\033[0m")
        sys.exit(1)
    
    try:
        # Create and start server
        with socketserver.TCPServer((args.host, port), CustomHTTPRequestHandler) as httpd:
            print_banner(port, not args.no_browser)
            
            # Open browser if requested
            if not args.no_browser:
                try:
                    webbrowser.open(f'http://localhost:{port}')
                except Exception as e:
                    print(f"\033[93m⚠️  Could not open browser: {e}\033[0m")
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\033[93m🛑 Server stopped by user\033[0m")
        print("\033[92m✓ Thank you for testing AWTRIX3 Web Interface!\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Server error: {e}\033[0m")
        sys.exit(1)

if __name__ == '__main__':
    main()