/**
 * Clears what tasks deleted before lib/daywork/server.ts#deleteTask left
 * behind: their work points, and plan steps or follow-on tasks that still
 * name them. Safe to run again: it only touches
 * records that name a task that is no longer there.
 *
 *   node scripts/clean-deleted-tasks.mjs          # lists what it would do
 *   node scripts/clean-deleted-tasks.mjs --apply  # does it
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { MongoClient, ObjectId } from 'mongodb';

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
const Plans = db.collection('Plan');

const asId = (id) => {
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
};

/** Of these task ids, the ones with no task. */
async function gone(ids) {
  const unique = Array.from(new Set(ids.filter(Boolean).map(String)));
  const oids = unique.map(asId).filter(Boolean);
  const live = new Set(
    (
      await Tasks.find(
        { _id: { $in: oids } },
        { projection: { _id: 1 } },
      ).toArray()
    ).map((t) => String(t._id)),
  );
  return new Set(unique.filter((id) => !live.has(id)));
}

// Work points under no task.
const pointTaskIds = await Points.distinct('taskId');
const deadPointTasks = await gone(pointTaskIds);
const deadPoints = deadPointTasks.size
  ? await Points.countDocuments({ taskId: { $in: Array.from(deadPointTasks) } })
  : 0;
console.log(`Work points under a deleted task: ${deadPoints}`);
if (apply && deadPoints)
  await Points.deleteMany({ taskId: { $in: Array.from(deadPointTasks) } });

// Follow-on tasks and plan steps naming a deleted task.
const follows = await Tasks.find(
  { followsId: { $type: 'string' } },
  { projection: { followsId: 1 } },
).toArray();
const deadFollows = await gone(follows.map((t) => t.followsId));
const followCount = follows.filter((t) => deadFollows.has(t.followsId)).length;
console.log(`Tasks following a deleted task: ${followCount}`);
if (apply && followCount)
  await Tasks.updateMany(
    { followsId: { $in: Array.from(deadFollows) } },
    { $set: { followsId: null } },
  );

const plans = await Plans.find({
  'steps.taskId': { $type: 'string' },
}).toArray();
const deadSteps = await gone(
  plans.flatMap((p) => (p.steps ?? []).map((s) => s.taskId)),
);
let steps = 0;
for (const plan of plans) {
  const hit = (plan.steps ?? []).filter(
    (s) => s.taskId && deadSteps.has(String(s.taskId)),
  ).length;
  if (!hit) continue;
  steps += hit;
  if (apply)
    await Plans.updateOne(
      { _id: plan._id },
      {
        $set: {
          steps: plan.steps.map((s) =>
            s.taskId && deadSteps.has(String(s.taskId))
              ? { ...s, taskId: null }
              : s,
          ),
        },
      },
    );
}
console.log(`Plan steps naming a deleted task: ${steps}`);

console.log(apply ? 'Done.' : 'Nothing changed. Run with --apply to clean.');
await client.close();
