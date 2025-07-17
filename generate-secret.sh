#!/bin/sh

ENV_FILE="./jwt-service/.env"
KEY_NAME="SECRETKEY"

echo "Generating new JWT secret..."

if [ ! -f "$ENV_FILE" ]; then
  echo ".env not found"
  echo "creating .env file"
  touch "$ENV_FILE"
fi

NEW_SECRET=$(openssl rand -hex 64)

# Remove existing key
sed -i.bak "/^${KEY_NAME}=/d" "$ENV_FILE"

echo "${KEY_NAME}=${NEW_SECRET}        # Auto-regenerated secret key for JWT" >> "$ENV_FILE"

echo "New secret written to $ENV_FILE"
