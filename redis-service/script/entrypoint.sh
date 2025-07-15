#!/bin/sh

# Exit on any error
set -e

echo "Starting Redis configuration..."

# Check if Redis configuration file exists
if [ ! -f "/etc/redis/redis.conf" ]; then
  echo "ERROR: Redis configuration file not found at /etc/redis/redis.conf"
  exit 1
fi

# Check if required environment variables are present
if [ -z "$REDIS_SERVICE_PORT" ]; then
  echo "ERROR: REDIS_SERVICE_PORT environment variable is not set"
  exit 1
fi

if [ -z "$REDIS_PASSWORD" ]; then
  echo "ERROR: REDIS_PASSWORD environment variable is not set"
  exit 1
fi

# Configure Redis port from environment variable
REDIS_PORT=${REDIS_SERVICE_PORT}
echo "Configuring Redis port: $REDIS_PORT"

# Update port in redis.conf
sed -i "s/^port .*/port $REDIS_PORT/" /etc/redis/redis.conf

# Verify port was set correctly
if ! grep -q "^port $REDIS_PORT" /etc/redis/redis.conf; then
  echo "ERROR: Failed to set Redis port in configuration"
  exit 1
fi

echo "Redis port configured to: $REDIS_PORT"

# Configure Redis password if provided
echo "Setting Redis password..."

# Remove any existing requirepass directive
sed -i '/^requirepass /d' /etc/redis/redis.conf

# Add the new password
if ! echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf; then
  echo "ERROR: Failed to set Redis password in configuration"
  exit 1
fi
echo "Redis password configured successfully"

echo "Redis configuration completed successfully"

# Display final configuration for debugging
echo "Final Redis configuration:"
echo "Port: $(grep '^port ' /etc/redis/redis.conf)"
echo "Password: ***configured***"

exec redis-server /etc/redis/redis.conf