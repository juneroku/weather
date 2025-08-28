import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import pino from 'pino';

const log = pino();
const app = express();
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/weatherdb';
const client = new MongoClient(MONGO_URI);

async function start() {
  await client.connect();
  const db = client.db();
  const measurements = db.collection('measurements');

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/latest', async (req, res) => {
    const doc = await measurements.find().sort({ timestamp: -1 }).limit(1).toArray();
    res.json(doc[0] || null);
  });

  app.get('/api/hourly', async (req, res) => {
    const hours = Math.min(parseInt(req.query.hours ?? '24', 10), 168);
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const items = await measurements
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray();

    res.json({
      from: since,
      to: new Date(),
      count: items.length,
      series: items.map((x) => ({
        time: x.timestamp,
        temperature_2m: x.temperature_2m,
        relative_humidity_2m: x.relative_humidity_2m,
        wind_speed_10m: x.wind_speed_10m
      }))
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => log.info(`API listening on :${PORT}`));
}

start().catch((e) => {
  log.error(e);
  process.exit(1);
});
