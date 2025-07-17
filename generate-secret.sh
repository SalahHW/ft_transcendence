#!/bin/sh

ENV_FILE="./jwt-service/.env"
KEY_NAME="SECRETKEY"

echo "🔐 Generating new JWT secret..."

# Crée .env si inexistant
if [ ! -f "$ENV_FILE" ]; then
  echo "📄 .env not found, creating..."
  touch "$ENV_FILE"
fi

# Génère une nouvelle clé
NEW_SECRET=$(openssl rand -hex 64)

# Supprime l'existante
sed -i.bak "/^${KEY_NAME}=/d" "$ENV_FILE"

# Ajoute la nouvelle
echo "${KEY_NAME}=${NEW_SECRET}        # Auto-regenerated secret key for JWT" >> "$ENV_FILE"

echo "✅ New secret written to $ENV_FILE"