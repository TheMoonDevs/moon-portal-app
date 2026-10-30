/**
 * Gives each migrated task that has no work point one for its day.
 *
 * migrate-tasks-first.mjs made a work point only for lines with a status
 * emoji at their start or with a history. A plain line ("SB - Funnel view
 * ✅") became a done task with no point, and every score (the leaderboard,
 * the month's level card, the World) counts days and finished tasks from
 * points, so most old work counted for nothing.
 *
 * The point is dated the task's day, says done when the task is done, and
 * is the person's (or Claude's, for a task Claude made). Archived and
 * ignored tasks are left alone. Safe to run again: a task with any point
 * is skipped.
 *
 *   node scripts/backfill-migrated-points.mjs          # counts only, writes nothing
 *   node scripts/backfill-migrated-points.mjs --apply  # does it
 *
 * Run fix-migrated-user-ids.mjs first. Reads DATABASE_URL from the
 * environment or portal/.env.
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
const Tasks = db.collection('Task');
const Points = db.collection('WorkPoint');

const tasks = await Tasks.find(
  {
    'migratedFrom.key': { $type: 'string' },
    forDate: { $type: 'string' },
    status: { $nin: ['ARCHIVED', 'IGNORED'] },
  },
  {
    projection: {
      ownerId: 1,
      status: 1,
      forDate: 1,
      madeBy: 1,
      companyId: 1,
      projectId: 1,
      completedAt: 1,
      createdAt: 1,
      migratedFrom: 1,
    },
  },
).toArray();

const withPoints = new Set(
  (
    await Points.distinct('taskId', {
      taskId: { $in: tasks.map((t) => String(t._id)) },
    })
  ).map(String),
);
const missing = tasks.filter((t) => !withPoints.has(String(t._id)));

const iso = (v) =>
  v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null;

const docs = missing.map((t) => {
  const at =
    iso(t.completedAt) ?? iso(t.createdAt) ?? `${t.forDate}T12:00:00.000Z`;
  return {
    userId: String(t.ownerId),
    taskId: String(t._id),
    date: t.forDate,
    text: '',
    status: t.status === 'DONE' ? 'done' : null,
    by: t.madeBy === 'claude' ? 'claude' : 'person',
    at,
    isPrivate: !t.projectId && (!t.companyId || t.companyId === 'personal'),
    migratedFrom: { ...t.migratedFrom, backfilled: true },
    createdAt: at,
    updatedAt: at,
  };
});

const people = new Set(docs.map((d) => d.userId));
const done = docs.filter((d) => d.status === 'done').length;
console.log(
  `${tasks.length} migrated tasks; ${docs.length} have no work point (${done} done) across ${people.size} people.`,
);

if (apply) {
  let written = 0;
  for (let i = 0; i < docs.length; i += 1000) {
    const res = await Points.insertMany(docs.slice(i, i + 1000), {
      ordered: false,
    });
    written += res.insertedCount;
  }
  console.log(`Applied: ${written} work points written.`);
} else console.log('Dry run (nothing written; pass --apply to write).');

await client.close();
