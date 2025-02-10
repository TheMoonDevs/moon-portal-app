import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

export const runtime = "edge";

async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const spreadsheetId = req.query.spreadsheetId;
  const targetSheetId = parseInt(req.query.sheetId as string) || 0;
  const sheets = google.sheets("v4");
  const jwtClient = new google.auth.JWT(
    process.env.GIAM_CLIENT_EMAIL,
    process.env.GIAM_CLIENT_ID,
    Buffer.from(
      process.env.GIAM_PRIVATE_KEY as string,
      "base64"
    ).toString("ascii"),
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
    ]
  );

  sheets.spreadsheets.get(
    {
      auth: jwtClient,
      spreadsheetId: spreadsheetId as string,
    },
    (err: any, response: any) => {
      if (err) {
        return console.log("The API returned an error: " + err);
      }

      const targetSheet = response.data.sheets.find(
        (sheet: any) => sheet?.properties?.sheetId === targetSheetId
      );

      if (!targetSheet) {
        return res
          .status(404)
          .json({ error: `No sheet found with gid = ${targetSheetId}` });
      }

      const sheetName = `${
        targetSheet?.properties?.title || "Sheet1"
      }!A:A`;

      if (req.method === "GET") {
        sheets.spreadsheets.values.get(
          {
            auth: jwtClient,
            spreadsheetId: spreadsheetId as string,
            range: sheetName,
          },
          (err: any, response: any) => {
            if (err) {
              console.log("The API returned an error: " + err);
              return res
                .status(500)
                .json({ error: "Failed to retrieve sheet values." });
            } else {
              return res.status(200).json(response.data);
            }
          }
        );
      } else if (req.method === "POST") {
        const { rowData }: { rowData: string[] } = req.body;
        sheets.spreadsheets.values.append(
          {
            auth: jwtClient,
            spreadsheetId: spreadsheetId as string,
            range: sheetName,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [rowData],
            },
          },
          (err: any, response: any) => {
            if (err) {
              console.log(
                `Error submitting response to Google Sheets. API Error: ${err.message}`
              );
              return res
                .status(500)
                .json({ error: "Failed to submit response to Google Sheets." });
            } else {
              return res
                .status(201)
                .json({ message: "Response Submitted Successfully", response });
            }
          }
        );
      }
    }
  );
}

export default handler;
