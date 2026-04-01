#!/usr/bin/env python
"""Helper script to start uvicorn with proper output handling."""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    stdout=sys.stdout,
    stderr=sys.stderr
)
proc.wait()
