import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.__mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.__mongooseCache) {
  globalForMongoose.__mongooseCache = cache;
}

function getMongoUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

function getMongoFallbackUrl(): string | null {
  return process.env.DATABASE_URL_FALLBACK?.trim() || null;
}

function isSrvDnsConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = `${error.name} ${error.message}`;
  return message.includes('querySrv') || message.includes('ECONNREFUSED');
}

async function connectWithUri(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri, {
    autoIndex: false,
    maxPoolSize: 20,
  });
}

export async function connectMongoose(uri?: string): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const primaryUri = uri ?? getMongoUrl();
    cache.promise = connectWithUri(primaryUri).catch(async (error: unknown) => {
      const fallbackUri = getMongoFallbackUrl();
      if (
        fallbackUri &&
        fallbackUri !== primaryUri &&
        isSrvDnsConnectionError(error)
      ) {
        return connectWithUri(fallbackUri);
      }
      throw error;
    });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    // Allow retry after transient startup failures.
    cache.promise = null;
    throw error;
  }
}

export async function getMongoDb(uri?: string) {
  const conn = await connectMongoose(uri);
  if (!conn.connection.db) {
    throw new Error('MongoDB connection is not initialized');
  }
  return conn.connection.db;
}

export function toObjectIdIfNeeded(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return value;
  }
  return new mongoose.Types.ObjectId(value);
}

export function serializeMongoDoc<T extends Record<string, unknown>>(
  doc: T,
): T & { id?: string } {
  const copy = { ...doc } as Record<string, unknown>;
  if (copy._id instanceof mongoose.Types.ObjectId) {
    copy.id = copy._id.toString();
    copy._id = copy.id;
  }
  for (const [key, val] of Object.entries(copy)) {
    if (val instanceof Date) {
      copy[key] = val;
      continue;
    }
    if (Array.isArray(val)) {
      copy[key] = val.map((item) =>
        item instanceof mongoose.Types.ObjectId ? item.toString() : item,
      );
      continue;
    }
    if (val instanceof mongoose.Types.ObjectId) {
      copy[key] = val.toString();
    }
  }
  return copy as T & { id?: string };
}
