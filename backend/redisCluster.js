// redisCluster.js
const { Cluster } = require("ioredis");

let cluster; // singleton instance

function getCluster() {
  if (!cluster) {
    const nodes = (process.env.REDIS_NODES || "").split(",").map((host) => {
      const [hostName, port] = host.split(":");
      return { host: hostName, port: parseInt(port, 10) };
    });

    console.log("🔗 Connecting to Redis cluster nodes:", nodes);

    cluster = new Cluster(nodes, {
      redisOptions: {
        password: process.env.REDIS_PASSWORD || undefined,
      },
      scaleReads: "slave",             // replicas allowed for reads
      enableReadyCheck: false,         // avoid blocking on startup
      maxRedirections: 100,            // allow more MOVED redirections
      retryDelayOnFailover: 2000,      // retry if cluster is failing over
      retryDelayOnClusterDown: 2000,   // retry if cluster temporarily down
      retryDelayOnTryAgain: 2000,      // retry if ASK/TRYAGAIN
      slotsRefreshTimeout: 2000,
      slotsRefreshInterval: 5000,      // keep refreshing topology
    });

    cluster.on("error", (err) => {
      console.error("❌ Redis Cluster Error:", err.message);
    });

    cluster.on("ready", () => {
      console.log("✅ Redis Cluster connection ready");
    });
  }
  return cluster;
}

module.exports = { getCluster };
