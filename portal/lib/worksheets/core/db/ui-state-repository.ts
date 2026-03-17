import { getWorksheetDb } from "./mongo";

const COLLECTION = "__worksheet_ui_state__";

type UiStateDoc = {
  _id: string;
  uiState: Record<string, unknown>;
  updatedAt?: Date;
};

export async function getUiState(worksheetId: string) {
  const db = getWorksheetDb();
  const col = db.collection<UiStateDoc>(COLLECTION);
  const doc = await col.findOne({ _id: worksheetId });
  return doc?.uiState ?? null;
}

export async function setUiState(worksheetId: string, uiState: Record<string, unknown>) {
  const db = getWorksheetDb();
  const col = db.collection<UiStateDoc>(COLLECTION);
  await col.updateOne(
    { _id: worksheetId },
    { $set: { uiState, updatedAt: new Date() } },
    { upsert: true },
  );
  return uiState;
}
