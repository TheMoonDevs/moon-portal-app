import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export interface EmailLogsData {
  id: string; // Typically the current date in string format
  status: "Sendable" | "Exhausted";
  fallbackMailId?: string;
  mailId: string;
  mailCurrentCount: number;
  mailMaxCount: number;
  lastMailSentAt?: string;
}

export interface EmailTrackerConfigData {
  emailTracker: EmailLogsData[];
}

export async function GET(request: NextRequest) {
  try {
    // Extract search parameters from the request URL
    const { searchParams } = new URL(request.url);
    const mailId = searchParams.get("mailId");

    // Fetch the email-tracker configuration data from the database
    const existingConfig = await prisma.configData.findFirst({
      where: {
        configId: "email-tracker",
      },
    });

    // If no configuration data is found, return a 404 response
    if (!existingConfig) {
      return new NextResponse(
        JSON.stringify({ error: "email-tracker config not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract the emailTracker array from the configuration data
    const currentDate = new Date().toISOString().split("T")[0];
    console.log(currentDate);
    const existingData = existingConfig.configData as any ;
    const emailTracker = (existingData?.emailTracker) || [];

    // Check if any log's date is different
    const isDateDifferent = emailTracker.some((log: { id: string; }) => log.id !== currentDate);

    if (isDateDifferent) {
      // If any log's date is different, then map through all to update
      const updatedEmailTracker = emailTracker.map((log: { id: string; }) => {
        if (log.id !== currentDate) {
          return {
            ...log,
            mailCurrentCount: 0,
            id: currentDate,
            status: "Sendable",
          };
        }
        return log;
      });

      // Proceed with database update
      await prisma.configData.update({
        where: { configId: "email-tracker" },
        data: {
          configData: {
            ...existingData,
            emailTracker: updatedEmailTracker,
          },
        },
      });
    }

    // If a mailId query parameter is provided, find the corresponding email log
    if (mailId) {
      const emailLog = emailTracker?.find((log: { mailId: string; }) => log.mailId === mailId);

      // If the specific email log is not found, return a 404 response
      if (!emailLog) {
        return new NextResponse(JSON.stringify({ error: "Email not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return the specific email log if found
      return new NextResponse(
        JSON.stringify({ status: "success", data: emailLog }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return the entire emailTracker array if no mailId is provided
    return new NextResponse(
      JSON.stringify({ status: "success", data: emailTracker }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    // Handle any errors and return a 500 response with the error message
    console.error("Error retrieving email tracker data:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/*
  GET Endpoint Explanation:

  Allowed Search Parameters:
  - mailId: If provided, the endpoint will return the data for the specific email associated with the given mailId.

  Responses:
  - If no search parameters are provided:
    Response:
      Status: 200 OK
      Body: {
        status: "success",
        data: [ ... ] // Array of all email tracker data
      }

  - If mailId is provided and the email log is found:
    Response:
      Status: 200 OK
      Body: {
        status: "success",
        data: { ... } // Specific email log data for the given mailId
      }

  - If mailId is provided but the email log is not found:
    Response:
      Status: 404 Not Found
      Body: {
        error: "Email not found"
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
