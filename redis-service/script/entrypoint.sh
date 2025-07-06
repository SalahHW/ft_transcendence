#!/bin/sh

# Exit on any error
set -e

echo "Starting Redis configuration..."

# Check if Redis configuration file exists
if [ ! -f "/etc/redis/redis.conf" ]; then
  echo "ERROR: Redis configuration file not found at /etc/redis/redis.conf"
  exit 1
fi

# Configure Redis password if provided
if [ -n "$REDIS_PASSWORD" ]; then
  echo "Setting Redis password..."
  if ! echo "" >> /etc/redis/redis.conf; then
    echo "ERROR: Failed to write to Redis configuration file"
    exit 1
  fi
  if ! echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf; then
    echo "ERROR: Failed to set Redis password in configuration"
    exit 1
  fi
  echo "Redis password configured successfully"
else
  echo "No Redis password provided"
  exit 1
fi

echo "Redis configuration validated successfully"

exec redis-server /etc/redis/redis.conf