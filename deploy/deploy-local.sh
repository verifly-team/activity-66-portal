#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f package.json ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

echo "[1/3] Installing dependencies"
npm ci --no-audit --no-fund

echo "[2/3] Building static site"
npm run build

echo "[3/3] Building and deploying Docker image"
bash deploy/deploy-docker-image.sh
