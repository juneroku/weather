import axios from 'axios';
import cron from 'node-cron';
import { MongoClient } from 'mongodb';
import pino from 'pino';

const log = pino();

const {
  MONGO_URI = 'mongodb://mongo:27017/weatherdb',
  LAT = '13.7563',
  LON = '100.5018',
  INTERVAL_CRON = '*/15 * * * *'
} = process.env;

const client = new MongoClient(MONGO_URI);

async function fetchAndStore() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const { data } = await axios.get(url, { timeout: 10000 });

    const db = client.db();
    const measurements = db.collection('measurements');

    const iso = data.current.time;
    const doc = {
      source: 'open-meteo',
      lat: Number(LAT),
      lon: Number(LON),
      timestamp: new Date(iso),
      temperature_2m: data.current.temperature_2m,
      relative_humidity_2m: data.current.relative_humidity_2m,
      wind_speed_10m: data.current.wind_speed_10m
    };

    await measurements.updateOne(
      { source: 'open-meteo', timestamp: doc.timestamp, lat: doc.lat, lon: doc.lon },
      { $set: doc },
      { upsert: true }
    );

    log.info({ t: doc.timestamp.toISOString(), temp: doc.temperature_2m }, 'Stored current weather');
  } catch (err) {
    log.error(err, 'Fetch/Store failed');
  }
}

async function main() {
  try {
    await client.connect();
    const db = client.db();
    await db.collection('measurements').createIndex({ timestamp: -1 });

    await fetchAndStore();
    cron.schedule(INTERVAL_CRON, fetchAndStore);

    log.info(`Collector running LAT,LON=${LAT},${LON} schedule=${INTERVAL_CRON}`);
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
}

main();
