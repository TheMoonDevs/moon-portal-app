import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { JsonObject } from "@prisma/client/runtime/library";

interface EmailLogsData {
  id: string; // Typically the current date in string format
  status: "Sendable" | "Exhausted";
  fallbackMailId?: string;
  mailId: string;
  mailCurrentCount: number;
  mailMaxCount: number;
  lastMailSentAt?: string;
}

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

  const { mailId, mailMaxCount, fallbackMailId } = emailData;
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    // Fetch existing email tracker configuration data from the database
    const existingConfig = await prisma.configData.findUnique({
      where: { configId: "email-tracker" },
    });

    let updatedEmailTracker: JsonObject[] = [];

    // If existing configuration data is found
    if (existingConfig && existingConfig.configData) {
      const existingData = existingConfig.configData as JsonObject;
      const emailTracker = (existingData.emailTracker as JsonObject[]) || [];

      // Update or add the entry for the specific mailId
      updatedEmailTracker = emailTracker.map((log: JsonObject) => {
        if (log.mailId === mailId) {
          // Reset count and status if it's a new day
          if (log.id !== currentDate) {
            log.mailCurrentCount = 0;
            log.id = currentDate;
            log.status = "Sendable"; // Reset status for a new day
          }

          // Update mailMaxCount and fallbackMailId if provided in the request
          log.mailMaxCount = mailMaxCount ?? log.mailMaxCount;
          log.fallbackMailId = fallbackMailId ?? log.fallbackMailId;

          // Update status based on new mailMaxCount
          const status =
            (log.mailCurrentCount || 0) >= (log.mailMaxCount || 0)
              ? "Exhausted"
              : "Sendable";
          log.status = status;

          log.lastMailSentAt = new Date().toISOString();

          return log;
        }
        return log;
      });

      // If mailId does not exist in the configuration, add a new entry
      if (!updatedEmailTracker.find((log) => log.mailId === mailId)) {
        const status = mailMaxCount <= 0 ? "Exhausted" : "Sendable";
        updatedEmailTracker.push({
          id: currentDate,
          status: status,
          fallbackMailId: fallbackMailId,
          mailId: mailId,
          mailCurrentCount: 0,
          mailMaxCount: mailMaxCount || 0,
          lastMailSentAt: new Date().toISOString(),
        });
      }
    } else {
      // If no existing configuration data, create a new entry
      const status = mailMaxCount <= 0 ? "Exhausted" : "Sendable";
      updatedEmailTracker = [
        {
          id: currentDate,
          status: status,
          fallbackMailId: fallbackMailId,
          mailId: mailId,
          mailCurrentCount: 0,
          mailMaxCount: mailMaxCount || 0,
          lastMailSentAt: new Date().toISOString(),
        },
      ];
    }

    // Upsert the updated email tracker data into the database
    const updateData = await prisma.configData.upsert({
      where: { configId: "email-tracker" },
      create: {
        configId: "email-tracker",
        configApp: "portal",
        configType: "singular",
        configData: {
          emailTracker: updatedEmailTracker,
        },
      },
      update: {
        configData: {
          emailTracker: updatedEmailTracker,
        },
      },
    });

    // Return a success response with the updated data
    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: updateData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    // Handle any errors and return a 500 response with the error message
    console.error("Error updating email tracker settings:", error);
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
  - mailMaxCount?: The maximum count of emails allowed.
  - fallbackMailId?: The fallback email ID.

  Responses:
  - If the request body is not found:
    Response:
      Status: 400 Bad Request
      Body: {
        "error": "body not found"
      }

  - If the email-tracker configuration data is found:
    - If mailId exists in the configuration:
      Response:
        Status: 200 OK
        Body: {
          status: "success",
          data: { ... } // Updated email tracker entry
        }

    - If mailId does not exist in the configuration:
      Response:
        Status: 200 OK
        Body: {
          status: "success",
          data: { ... } // New email tracker entry
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
