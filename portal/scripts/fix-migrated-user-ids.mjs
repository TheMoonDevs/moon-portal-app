/**
 * Repairs what migrate-tasks-first.mjs wrote before it was fixed: it copied
 * the person's id from their worklogs, which keep it as an ObjectId, onto
 * the tasks and work points it made. The portal reads those ids as strings,
 * so the migrated work showed nowhere: not on user pages, the level card or
 * anyone's day.
 *
 * Turns ownerId, createdById, assigneeIds and completedByIds on migrated
 * tasks, and userId on migrated work points, back into strings. Only
 * documents tagged `migratedFrom` are touched, and only their ObjectId
 * values change. Safe to run again: a second run finds nothing to do.
 *
 *   node scripts/fix-migrated-user-ids.mjs          # counts only, writes nothing
 *   node scripts/fix-migrated-user-ids.mjs --apply  # does it
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
const Tasks = db.collection('Task');
const Points = db.collection('WorkPoint');

const isId = { $type: 'objectId' };
const migrated = { 'migratedFrom.key': { $type: 'string' } };

/** The field as a string when it holds an ObjectId, else as it was. */
const str = (field) => ({
  $cond: [
    { $eq: [{ $type: `$${field}` }, 'objectId'] },
    { $toString: `$${field}` },
    `$${field}`,
  ],
});
/** Each ObjectId in the list as a string. */
const strList = (field) => ({
  $cond: [
    { $isArray: `$${field}` },
    {
      $map: {
        input: `$${field}`,
        as: 'v',
        in: {
          $cond: [
            { $eq: [{ $type: '$$v' }, 'objectId'] },
            { $toString: '$$v' },
            '$$v',
          ],
        },
      },
    },
    `$${field}`,
  ],
});

const taskFilter = {
  ...migrated,
  $or: [
    { ownerId: isId },
    { createdById: isId },
    { assigneeIds: isId },
    { completedByIds: isId },
  ],
};
const pointFilter = { ...migrated, userId: isId };

const [tasks, points, people] = await Promise.all([
  Tasks.countDocuments(taskFilter),
  Points.countDocuments(pointFilter),
  Tasks.distinct('ownerId', taskFilter),
]);
console.log(
  `${tasks} migrated tasks and ${points} work points of ${people.length} people hold ObjectId user ids.`,
);

if (apply) {
  const t = await Tasks.updateMany(taskFilter, [
    {
      $set: {
        ownerId: str('ownerId'),
        createdById: str('createdById'),
        assigneeIds: strList('assigneeIds'),
        completedByIds: strList('completedByIds'),
      },
    },
  ]);
  const p = await Points.updateMany(pointFilter, [
    { $set: { userId: str('userId') } },
  ]);
  console.log(
    `Applied: ${t.modifiedCount} tasks and ${p.modifiedCount} work points now hold string ids.`,
  );
} else console.log('Dry run (nothing written; pass --apply to write).');

await client.close();
