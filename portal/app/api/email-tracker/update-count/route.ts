import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { JsonObject } from "@prisma/client/runtime/library";

export async function PATCH(req: NextRequest) {
  // Check if the request body is present
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse the request body to get email data
  const body = await req.text();
  const emailData = JSON.parse(body);

  const { mailId, mailSentNow } = emailData;
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    // Fetch existing email tracker configuration data from the database
    const existingConfig = await prisma.configData.findUnique({
      where: { configId: "email-tracker" },
    });

    // If existing configuration data is found
    if (existingConfig && existingConfig.configData) {
      const existingData = existingConfig.configData as JsonObject;
      const emailTracker = (existingData.emailTracker as JsonObject[]) || [];

      // Find the entry for the specific mailId
      const entryIndex = emailTracker.findIndex(
        (entry) => entry.mailId === mailId
      );

      // If entry exists, update it
      if (entryIndex !== -1) {
        const entry = emailTracker[entryIndex];

        // Reset count and status if it's a new day
        if (entry.id !== currentDate) {
          entry.mailCurrentCount = 0;
          entry.id = currentDate;
          entry.status = "Sendable"; // Reset status for a new day
        }

        // If the email status is "Exhausted", return the entry without updating the count
        if (entry.status === "Exhausted") {
          return new NextResponse(
            JSON.stringify({ ...entry, status: "exhausted" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Update the mail current count and status
        const updatedCount = entry.mailCurrentCount + mailSentNow;
        const status =
          updatedCount >= (entry.mailMaxCount || 0) ? "Exhausted" : "Sendable";

        const updatedEntry = {
          ...entry,
          mailCurrentCount: updatedCount,
          status: status,
          lastMailSentAt: new Date().toISOString(),
        };

        // Update the entry in the array
        emailTracker[entryIndex] = updatedEntry;

        // Update the email tracker data in the database
        await prisma.configData.update({
          where: { configId: "email-tracker" },
          data: {
            configData: {
              ...existingData,
              emailTracker: emailTracker,
            },
          },
        });

        // Return a success response with the updated entry
        return new NextResponse(
          JSON.stringify({ status: "success", data: updatedEntry }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        // If entry does not exist, return error response
        return new NextResponse(JSON.stringify({ error: "MailId not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      // If no existing configuration data, return error response
      return new NextResponse(
        JSON.stringify({ error: "email-tracker config not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    // Handle any errors and return a 500 response with the error message
    console.error("Error updating email tracker:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/*
  PATCH Endpoint Explanation:

  Allowed Request Body Parameters:
  - mailId: The ID of the email to update.
  - mailSentNow: The number of emails sent now.

  Responses:
  - If the request body is not found:
    Response:
      Status: 400 Bad Request
      Body: {
        error: "body not found"
      }

  - If the email-tracker configuration data is found:
    - If mailId exists in the configuration:
      - If mailId exists and is not exhausted:
        Response:
          Status: 200 OK
          Body: {
            status: "success",
            data: { ... } // Updated email tracker entry
          }

      - If mailId exists and is exhausted:
        Response:
          Status: 200 OK
          Body: {
            ...entry, status: "exhausted"
          }

    - If mailId does not exist in the configuration:
      Response:
        Status: 404 Not Found
        Body: {
          error: "MailId not found"
        }

  - If the email-tracker configuration data is not found:
    Response:
      Status: 404 Not Found
      Body: {
        error: "email-tracker config not found"
      }

  - If there is an internal server error:
    Response:
      Status: 500 Internal Server Error
      Body: {
        error: "<error message>"
      }
*/
