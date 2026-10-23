#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image='postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb'
if docker container inspect reporadar-db >/dev/null 2>&1; then
  actual_image=$(docker inspect -f '{{.Config.Image}}' reporadar-db)
  case "$actual_image" in postgres:17-alpine*) ;; *) echo 'El nombre reporadar-db pertenece a otro contenedor. No se modifica.' >&2; exit 1;; esac
  docker start reporadar-db >/dev/null
else
  docker run -d --name reporadar-db -e POSTGRES_USER=reporadar -e POSTGRES_PASSWORD=local-development-only -e POSTGRES_DB=reporadar -p 127.0.0.1:5432:5432 -v reporadar_pgdata:/var/lib/postgresql/data "$image" >/dev/null
fi
ready=false
for attempt in $(seq 1 30); do
  if docker exec reporadar-db pg_isready -U reporadar >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'PostgreSQL no está disponible.' >&2; exit 1; fi
if [ "$(docker exec reporadar-db psql -U reporadar -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='reporadar_test'")" != '1' ]; then
  docker exec reporadar-db createdb -U reporadar reporadar_test
fi
