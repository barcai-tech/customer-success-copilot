#!/usr/bin/env python3
"""
Lightweight local HTTP server that forwards POST /<tool> to the corresponding
Lambda handler in backend/tools/*/handler.py. No external dependencies.

Usage:
  export HMAC_SECRET=...
  export ALLOWED_ORIGIN=http://localhost:3000
  python backend/dev_server.py --port 8787

Then set frontend BACKEND_BASE_URL=http://127.0.0.1:8787
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import argparse
from typing import Dict

TOOLS = {
    "get_customer_usage": "tools.get_customer_usage.handler",
    "get_recent_tickets": "tools.get_recent_tickets.handler",
    "get_contract_info": "tools.get_contract_info.handler",
    "calculate_health": "tools.calculate_health.handler",
    "generate_email": "tools.generate_email.handler",
    "generate_qbr_outline": "tools.generate_qbr_outline.handler",
}


def load_handler(module_path: str):
    mod = __import__(module_path, fromlist=["handler"])
    return getattr(mod, "handler")


class Handler(BaseHTTPRequestHandler):
    def _send(self, status_code: int, headers: Dict[str, str], body: str):
        self.send_response(status_code)
        for k, v in headers.items():
            # Avoid duplicate header case normalization issues
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def do_OPTIONS(self):  # CORS preflight passthrough
        path = self.path.strip("/")
        if path not in TOOLS:
            self.send_error(404, "Not Found")
            return
        event = {
            "httpMethod": "OPTIONS",
            "headers": self._collect_headers(),
            "body": "",
        }
        handler = load_handler(TOOLS[path])
        resp = handler(event, None)
        self._send(resp.get("statusCode", 200), resp.get("headers", {}), resp.get("body", ""))

    def do_POST(self):
        path = self.path.strip("/")
        if path not in TOOLS:
            self.send_error(404, "Not Found")
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        event = {
            "httpMethod": "POST",
            "headers": self._collect_headers(),
            "body": raw,
        }
        handler = load_handler(TOOLS[path])
        try:
            resp = handler(event, None)
        except Exception as e:
            self.send_error(500, f"Handler error: {type(e).__name__}")
            return
        self._send(resp.get("statusCode", 200), resp.get("headers", {}), resp.get("body", ""))

    def _collect_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        for k in self.headers.keys():
            headers[k] = self.headers.get(k)
        return headers


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    server = HTTPServer((args.host, args.port), Handler)
    print(f"Dev server listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

