#!/usr/bin/env bash
set -euo pipefail

PORT=3000

if lsof -Pi ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "ERROR: Port $PORT is already in use. Kill the process or set a different port."
  echo "  To find the process: lsof -i :$PORT"
  exit 1
fi

echo "Starting FeedbackPin dev server..."
echo "  URL: http://localhost:$PORT"
echo ""

npm run dev
