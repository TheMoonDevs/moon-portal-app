import { MongoClient, Collection, Db } from "mongodb";

const WORKSHEET_DB_URL = process.env.WORKSHEET_DB_URL;

let client: MongoClient | null = null;
let db: Db | null = null;

function getDbNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname?.replace(/^\//, "") || "";
    return pathname || "worksheet_db";
  } catch {
    return "worksheet_db";
  }
}

function getClient(): MongoClient {
  if (!WORKSHEET_DB_URL?.trim()) {
    throw new Error("WORKSHEET_DB_URL is not set");
  }
  if (!client) {
    client = new MongoClient(WORKSHEET_DB_URL.trim());
  }
  return client;
}

export function getWorksheetDb(): Db {
  if (!WORKSHEET_DB_URL?.trim()) {
    throw new Error("WORKSHEET_DB_URL is not set");
  }
  if (!db) {
    const c = getClient();
    const dbName = getDbNameFromUrl(WORKSHEET_DB_URL);
    db = c.db(dbName);
  }
  return db;
}

export function getWorksheetCollection(worksheetId: string): Collection {
  const database = getWorksheetDb();
  return database.collection(worksheetId);
}
