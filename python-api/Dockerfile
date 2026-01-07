FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

# Install only essential Python dependencies first
RUN pip install --no-cache-dir fastapi

# Install additional packages in a single layer
RUN pip install --no-cache-dir \
    python-multipart \
    redis \
    python-dateutil

# Copy application code
COPY main_simple.py .
COPY requirements.txt .

# Create minimal data directory structure
RUN mkdir -p /app/data /app/exports

EXPOSE 8000

# Use the simple server that doesn't require uvicorn
CMD ["python", "main_simple.py"]