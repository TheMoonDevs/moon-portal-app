/**
 * Moves company work that sits on none of a company's projects into the
 * company's CORE project (see lib/workspace/coreProject.ts):
 *
 * - tasks with a company but no project (not Personal ones) get the CORE
 *   project;
 * - worklog links to a company alone get the CORE project too, so worklogs
 *   not yet moved to tasks first land in CORE when they are. Only the
 *   links' projectId changes; the worklog text and line keys stay as they
 *   are.
 *
 * Run scripts/backfill-core-projects.mjs first: a company with no CORE
 * project is skipped. Safe to run again: moved work has a project, so it is
 * not picked up a second time.
 *
 *   node scripts/move-company-work-to-core.mjs          # lists what it would do
 *   node scripts/move-company-work-to-core.mjs --apply  # does it
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { MongoClient } from 'mongodb';

const PERSONAL = 'personal';
const apply = process.argv.includes('--apply');
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new MongoClient(url);
await client.connect();
const db = client.db();
const now = () => new Date().toISOString();
const noProject = { $in: [null, ''] };

let tasksMoved = 0;
let linksMoved = 0;
console.log(apply ? 'Applied:' : 'Dry run (pass --apply to write):');
for (const company of await db
  .collection('Company')
  .find({})
  .sort({ name: 1 })
  .toArray()) {
  const companyId = String(company._id);
  if (companyId === PERSONAL) continue;
  const core = await db
    .collection('Project')
    .findOne({ companyId, isCore: true });

  const taskWhere = { companyId, projectId: noProject };
  const tasks = await db.collection('Task').countDocuments(taskWhere);
  const logs = await db
    .collection('WorkLogs')
    .find(
      { links: { $elemMatch: { companyId, projectId: noProject } } },
      { projection: { links: 1 } },
    )
    .toArray();
  const links = logs.reduce(
    (n, w) =>
      n +
      w.links.filter((l) => l?.companyId === companyId && !l.projectId).length,
    0,
  );
  if (!tasks && !links) continue;
  if (!core) {
    console.log(
      `  ${company.name} (${companyId}): ${tasks} tasks, ${links} links — skipped, no CORE project`,
    );
    continue;
  }
  const coreId = String(core._id);
  console.log(
    `  ${company.name} (${companyId}): ${tasks} tasks, ${links} worklog links → ${core.name}`,
  );
  tasksMoved += tasks;
  linksMoved += links;
  if (!apply) continue;
  if (tasks)
    await db
      .collection('Task')
      .updateMany(taskWhere, { $set: { projectId: coreId, updatedAt: now() } });
  if (links)
    await db.collection('WorkLogs').updateMany(
      { _id: { $in: logs.map((w) => w._id) } },
      { $set: { 'links.$[l].projectId': coreId } },
      {
        arrayFilters: [{ 'l.companyId': companyId, 'l.projectId': noProject }],
      },
    );
}
console.log(
  `${tasksMoved} tasks and ${linksMoved} worklog links ${apply ? 'moved' : 'to move'} into CORE.`,
);
await client.close();
