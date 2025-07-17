#!/bin/sh

# Exit on any error
set -e

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

if [ -z "$REDIS_SERVICE_PASSWORD" ]; then
  echo "ERROR: REDIS_SERVICE_PASSWORD environment variable is not set"
  exit 1
fi

echo "" >> /etc/redis/redis.conf
echo "port $REDIS_SERVICE_PORT" >> /etc/redis/redis.conf
echo "requirepass $REDIS_SERVICE_PASSWORD" >> /etc/redis/redis.conf

exec redis-server /etc/redis/redis.conf