import { connectMongoose } from '@/lib/db/mongoose';

type Db = any;
type Collection = any;

const WORKSHEET_DB_URL = process.env.WORKSHEET_DB_URL?.trim();

let db: Db | null = null;

function getDbNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname?.replace(/^\//, '') || '';
    return pathname || 'worksheet_db';
  } catch {
    return 'worksheet_db';
  }
}

async function getWorksheetDbAsync(): Promise<Db> {
  if (!WORKSHEET_DB_URL) {
    throw new Error('WORKSHEET_DB_URL is not set');
  }
  if (!db) {
    const c = await connectMongoose(WORKSHEET_DB_URL);
    const dbName = getDbNameFromUrl(WORKSHEET_DB_URL);
    const worksheetDb = c.connection.useDb(dbName).db;
    if (!worksheetDb) {
      throw new Error('Worksheet DB connection is not initialized');
    }
    db = worksheetDb;
  }
  if (!db) {
    throw new Error('Worksheet DB connection is not initialized');
  }
  return db;
}

export async function getWorksheetDb(): Promise<Db> {
  return getWorksheetDbAsync();
}

export async function getWorksheetCollection(
  worksheetId: string,
): Promise<Collection> {
  const database = await getWorksheetDbAsync();
  return database.collection(worksheetId);
}
