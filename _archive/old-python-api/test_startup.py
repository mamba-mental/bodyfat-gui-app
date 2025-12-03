#!/usr/bin/env python3
"""
Test script to verify Python API startup without hanging.
This script attempts to start the API and verify it responds to health checks.
"""

import subprocess
import time
import requests
import sys
import signal
import os


def test_api_startup():
    """Test that the API starts up without hanging and responds to requests"""

    print("=" * 60)
    print("Testing Python API Startup")
    print("=" * 60)

    # Start the API server
    print("\n1. Starting Python API server on port 8001...")
    api_process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    print("   Process started with PID:", api_process.pid)

    # Wait for the server to start (with timeout)
    timeout = 30  # 30 seconds timeout
    start_time = time.time()
    api_ready = False

    print(f"\n2. Waiting for API to be ready (timeout: {timeout}s)...")

    while time.time() - start_time < timeout:
        try:
            response = requests.get("http://127.0.0.1:8001/health", timeout=2)
            if response.status_code == 200:
                api_ready = True
                print("   ✓ API health endpoint responded successfully!")
                print(f"   Response: {response.json()}")
                break
        except requests.exceptions.ConnectionError:
            elapsed = time.time() - start_time
            print(f"   Waiting... ({elapsed:.1f}s elapsed)")
            time.sleep(1)
        except requests.exceptions.Timeout:
            elapsed = time.time() - start_time
            print(f"   Timeout on health check... ({elapsed:.1f}s elapsed)")
            time.sleep(1)
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"   Error: {e} ({elapsed:.1f}s elapsed)")
            time.sleep(1)

    # Clean up
    print("\n3. Terminating API process...")
    api_process.terminate()

    try:
        api_process.wait(timeout=5)
        print("   ✓ Process terminated cleanly")
    except subprocess.TimeoutExpired:
        print("   ⚠ Process did not terminate, killing it...")
        api_process.kill()
        api_process.wait()

    # Report results
    print("\n" + "=" * 60)
    if api_ready:
        print("✓ TEST PASSED: API started successfully and responds to requests")
        print("=" * 60)
        return True
    else:
        elapsed = time.time() - start_time
        print(f"✗ TEST FAILED: API did not respond within {elapsed:.1f}s")
        print("=" * 60)

        # Print any error output
        stdout, stderr = api_process.communicate(timeout=2)
        if stderr:
            print("\nError output from API:")
            print(stderr[:1000])  # Print first 1000 chars

        return False


if __name__ == "__main__":
    success = test_api_startup()
    sys.exit(0 if success else 1)
