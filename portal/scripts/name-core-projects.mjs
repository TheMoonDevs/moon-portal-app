/**
 * Names every company's core project after its company, so the company's
 * general work shows as "ZONE" rather than "CORE" (see
 * lib/workspace/coreProject.ts). Only a core project still called "CORE" is
 * renamed; one someone gave a name of its own, and Personal, are left alone.
 * Safe to run again.
 *
 *   node scripts/name-core-projects.mjs          # lists what it would do
 *   node scripts/name-core-projects.mjs --apply  # does it
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
const companies = db.collection('Company');
const projects = db.collection('Project');

const cores = await projects
  .find({
    isCore: true,
    isPersonal: { $ne: true },
    name: { $regex: '^\\s*core\\s*$', $options: 'i' },
  })
  .toArray();

const rows = [];
for (const core of cores) {
  const id = String(core.companyId);
  const company = await companies.findOne({
    _id: ObjectId.isValid(id) ? { $in: [new ObjectId(id), id] } : id,
  });
  const name = company?.name?.trim();
  if (!name) {
    rows.push(`  ${core._id}: company ${id} not found, left as "${core.name}"`);
    continue;
  }
  rows.push(`  ${core._id}: "${core.name}" -> "${name}"`);
  if (apply)
    await projects.updateOne(
      { _id: core._id },
      { $set: { name, updatedAt: new Date().toISOString() } },
    );
}

console.log(apply ? 'Applied:' : 'Dry run (pass --apply to write):');
for (const row of rows) console.log(row);
console.log(
  `${cores.length} core projects ${apply ? 'renamed' : 'to rename'}.`,
);
await client.close();
