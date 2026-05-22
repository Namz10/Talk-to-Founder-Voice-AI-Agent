import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse
import threading
from livekit import api

class TokenHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/api/token':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            room_name = query_params.get('roomName', ['maneuver-demo'])[0]
            participant_name = query_params.get('participantName', [''])[0]
            
            if not participant_name:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'participantName is required'}).encode('utf-8'))
                return

            api_key = os.environ.get('LIVEKIT_API_KEY')
            api_secret = os.environ.get('LIVEKIT_API_SECRET')

            if not api_key or not api_secret:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Server credentials missing'}).encode('utf-8'))
                return

            try:
                # Generate token using livekit-api
                token = api.AccessToken(api_key, api_secret) \
                    .with_identity(participant_name) \
                    .with_name(participant_name) \
                    .with_grants(api.VideoGrants(
                        room_join=True,
                        room=room_name,
                        can_publish=True,
                        can_subscribe=True,
                        can_publish_data=True
                    ))
                jwt_token = token.to_jwt()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'token': jwt_token}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_token_server(port=8080):
    server = HTTPServer(('0.0.0.0', port), TokenHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"Secure Token Server running on port {port}")
    return server
