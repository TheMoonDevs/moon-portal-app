import { NextRequest, NextResponse } from "next/server";
import GoogleSheetsAPI from "@/utils/service/googleSheetSdk";

const googleSheetsAPI = new GoogleSheetsAPI({
  clientEmail: process.env.GIAM_CLIENT_EMAIL as string,
  privateKey: process.env.GIAM_PRIVATE_KEY as string,
});

export async function GET(req: NextRequest) {
  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  const range = req.nextUrl.searchParams.get("range") || "A:Z";
  const targetId = req.nextUrl.searchParams.get("targetId");

  try {
    if (!spreadsheetId || !targetId) {
      return NextResponse.json(
        { error: "spreadsheetId and targetId are required." },
        { status: 400 }
      );
    }

    const data = await googleSheetsAPI.getSheetData({
      spreadsheetId,
      range,
      targetId,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching sheet data: ", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet data." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  const targetId = req.nextUrl.searchParams.get("targetId");
  const { values, range } = await req.json();

  try {
    if (!spreadsheetId || !targetId || !values) {
      return NextResponse.json(
        { error: "spreadsheetId, targetId, and values are required." },
        { status: 400 }
      );
    }

    const response = await googleSheetsAPI.appendSheetData({
      spreadsheetId,
      values,
      targetId,
      range: range || "A:A",
    });
    return NextResponse.json(
      { message: "Data appended successfully", response },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error appending data: ", error);
    return NextResponse.json(
      { error: "Failed to append data." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { spreadsheetId, range, values, targetId } = await req.json();

  try {
    if (!spreadsheetId || !targetId || !values || !range) {
      return NextResponse.json(
        { error: "spreadsheetId, targetId, values, and range are required." },
        { status: 400 }
      );
    }

    const response = await googleSheetsAPI.updateSheetData({
      spreadsheetId,
      range,
      values,
      targetId,
    });
    return NextResponse.json(
      { message: "Data updated successfully", response },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating data: ", error);
    return NextResponse.json(
      { error: "Failed to update data." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { spreadsheetId, targetId, majorDimension, indexes } = await req.json();

  try {
    if (!spreadsheetId || !targetId || !majorDimension || !indexes) {
      return NextResponse.json(
        {
          error:
            "spreadsheetId, targetId, majorDimension, and indexes are required.",
        },
        { status: 400 }
      );
    }

    const response = await googleSheetsAPI.deleteRowOrColumn({
      spreadsheetId,
      targetId,
      majorDimension,
      indexes,
    });
    return NextResponse.json(
      { message: "Rows or columns deleted successfully", response },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting rows/columns: ", error);
    return NextResponse.json(
      { error: "Failed to delete rows or columns." },
      { status: 500 }
    );
  }
}
