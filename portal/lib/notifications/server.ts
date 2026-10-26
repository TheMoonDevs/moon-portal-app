import { getMongoDb } from '@/lib/db/mongoose';

/*
 * In-app notifications used to be cached in each browser and synced by
 * "modified since", so removed or stale records never went away. All
 * notification records from before that fix are deleted once, the first time
 * a server touches notifications after deploy. A marker in `Migration` makes
 * sure it only ever happens once, so notifications sent afterwards stay.
 */

const CLEANUP_ID = 'notifications-reset-2026-10';
const DUPLICATE_KEY = 11000;

let cleanupDone: Promise<void> | null = null;

/** Delete every pre-existing notification record, once ever (no-op after). */
export function ensureNotificationsReset(): Promise<void> {
  if (!cleanupDone) {
    cleanupDone = resetNotifications().catch((e) => {
      // Try again on the next request rather than caching the failure.
      cleanupDone = null;
      throw e;
    });
  }
  return cleanupDone;
}

async function resetNotifications() {
  const mongo = await getMongoDb();
  const migrations = mongo.collection<{ _id: string }>('Migration');
  if (await migrations.findOne({ _id: CLEANUP_ID, doneAt: { $exists: true } }))
    return;

  // Claim the cleanup so two servers starting together do not both run it.
  const claimedAt = new Date();
  try {
    await migrations.insertOne({ _id: CLEANUP_ID, claimedAt } as any);
  } catch (e) {
    if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
    const existing = await migrations.findOne({ _id: CLEANUP_ID });
    if ((existing as any)?.doneAt) return;
    // A claim that never finished (crashed server) is retried after a minute.
    const stale = new Date(Date.now() - 60 * 1000);
    const taken = await migrations.updateOne(
      {
        _id: CLEANUP_ID,
        doneAt: { $exists: false },
        claimedAt: { $lt: stale },
      },
      { $set: { claimedAt } },
    );
    if (taken.modifiedCount === 0) return;
  }

  const { deletedCount } = await mongo
    .collection('Notification')
    .deleteMany({});
  await migrations.updateOne(
    { _id: CLEANUP_ID },
    { $set: { doneAt: new Date(), deletedCount } },
  );
  console.log(`[notifications] removed ${deletedCount} old notifications`);
}
