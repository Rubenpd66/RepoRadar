#!/usr/bin/env bash
set -euo pipefail
cd /workspace/RepoRadar
export NPM_CONFIG_CACHE=/workspace/.npm-cache
node scripts/local-env.mjs
npm ci
bash scripts/local-db.sh
npm run db:generate
npm run db:migrate
npm run db:prepare-test
npm run db:seed
