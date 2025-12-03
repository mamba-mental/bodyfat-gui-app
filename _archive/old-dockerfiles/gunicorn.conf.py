#!/usr/bin/env python3
"""
Production Gunicorn configuration for ApexFit AI Backend
Optimized for performance, security, and reliability
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = int(os.environ.get("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = os.environ.get("WORKER_CLASS", "uvicorn.workers.UvicornWorker")
worker_connections = int(os.environ.get("WORKER_CONNECTIONS", 1000))
max_requests = int(os.environ.get("MAX_REQUESTS", 1000))
max_requests_jitter = int(os.environ.get("MAX_REQUESTS_JITTER", 100))

# Timeout settings
timeout = int(os.environ.get("TIMEOUT", 30))
keepalive = int(os.environ.get("KEEPALIVE", 5))
graceful_timeout = 30

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Performance
preload_app = True
reuse_port = True

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "apexfit-ai-backend"

# Restart workers after this many requests, with jitter
max_requests = 1000
max_requests_jitter = 100

# Restart workers after this much time
timeout = 30
keepalive = 5

# Security: Drop privileges (already handled by Dockerfile USER directive)
# user = 1001
# group = 1001

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("ApexFit AI Backend is ready to accept connections")

def worker_int(worker):
    """Called just after a worker has been started."""
    worker.log.info(f"Worker {worker.pid} booted")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"Worker {worker.pid} about to be forked")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker {worker.pid} spawned")

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("Forked child, re-executing.")

def on_exit(server):
    """Called just before exiting."""
    server.log.info("ApexFit AI Backend is shutting down")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("ApexFit AI Backend is reloading")

# Performance tuning
forwarded_allow_ips = '*'
secure_scheme_headers = {
    'X-FORWARDED-PROTOCOL': 'ssl',
    'X-FORWARDED-PROTO': 'https',
    'X-FORWARDED-SSL': 'on'
}