const { Queue } = require('bullmq');
const { getCluster } = require('./redisCluster');

const queue = new Queue('crud-queue', {
  connection: getCluster(),
  prefix: '{bullmq}'   // 👈 must match worker
});

module.exports = queue;
