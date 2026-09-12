#!/usr/bin/env python3
"""Static dev server for this site.

Serves the working tree with caching switched off, so an edit is always
the thing the browser runs. Development only.
"""
import functools
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4599
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), NoCacheHandler) as httpd:
        print("serving on http://localhost:%d" % port)
        httpd.serve_forever()
