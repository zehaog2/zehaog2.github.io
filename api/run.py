#!/usr/bin/env python3
"""Vercel serverless handler for the party seating CP-SAT optimizer."""
import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent / "Party_Seating"
sys.path.insert(0, str(ROOT))

from party_cpsat import DEFAULTS, MAX_N, solve  # noqa: E402

PORT = int(os.environ.get("PORT", 8765))


class handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/defaults":
            self._json_response(200, DEFAULTS)
            return
        if path == "/api/config":
            self._json_response(200, {"port": PORT, "maxN": MAX_N})
            return
        self.send_error(404)

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
