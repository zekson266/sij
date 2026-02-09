#!/usr/bin/env python3
"""
Simple HTTP server for receiving debug logs and writing them to NDJSON file.
Listens on port 7342 and writes to /root/bangbang/.cursor/debug.log
"""

import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

LOG_FILE = Path("/root/bangbang/.cursor/debug.log")
LOG_DIR = LOG_FILE.parent

# Ensure log directory exists
LOG_DIR.mkdir(parents=True, exist_ok=True)


class LogHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests to /ingest/* endpoints"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Parse JSON
            log_entry = json.loads(body.decode('utf-8'))
            
            # Add timestamp if missing
            if 'timestamp' not in log_entry:
                import time
                log_entry['timestamp'] = int(time.time() * 1000)
            
            # Write NDJSON line to file
            with open(LOG_FILE, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            
        except Exception as e:
            print(f"Error processing log: {e}")
            self.send_response(500)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress default HTTP server logs"""
        pass


def run_server(port=7342):
    """Start the logging server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, LogHandler)
    print(f"Debug log server listening on port {port}")
    print(f"Writing logs to: {LOG_FILE}")
    print("Press Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()


if __name__ == '__main__':
    run_server()
