/**
 * Gives every company that has none its CORE project (see
 * lib/workspace/coreProject.ts). Safe to run again: a company that already
 * has one is left alone, and a project already named "CORE" becomes the
 * company's CORE instead of getting a second one.
 *
 *   node scripts/backfill-core-projects.mjs          # lists what it would do
 *   node scripts/backfill-core-projects.mjs --apply  # does it
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
const companies = db.collection('Company');
const projects = db.collection('Project');

const rows = [];
for (const company of await companies.find({}).sort({ name: 1 }).toArray()) {
  const companyId = String(company._id);
  const core = await projects.findOne({ companyId, isCore: true });
  if (core) {
    rows.push({ company, action: 'has CORE' });
    continue;
  }
  const named = await projects.findOne({
    companyId,
    name: { $regex: '^\\s*core\\s*$', $options: 'i' },
    status: { $ne: 'ARCHIVED' },
  });
  if (named) {
    rows.push({ company, action: `mark "${named.name}" as CORE` });
    if (apply)
      await projects.updateOne(
        { _id: named._id },
        { $set: { isCore: true, updatedAt: new Date().toISOString() } },
      );
    continue;
  }
  rows.push({ company, action: 'create CORE' });
  if (apply) {
    const now = new Date().toISOString();
    await projects.insertOne({
      companyId,
      name: 'CORE',
      slug: 'core',
      description: null,
      status: 'ACTIVE',
      color: null,
      icon: null,
      logo: null,
      leadIds: [],
      memberIds: [],
      goals: [],
      effort: 'MEDIUM',
      parentId: null,
      isCore: true,
      createdById: company.createdById ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

console.log(apply ? 'Applied:' : 'Dry run (pass --apply to write):');
for (const { company, action } of rows)
  console.log(
    `  ${company.name} [${company.status ?? '?'}] (${company._id}): ${action}`,
  );
const todo = rows.filter((r) => r.action !== 'has CORE').length;
console.log(
  `${todo} of ${rows.length} companies ${apply ? 'updated' : 'to update'}.`,
);
await client.close();
