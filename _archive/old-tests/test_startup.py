#!/usr/bin/env python
"""Test the API startup without hanging"""

import asyncio
import sys
import time

sys.path.insert(0, "python-api")


async def test_startup():
    from performance_optimizations import initialize_performance_optimizations

    try:
        print("Starting initialization...")
        start = time.time()
        await initialize_performance_optimizations()
        elapsed = time.time() - start
        print(f"✓ Initialization completed successfully in {elapsed:.2f}s!")
        return True
    except Exception as e:
        print(f"✗ Error during initialization: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    result = asyncio.run(test_startup())
    sys.exit(0 if result else 1)
