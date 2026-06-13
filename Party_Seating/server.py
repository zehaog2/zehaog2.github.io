#!/usr/bin/env python3
"""Local web server: static files + POST /api/run to execute the optimizer."""
import json
import os
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from party_cpsat import DEFAULTS, solve

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", 8765))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/defaults":
            self._json_response(200, DEFAULTS)
            return
        if path == "/api/config":
            self._json_response(200, {"port": PORT})
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/run":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            result = solve(body, write_js=False, verbose=False)
            self._json_response(200, result)
        except (ValueError, json.JSONDecodeError) as exc:
            self._json_response(400, {"error": str(exc)})
        except Exception:
            self._json_response(500, {"error": traceback.format_exc()})

    def _json_response(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Serving http://127.0.0.1:{PORT}/party_seating.html")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
