require('dotenv').config();
const mongoose = require('mongoose');
const { Worker } = require('bullmq');
const Item = require('./models/Item');
const { getCluster } = require('./redisCluster');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Worker connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Worker error:", err));

const worker = new Worker(
  'crud-queue',    // 👈 must match queue.js
  async job => {
    const { name, value, id } = job.data;

    if (job.name === 'create') {
      await Item.create({ name, value });
    } else if (job.name === 'update') {
      await Item.findByIdAndUpdate(id, { name, value });
    } else if (job.name === 'delete') {
      await Item.findByIdAndDelete(id);
    }
  },
  {
    connection: getCluster(),
    prefix: '{bullmq}'   // 👈 must match queue.js
  }
);

worker.on('completed', job => {
  console.log(`✅ Job ${job.id} (${job.name}) completed successfully`);
});

worker.on('failed', async (job, err) => {
  if (job.attemptsMade < job.opts.attempts) {
    console.warn(
      `⚠️ Job ${job.id} (${job.name}) failed on attempt ${job.attemptsMade}. Retrying... Error: ${err.message}`
    );
  } else {
    console.error(
      `❌ Job ${job.id} (${job.name}) permanently failed after ${job.attemptsMade} attempts. Error: ${err.message}`
    );

    // 🔄 Auto-requeue failed job
    try {
      await job.queue.add(
        job.name,       // same job type
        job.data,       // same data
        {
          attempts: 3,  // retry attempts again
          backoff: { type: 'exponential', delay: 5000 } // 5s, 10s, 20s
        }
      );
      console.log(`🔁 Job ${job.id} requeued for retry`);
    } catch (reErr) {
      console.error(`⚠️ Failed to requeue job ${job.id}:`, reErr.message);
    }
  }
});
