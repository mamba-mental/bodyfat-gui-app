"""
Performance optimization utilities for the PRIME API
Includes caching, compression, and database optimizations
"""

import hashlib
import json
import gzip
import time
from typing import Any, Dict, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
import asyncio
import sqlite3
from pathlib import Path

# Simple in-memory cache for calculations
calculation_cache = {}
CACHE_TTL = 3600  # 1 hour cache TTL


class PerformanceOptimizer:
    def __init__(self):
        self.cache = {}
        self.cache_stats = {"hits": 0, "misses": 0}

    def cache_key(self, user_data: Dict[str, Any]) -> str:
        """Generate a cache key based on user data"""
        # Remove timestamps and dynamic fields for consistent hashing
        stable_data = {
            k: v
            for k, v in user_data.items()
            if k not in ["timestamp", "created_at", "updated_at"]
        }
        return hashlib.md5(json.dumps(stable_data, sort_keys=True).encode()).hexdigest()

    def get_cached_calculation(
        self, user_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached calculation result"""
        cache_key = self.cache_key(user_data)

        if cache_key in self.cache:
            cached_item = self.cache[cache_key]

            # Check if cache is still valid
            if time.time() - cached_item["timestamp"] < CACHE_TTL:
                self.cache_stats["hits"] += 1
                return cached_item["data"]
            else:
                # Remove expired cache entry
                del self.cache[cache_key]

        self.cache_stats["misses"] += 1
        return None

    def cache_calculation(self, user_data: Dict[str, Any], result: Dict[str, Any]):
        """Cache calculation result"""
        cache_key = self.cache_key(user_data)

        self.cache[cache_key] = {"data": result, "timestamp": time.time()}

        # Clean up old cache entries (keep only last 100)
        if len(self.cache) > 100:
            oldest_keys = sorted(
                self.cache.keys(), key=lambda k: self.cache[k]["timestamp"]
            )[: len(self.cache) - 100]

            for key in oldest_keys:
                del self.cache[key]

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = (
            (self.cache_stats["hits"] / total_requests * 100)
            if total_requests > 0
            else 0
        )

        return {
            "cache_size": len(self.cache),
            "hits": self.cache_stats["hits"],
            "misses": self.cache_stats["misses"],
            "hit_rate": f"{hit_rate:.1f}%",
            "total_requests": total_requests,
        }


# Global optimizer instance
optimizer = PerformanceOptimizer()


def cached_calculation(func: Callable) -> Callable:
    """Decorator for caching expensive calculations"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Try to extract user data for cache key
        user_data = None
        if args and hasattr(args[0], "dict"):
            user_data = args[0].dict()
        elif "user_data" in kwargs:
            user_data = kwargs["user_data"]

        if user_data:
            cached_result = optimizer.get_cached_calculation(user_data)
            if cached_result:
                return cached_result

        # Execute the function
        start_time = time.time()
        result = await func(*args, **kwargs)
        execution_time = time.time() - start_time

        # Cache the result if we have user data
        if user_data and result:
            # Add performance metadata
            if isinstance(result, dict):
                result["_performance"] = {
                    "execution_time": execution_time,
                    "cached": False,
                    "timestamp": datetime.now().isoformat(),
                }

            optimizer.cache_calculation(user_data, result)

        return result

    return wrapper


def compress_response(data: Any) -> bytes:
    """Compress response data using gzip"""
    json_str = json.dumps(data) if not isinstance(data, str) else data
    return gzip.compress(json_str.encode("utf-8"))


def decompress_response(compressed_data: bytes) -> Any:
    """Decompress gzip response data"""
    json_str = gzip.decompress(compressed_data).decode("utf-8")
    return json.loads(json_str)


class DatabaseOptimizer:
    """SQLite database optimization utilities"""

    @staticmethod
    def optimize_database(db_path: str):
        """Apply performance optimizations to SQLite database"""
        with sqlite3.connect(db_path) as conn:
            # Enable WAL mode for better concurrency
            conn.execute("PRAGMA journal_mode=WAL")

            # Increase cache size
            conn.execute("PRAGMA cache_size=10000")

            # Enable memory-mapped I/O
            conn.execute("PRAGMA mmap_size=268435456")  # 256MB

            # Optimize for speed over safety (for development)
            conn.execute("PRAGMA synchronous=NORMAL")

            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys=ON")

            conn.commit()

    @staticmethod
    def create_performance_indexes(db_path: str):
        """Create additional indexes for better query performance"""
        with sqlite3.connect(db_path) as conn:
            # User data access optimization
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_name 
                ON users(name)
            """)

            # Entry querying optimization
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_entries_date_weight 
                ON entries(date DESC, weight)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_entries_user_created 
                ON entries(user_id, created_at DESC)
            """)

            # Report querying optimization
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_user_created 
                ON reports(user_id, created_at DESC)
            """)

            # Calculation caching optimization
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_calculations_user_created 
                ON calculations(user_id, created_at DESC)
            """)

            conn.commit()

    @staticmethod
    def vacuum_database(db_path: str):
        """Optimize database storage and rebuild indexes"""
        with sqlite3.connect(db_path) as conn:
            conn.execute("VACUUM")
            conn.execute("ANALYZE")
            conn.commit()


async def benchmark_function(func: Callable, *args, **kwargs) -> Dict[str, Any]:
    """Benchmark function execution time and memory usage"""
    import psutil
    import os

    process = psutil.Process(os.getpid())

    # Get initial memory usage
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    start_time = time.time()
    result = (
        await func(*args, **kwargs)
        if asyncio.iscoroutinefunction(func)
        else func(*args, **kwargs)
    )
    end_time = time.time()

    # Get final memory usage
    final_memory = process.memory_info().rss / 1024 / 1024  # MB

    return {
        "result": result,
        "execution_time": end_time - start_time,
        "memory_usage_mb": final_memory - initial_memory,
        "peak_memory_mb": final_memory,
    }


def performance_monitor(func: Callable) -> Callable:
    """Decorator to monitor function performance"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        benchmark_result = await benchmark_function(func, *args, **kwargs)

        # Log performance metrics
        print(f"Performance Monitor - {func.__name__}:")
        print(f"  Execution Time: {benchmark_result['execution_time']:.3f}s")
        print(f"  Memory Usage: {benchmark_result['memory_usage_mb']:.2f}MB")

        return benchmark_result["result"]

    return wrapper


# Background task to clean up expired cache entries
async def cleanup_cache():
    """Background task to clean up expired cache entries"""
    while True:
        current_time = time.time()
        expired_keys = [
            key
            for key, value in optimizer.cache.items()
            if current_time - value["timestamp"] > CACHE_TTL
        ]

        for key in expired_keys:
            del optimizer.cache[key]

        if expired_keys:
            print(f"Cleaned up {len(expired_keys)} expired cache entries")

        # Run cleanup every 30 minutes
        await asyncio.sleep(1800)


# Initialize database optimizations
async def initialize_performance_optimizations(db_path: str = None):
    """Initialize all performance optimizations"""
    import concurrent.futures

    if db_path is None:
        db_path = Path(__file__).parent.parent / "data" / "bodyfat.db"

    # Run database optimizations in a thread pool to avoid blocking
    if Path(db_path).exists():
        loop = asyncio.get_event_loop()
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            await loop.run_in_executor(
                executor, DatabaseOptimizer.optimize_database, str(db_path)
            )
            await loop.run_in_executor(
                executor, DatabaseOptimizer.create_performance_indexes, str(db_path)
            )
            print("Database performance optimizations applied")
        except Exception as e:
            print(f"Warning: Could not apply database optimizations: {e}")
        finally:
            executor.shutdown(wait=False)

    # Start background cache cleanup
    asyncio.create_task(cleanup_cache())
    print("Performance monitoring initialized")
