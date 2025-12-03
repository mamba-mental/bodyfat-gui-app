#!/usr/bin/env python3
"""
Simple FastAPI server for PRIME calculations
"""

import os
import sys
import json
from datetime import datetime

# Basic HTTP server without dependencies
from http.server import HTTPServer, BaseHTTPRequestHandler

class PRIMEHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            response = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "engine": {
                    "type": "PRIME",
                    "version": "4.0.0",
                    "confidence_analysis": "available"
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path in ['/calculate', '/generate-report', '/recalculate']:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode())
                
                # Basic PRIME calculation (simplified)
                current_weight = data.get("current_weight", 180)
                goal_weight = data.get("goal_weight", 170)
                current_bf = data.get("current_bf", 20)
                goal_bf = data.get("goal_bf", 15)
                timeline_weeks = int(data.get("timeline_weeks", 12))
                
                # For recalculation, check if we have new entry data
                if self.path == '/recalculate' and 'new_entry' in data:
                    new_entry = data['new_entry']
                    # Update current weight and BF with new entry
                    current_weight = new_entry.get('weight', current_weight)
                    if new_entry.get('body_fat_percentage'):
                        current_bf = new_entry.get('body_fat_percentage', current_bf)
                
                result = {
                    "current_body_fat_percentage": current_bf,
                    "goal_body_fat_percentage": goal_bf,
                    "total_weight_loss": current_weight - goal_weight,
                    "fat_loss": 10,
                    "muscle_preservation": 95,
                    "timeline_weeks": timeline_weeks,
                    "daily_calorie_intake": 2000,
                    "protein_requirement": 140,
                    "tdee": 2500,
                    "confidence_score": 85,
                    "feasibility": "achievable",
                    "current_weight": current_weight,
                    "goal_weight": goal_weight,
                    "progression": [
                        {
                            "date": f"2025-07-{8+i:02d}",
                            "week": i+1,
                            "weight": current_weight - (i * 0.8),
                            "body_fat_percentage": current_bf - (i * 0.3),
                            "daily_calorie_intake": 2000 - (i * 10),
                            "tdee": 2500 - (i * 5),
                            "lean_mass": (current_weight - (i * 0.8)) * (1 - (current_bf - (i * 0.3))/100),
                            "fat_mass": (current_weight - (i * 0.8)) * ((current_bf - (i * 0.3))/100),
                            "muscle_gain": 0.1 * i,
                            "rmr": 1800 - (i * 3),
                            "tef": 200,
                            "neat": 300 + (i * 2),
                            "weekly_weight_loss": 0.8
                        }
                        for i in range(min(timeline_weeks, 16))
                    ]
                }
                
                # For generate-report, wrap in success object
                if self.path == '/generate-report':
                    result = {
                        "success": True,
                        "data": result,
                        "html_content": f"<h1>Report for {data.get('name', 'User')}</h1><p>Progress tracking report generated.</p>"
                    }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                error_response = {"error": str(e)}
                self.wfile.write(json.dumps(error_response).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    port = 8000
    server = HTTPServer(('0.0.0.0', port), PRIMEHandler)
    print(f"PRIME calculation server running on http://127.0.0.1:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()