#!/bin/sh
set -e

echo "⏳ Waiting for MongoDB replica set to be ready..."

until mongosh "mongodb://admin:adminpass@mongo1:27017,mongo2:27017,mongo3:27017/admin?replicaSet=rs0" \
  --eval "db.hello().isWritablePrimary" 2>/dev/null | grep -q "true"; do
  echo "MongoDB replica set not ready yet..."
  sleep 5
done

echo "✅ MongoDB replica set is ready!"
exec "$@"
