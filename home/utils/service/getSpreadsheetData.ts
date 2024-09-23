import { google } from "googleapis";
export interface GetSpreadsheetDataProps {
  spreadsheetId: string;
  targetSheetId?: number;
  range?: string;
  majorDimension?: "ROWS" | "COLUMNS";
}

export default async function getSpreadsheetData({
  spreadsheetId,
  targetSheetId,
  range = "A:Z",
  majorDimension = "ROWS",
}: GetSpreadsheetDataProps) {
  if (!spreadsheetId) {
    console.error("No spreadsheet ID provided");
    return [];
  }

  const sheets = google.sheets("v4");

  if (
    !process.env.GIAM_CLIENT_EMAIL ||
    !process.env.GIAM_CLIENT_ID ||
    !process.env.GIAM_PRIVATE_KEY
  ) {
    console.error(
      "Environment variables for Google API authentication are not properly set."
    );
    return [];
  }

  const jwtClient = new google.auth.JWT(
    process.env.GIAM_CLIENT_EMAIL,
    process.env.GIAM_CLIENT_ID,
    process.env.GIAM_PRIVATE_KEY?.replace(/\\n/gm, "\n"),
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
    ]
  );

  try {
    const response1 = await sheets.spreadsheets.get({
      auth: jwtClient,
      spreadsheetId: spreadsheetId as string,
    });

    if (response1.status !== 200 || !response1?.data?.sheets) {
      console.error("Failed to retrieve sheets:", response1.statusText);
      return [];
    }

    const targetSheet = response1?.data?.sheets?.find(
      (sheet: any) => sheet?.properties?.sheetId === targetSheetId
    );

    if (!targetSheet) {
      console.error("Target sheet not found");
      return [];
    }

    const sheetName = `${targetSheet?.properties?.title}!${range}`;

    const response2 = await sheets.spreadsheets.values.get({
      auth: jwtClient,
      spreadsheetId: spreadsheetId as string,
      range: sheetName,
      majorDimension: majorDimension,
    });

    if (response2.status !== 200 || !response2?.data?.values) {
      console.error("Failed to retrieve sheet values:", response2.statusText);
      return [];
    }
    return response2.data;
  } catch (error: any) {
    console.error("Error accessing Google Sheets API:", error.message);
    return [];
  }
}
