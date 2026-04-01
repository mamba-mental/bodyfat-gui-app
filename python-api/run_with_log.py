#!/usr/bin/env python
"""Run uvicorn with logging to file for debugging."""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.log')

with open(log_file, 'w') as f:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8313"],
        stdout=f,
        stderr=subprocess.STDOUT,
        bufsize=1,
        universal_newlines=True
    )
    print(f"Server started with PID {proc.pid}, logging to {log_file}")
    proc.wait()
