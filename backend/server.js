require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Item = require('./models/Item');
const queue = require('./queue');
const { getCluster } = require('./redisCluster');

// --- Bull Board imports ---
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

const app = express();
app.use(bodyParser.json());

app.use(cors({
  origin: 'http://34.100.158.99:3000',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// handle preflight
app.options('*', cors());

// --- MongoDB ---
mongoose.connect(
  process.env.MONGO_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => {
  console.log('Connected to MongoDB replica set');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// --- API routes ---
app.post('/api/items', async (req, res) => {
  const { name, value } = req.body;
  queue.add('create', { name, value }, {
    attempts: 3,  // retry up to 3 times
    backoff: { type: 'exponential', delay: 2000 } // 2s, 4s, 8s
  })
    .then(() => console.log("Job queued with retry logic"))
    .catch(err => console.error("Queue error:", err));
  res.status(202).json({ message: 'Item creation queued' });
});

app.put('/api/items/:id', async (req, res) => {
  const { name, value } = req.body;
  await queue.add('update', { id: req.params.id, name, value }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  res.status(202).json({ message: 'Item update queued' });
});

app.delete('/api/items/:id', async (req, res) => {
  await queue.add('delete', { id: req.params.id }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  res.status(202).json({ message: 'Item delete queued' });
});

// --- Get all items ---
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();  // fetch all items from MongoDB
    res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Health & Redis test ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const redis = getCluster();
app.get('/test-redis', async (req, res) => {
  try {
    await redis.set('ping', 'pong');
    const val = await redis.get('ping');
    res.json({ redis: val });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bull Board Dashboard ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(queue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// --- Retry failed jobs ---
app.post('/api/retry-failed', async (req, res) => {
  try {
    const jobs = await queue.getFailed();  // get failed jobs
    for (const job of jobs) {
      await job.retry();  // retry them
    }
    res.json({ message: `Retried ${jobs.length} failed jobs` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- List failed jobs ---
app.get('/api/failed-jobs', async (req, res) => {
  try {
    const jobs = await queue.getFailed();
    res.json(jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();  // fetch all items from MongoDB
    res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
app.listen(process.env.PORT, () => {
  console.log(`API listening on port ${process.env.PORT}`);
  console.log(`Bull Board running at http://localhost:${process.env.PORT}/admin/queues`);
});


