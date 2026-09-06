#!/usr/bin/env bash
# Usage: ./migrate.sh <MigrationName>

# NO set -e — we handle errors manually so output stays visible

die() {
  echo ""
  echo "ERROR: $1"
  echo ""
  echo "Press Enter to close..."
  read -r
  exit 1
}

if [ -z "$1" ]; then
  echo "Usage: ./migrate.sh <MigrationName>"
  echo "Press Enter to close..."
  read -r
  exit 1
fi

MIGRATION_NAME="$1"

# Load .env — check repo root first, then current dir
if [ -f ../.env ]; then
  echo "==> Loading ../.env"
  set -a
  source ../.env
  set +a
elif [ -f .env ]; then
  echo "==> Loading .env"
  set -a
  source .env
  set +a
else
  die ".env file not found. Copy .env.example to .env and fill in values."
fi

echo "==> DB_NAME=${DB_NAME} DB_USER=${DB_USER}"

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  die "DB_NAME, DB_USER, or DB_PASSWORD is empty in .env"
fi

echo "==> Generating migration: $MIGRATION_NAME"
ConnectionStrings__DefaultConnection="Host=localhost;Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}" \
  dotnet ef migrations add "$MIGRATION_NAME" \
    --project src/RelatioApp.Infrastructure \
    --startup-project src/RelatioApp.API \
    --output-dir Persistence/Migrations \
    --verbose

if [ $? -ne 0 ]; then
  die "dotnet ef migrations add failed. See output above."
fi

echo ""
echo "==> Migration generated. Rebuilding API container..."
docker compose build api
if [ $? -ne 0 ]; then
  die "docker compose build api failed."
fi

echo "==> Restarting API container..."
docker compose up -d api
if [ $? -ne 0 ]; then
  die "docker compose up api failed."
fi

echo ""
echo "==> Done! Migration '$MIGRATION_NAME' applied."
echo "Press Enter to close..."
read -r
