#!/usr/bin/env bash
set -euo pipefail
cd /workspace/RepoRadar
export NODE_USE_ENV_PROXY=1
bash scripts/local-db.sh
npm run db:migrate
exec npm run dev -- --port 3000
