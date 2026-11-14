import { getMongoDb } from '@/lib/db/mongoose';

/*
 * Blocking, which both app stores require of apps where people write to each
 * other. Someone who blocks another person:
 * - no longer sees that person's messages in any chat, groups included, and
 *   hears nothing about them (no unread count, live event or notification);
 * - can't message them, and the blocked person can't message them, in a
 *   direct chat.
 * The blocked person isn't told. Unblocking brings the messages back.
 *
 * Collection ChatBlock: one per pair, `_id` "<blockerId>:<blockedId>".
 */

type BlockDoc = {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
};

let indexesReady: Promise<void> | null = null;

async function blocks() {
  const mongo = await getMongoDb();
  const collection = mongo.collection<BlockDoc>('ChatBlock');
  indexesReady ??= Promise.all([
    collection.createIndex({ blockerId: 1, createdAt: -1 }),
    collection.createIndex({ blockedId: 1 }),
  ])
    .then(() => undefined)
    .catch((error) => {
      indexesReady = null;
      console.error('[chat] creating block indexes failed:', error);
    });
  await indexesReady;
  return collection;
}

const keyOf = (blockerId: string, blockedId: string) =>
  `${blockerId}:${blockedId}`;

/** The people this person has blocked, newest first. */
export async function blockedIdsOf(userId: string): Promise<string[]> {
  const docs = await (await blocks())
    .find({ blockerId: userId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => d.blockedId);
}

/** Which of `userIds` have blocked `senderId`. */
export async function blockersOf(
  senderId: string,
  userIds: string[],
): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const docs = await (await blocks())
    .find({ blockedId: senderId, blockerId: { $in: userIds } })
    .toArray();
  return new Set(docs.map((d) => d.blockerId));
}

/** Either of the two has blocked the other: who did, if anyone. */
export async function blockBetween(a: string, b: string) {
  const docs = await (await blocks())
    .find({ _id: { $in: [keyOf(a, b), keyOf(b, a)] } })
    .toArray();
  return {
    aBlockedB: docs.some((d) => d._id === keyOf(a, b)),
    bBlockedA: docs.some((d) => d._id === keyOf(b, a)),
  };
}

export async function addBlock(blockerId: string, blockedId: string) {
  const collection = await blocks();
  await collection.updateOne(
    { _id: keyOf(blockerId, blockedId) },
    { $setOnInsert: { blockerId, blockedId, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function removeBlock(blockerId: string, blockedId: string) {
  await (await blocks()).deleteOne({ _id: keyOf(blockerId, blockedId) });
}
