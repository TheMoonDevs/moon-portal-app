import { getWorksheetDb } from './mongo';

const COLLECTION = '__worksheet_ui_state__';

type UiStateDoc = {
  _id: string;
  uiState: Record<string, unknown>;
  updatedAt?: Date;
};

export async function getUiState(worksheetId: string) {
  const db = await getWorksheetDb();
  const col = db.collection(COLLECTION);
  const doc = await col.findOne({ _id: worksheetId });
  return (doc as UiStateDoc | null)?.uiState ?? null;
}

export async function setUiState(
  worksheetId: string,
  uiState: Record<string, unknown>,
) {
  const db = await getWorksheetDb();
  const col = db.collection(COLLECTION);
  await col.updateOne(
    { _id: worksheetId },
    { $set: { uiState, updatedAt: new Date() } },
    { upsert: true },
  );
  return uiState;
}
