# CivicFlow API Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
    curl \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Install Python dependencies using uv (much faster)
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -e .

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 civicflow && chown -R civicflow:civicflow /app
USER civicflow

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the API
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
