# Laya Classifier Dockerfile - CPU-only PyTorch
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Increased timeout for large packages
ENV UV_HTTP_TIMEOUT=600

# STEP 1: Install CPU-only PyTorch FIRST (prevents CUDA dependencies)
# Must use --index-url to force CPU-only wheel
RUN uv pip install --system --no-cache \
    torch==2.2.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# STEP 2: Install remaining dependencies (torch is already present, so no CUDA re-pull)
COPY requirements.txt ./
RUN uv pip install --system --no-cache \
    fastapi \
    uvicorn \
    pydantic \
    sentence-transformers \
    httpx \
    --find-links https://download.pytorch.org/whl/cpu/torch_stable.html

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 laya && chown -R laya:laya /app
USER laya

# Expose port
EXPOSE 8001

# Health check with longer start period for model loading
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the classifier
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
