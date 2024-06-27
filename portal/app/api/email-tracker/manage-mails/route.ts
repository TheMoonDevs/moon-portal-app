import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { JsonObject } from "@prisma/client/runtime/library";

// Define an interface for the request body for managing mail IDs
interface ManageMailIdsData {
  mailId: string;
  mailMaxCount?: number;
  fallbackMailId?: string;
}

export async function PUT(req: NextRequest) {
  // Check if the request body is present
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse the request body to get email data
  const body = await req.text();
  const manageMailData: ManageMailIdsData = JSON.parse(body);

  const { mailId, mailMaxCount, fallbackMailId } = manageMailData;

  if (!mailId) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid request parameters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const currentDate = new Date().toISOString().split("T")[0];

  try {
    // Fetch existing email tracker configuration data from the database
    const existingConfig = await prisma.configData.findUnique({
      where: { configId: "email-tracker" },
    });

    let updatedEmailTracker: JsonObject[] = [];

    if (existingConfig && existingConfig.configData) {
      const existingData = existingConfig.configData as JsonObject;
      const emailTracker = (existingData.emailTracker as JsonObject[]) || [];

      // Add a new mail ID if it doesn't already exist
      if (!emailTracker.find((log) => log.mailId === mailId)) {
        updatedEmailTracker = [
          ...emailTracker,
          {
            id: currentDate,
            status:
              mailMaxCount !== undefined && mailMaxCount <= 0
                ? "Exhausted"
                : "Sendable",
            fallbackMailId: fallbackMailId,
            mailId: mailId,
            mailCurrentCount: 0,
            mailMaxCount: mailMaxCount || 0,
            lastMailSentAt: new Date().toISOString(),
          },
        ];
      } else {
        return new NextResponse(
          JSON.stringify({ error: "Mail ID already exists" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // If no existing configuration data, create a new entry
      updatedEmailTracker = [
        {
          id: currentDate,
          status:
            mailMaxCount !== undefined && mailMaxCount <= 0
              ? "Exhausted"
              : "Sendable",
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
    console.error("Error adding mail ID:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: NextRequest) {
  // Check if the request body is present
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse the request body to get email data
  const body = await req.text();
  const manageMailData: ManageMailIdsData = JSON.parse(body);

  const { mailId } = manageMailData;

  if (!mailId) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid request parameters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Fetch existing email tracker configuration data from the database
    const existingConfig = await prisma.configData.findUnique({
      where: { configId: "email-tracker" },
    });

    if (!existingConfig || !existingConfig.configData) {
      return new NextResponse(
        JSON.stringify({ error: "No configuration found to delete mail ID" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const existingData = existingConfig.configData as JsonObject;
    const emailTracker = (existingData.emailTracker as JsonObject[]) || [];

    const updatedEmailTracker = emailTracker.filter(
      (log) => log.mailId !== mailId
    );
    if (updatedEmailTracker.length === emailTracker.length) {
      return new NextResponse(JSON.stringify({ error: "Mail ID not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
    console.error("Error deleting mail ID:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
