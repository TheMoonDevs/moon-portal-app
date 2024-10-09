import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  const sheetId = req.nextUrl.searchParams.get("sheetId");
  const targetSheetId = parseInt(sheetId || '0') || 0;

  const sheets = google.sheets("v4");
  const jwtClient = new google.auth.JWT(
    process.env.GIAM_CLIENT_EMAIL,
    process.env.GIAM_CLIENT_ID,
    Buffer.from(process.env.GIAM_PRIVATE_KEY as string, "base64").toString("ascii"),
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
    ]
  );

  try {
    const spreadsheetResponse = await sheets.spreadsheets.get({
      auth: jwtClient,
      spreadsheetId: spreadsheetId as string,
    });

    const targetSheet = spreadsheetResponse.data.sheets?.find(
      (sheet: any) => sheet?.properties?.sheetId === targetSheetId
    );

    if (!targetSheet) {
      return NextResponse.json(
        { error: `No sheet found with gid = ${targetSheetId}` },
        { status: 404 }
      );
    }

    const sheetName = `${targetSheet?.properties?.title || "Sheet1"}!A:A`;

    if (req.method === "GET") {
      const valuesResponse = await sheets.spreadsheets.values.get({
        auth: jwtClient,
        spreadsheetId: spreadsheetId as string,
        range: sheetName,
      });
      return NextResponse.json(valuesResponse.data);
    }

    if (req.method === "POST") {
      const { rowData }: { rowData: string[] } = await req.json();

      const appendResponse = await sheets.spreadsheets.values.append({
        auth: jwtClient,
        spreadsheetId: spreadsheetId as string,
        range: sheetName,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });

      return NextResponse.json(
        { message: "Response Submitted Successfully", response: appendResponse },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    );

  } catch (err) {
    console.error("Error processing request: ", err);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}
