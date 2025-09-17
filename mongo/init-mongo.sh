#!/bin/bash
set -e

echo "⏳ Waiting for MongoDB nodes..."
for host in mongo1 mongo2 mongo3; do
  until mongosh --host $host --eval "db.hello().isWritablePrimary" >/dev/null 2>&1; do
    echo "Waiting for $host..."
    sleep 3
  done
done

# Initiate replica set only if not already initiated
if mongosh --host mongo1 --eval "rs.isMaster().ismaster" | grep -q "false"; then
  echo "⚙️ Initiating replica set..."
  mongosh --host mongo1 <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})
EOF
  sleep 5
fi

echo "🔑 Creating root user (admin)..."
mongosh --host mongo1 <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "adminpass",
  roles: [ { role: "root", db: "admin" } ]
})
EOF

echo "👩‍💻 Creating application user (cruduser)..."
mongosh "mongodb://admin:adminpass@mongo1:27017/admin?replicaSet=rs0" <<EOF
use crudapp
db.createUser({
  user: "cruduser",
  pwd: "crudpass",
  roles: [{ role: "readWrite", db: "crudapp" }]
})
EOF

echo "✅ Replica set ready, users created."
