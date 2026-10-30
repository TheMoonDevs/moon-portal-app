/**
 * Read-only: what one person has stored for the work view, to see why their
 * user page is empty. Prints their worklog days, tasks and work points, how
 * their ids are stored, and the latest dates of each.
 *
 *   node scripts/check-person-work.mjs <username | email | user id>
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { MongoClient, ObjectId } from 'mongodb';

const who = process.argv[2];
const url = process.env.DATABASE_URL?.trim();
if (!who || !url) {
  console.error(
    who ? 'DATABASE_URL is not set.' : 'Pass a username, email or id.',
  );
  process.exit(1);
}

const client = new MongoClient(url);
await client.connect();
const db = client.db();

const user = await db.collection('User').findOne({
  $or: [
    ...(ObjectId.isValid(who) ? [{ _id: new ObjectId(who) }] : []),
    { username: who },
    { email: who },
  ],
});
if (!user) {
  console.log(`No user matches "${who}".`);
  await client.close();
  process.exit(0);
}
const id = String(user._id);
const both = [id, user._id];
console.log(`${user.name ?? ''} @${user.username ?? ''} ${id}`);

const Logs = db.collection('WorkLogs');
const Tasks = db.collection('Task');
const Points = db.collection('WorkPoint');

const latest = async (col, filter, field) =>
  (
    await col
      .find(filter)
      .sort({ [field]: -1 })
      .limit(1)
      .toArray()
  )[0]?.[field] ?? '-';

const logs = { userId: { $in: both }, logType: 'dayLog' };
console.log(
  `Worklog days: ${await Logs.countDocuments(logs)} (${await Logs.countDocuments({ ...logs, tasksFirst: true })} moved to tasks), latest ${await latest(Logs, logs, 'date')}`,
);

const owned = (v) => ({ $or: [{ ownerId: v }, { assigneeIds: v }] });
const tasksStr = await Tasks.countDocuments(owned(id));
const tasksOid = await Tasks.countDocuments(owned(user._id));
console.log(
  `Tasks: ${tasksStr} with a string id, ${tasksOid} with an ObjectId id, latest day ${await latest(Tasks, owned(id), 'forDate')}`,
);
const migrated = { ...owned(id), 'migratedFrom.key': { $type: 'string' } };
console.log(
  `  migrated: ${await Tasks.countDocuments(migrated)}, latest day ${await latest(Tasks, migrated, 'forDate')}`,
);
const byPlace = await Tasks.aggregate([
  { $match: owned(id) },
  {
    $group: {
      _id: {
        $cond: [
          { $ifNull: ['$projectId', false] },
          'in a project',
          {
            $cond: [
              { $eq: ['$companyId', 'personal'] },
              'personal',
              {
                $cond: [
                  { $ifNull: ['$companyId', false] },
                  'company only',
                  'not placed',
                ],
              },
            ],
          },
        ],
      },
      n: { $sum: 1 },
    },
  },
]).toArray();
console.log(`  by place: ${byPlace.map((r) => `${r._id} ${r.n}`).join(', ')}`);

console.log(
  `Work points: ${await Points.countDocuments({ userId: id })} with a string id, ${await Points.countDocuments({ userId: user._id })} with an ObjectId id, latest day ${await latest(Points, { userId: id }, 'date')}`,
);

const memberships = await db
  .collection('CompanyMember')
  .find({ userId: { $in: both } })
  .toArray();
console.log(
  `Companies: ${memberships.map((m) => `${m.companyId} (${m.status})`).join(', ') || 'none'}`,
);

await client.close();
