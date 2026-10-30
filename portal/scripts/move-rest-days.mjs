/**
 * Copies the rest days kept on the old worklogs (`WorkLogs.restDay`) to
 * their own collection (`RestDay`), which is what the portal reads now.
 * Safe to run again: a day already copied is left alone.
 *
 *   node scripts/move-rest-days.mjs          # lists what it would do
 *   node scripts/move-rest-days.mjs --apply  # does it
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { MongoClient } from 'mongodb';

const apply = process.argv.includes('--apply');
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new MongoClient(url);
await client.connect();
const db = client.db();
const Logs = db.collection('WorkLogs');
const RestDays = db.collection('RestDay');

const logs = await Logs.find(
  { logType: 'dayLog', restDay: true },
  { projection: { userId: 1, date: 1 } },
).toArray();
let added = 0;
for (const log of logs) {
  const userId = String(log.userId);
  if (!log.date || (await RestDays.findOne({ userId, date: log.date })))
    continue;
  added += 1;
  console.log(`  ${log.date} ${userId}`);
  if (apply) {
    const now = new Date().toISOString();
    await RestDays.insertOne({
      userId,
      date: log.date,
      createdAt: now,
      updatedAt: now,
    });
  }
}
console.log(`Rest days to copy: ${added} of ${logs.length}`);
console.log(apply ? 'Done.' : 'Nothing changed. Run with --apply to copy.');
await client.close();
