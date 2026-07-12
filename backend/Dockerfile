# Use lightweight official Python image
FROM python:3.11-slim

# Install system dependencies (git for scanning repositories, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency requirements
COPY requirements.txt /app/

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . /app/

# Copy scanner engine so that relative imports resolve correctly (../../scanner)
COPY ../scanner /scanner

# Environment variables defaults
ENV PORT=3005
ENV NODE_ENV=production
ENV PYTHONPATH=/app

# Expose port
EXPOSE 3005

# Start FastAPI server using uvicorn (which automatically triggers background worker thread via lifespan)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3005"]
