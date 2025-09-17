#!/bin/bash
set -e

REDIS_PASSWORD=${REDIS_PASSWORD:-pass123}
NODES="redis-node-1:6379 redis-node-2:6379 redis-node-3:6379 redis-node-4:6379 redis-node-5:6379 redis-node-6:6379"

# Wait for all nodes to be alive
for host in $NODES; do
  until redis-cli -a "$REDIS_PASSWORD" -h ${host%:*} -p ${host#*:} ping | grep -q PONG; do
    echo "Waiting for $host..."
    sleep 2
  done
done

# Retry cluster creation until success
MAX_RETRIES=10
COUNT=0

while true; do
  if redis-cli -a "$REDIS_PASSWORD" -h redis-node-1 -p 6379 cluster info | grep -q "cluster_state:ok"; then
    echo "Redis cluster already configured."
    break
  fi

  echo "Attempting to create cluster (try $((COUNT+1))/$MAX_RETRIES)..."
  yes yes | redis-cli -a "$REDIS_PASSWORD" --cluster create $NODES --cluster-replicas 1 && break

  COUNT=$((COUNT+1))
  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Cluster creation failed after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "Retrying in 5s..."
  sleep 5
done

# ✅ Extra step: wait until cluster is stable
echo "⏳ Waiting for Redis cluster to be ready..."
while true; do
  STATE=$(redis-cli -a "$REDIS_PASSWORD" -h redis-node-1 -p 6379 cluster info 2>/dev/null | grep cluster_state | cut -d: -f2)
  if [ "$STATE" = "ok" ]; then
    echo "✅ Redis cluster is READY!"
    break
  fi
  echo "Cluster state: $STATE, retrying in 3s..."
  sleep 3
done

