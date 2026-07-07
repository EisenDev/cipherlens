#!/usr/bin/env bash

# CipherLens Project Bootstrapping Utility
set -euo pipefail

echo "=================================================="
echo "    CipherLens Monorepo Setup & Bootstrapper"
echo "=================================================="

# Helper function to check package exists
check_dependency() {
  local cmd=$1
  if ! command -v "$cmd" &> /dev/null; then
    echo "[-] Error: '$cmd' is required but not installed." >&2
    exit 1
  else
    echo "[+] Found: $cmd ($(command -v "$cmd"))"
  fi
}

echo "Checking system prerequisites..."
check_dependency node
check_dependency npm
check_dependency python3
check_dependency docker

echo -e "\nChecking project files..."
if [ ! -d "frontend" ] || [ ! -d "backend" ] || [ ! -d "scanner" ]; then
  echo "[-] Error: Script must be executed from the repository root." >&2
  exit 1
fi

echo -e "\nInitializing Python virtual environment in scanner/..."
cd scanner
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..
echo "[+] Python dependencies installed."

echo -e "\nBootstrapping Docker containers..."
docker compose -f infrastructure/docker-compose.yml up -d
echo "[+] Database and caching services started."

echo -e "\nSetup completed successfully! Please refer to README.md for launching dev instances."
