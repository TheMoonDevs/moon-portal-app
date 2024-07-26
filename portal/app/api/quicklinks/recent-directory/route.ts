import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// Handle POST requests to add a directory to the user's recent directories
export async function POST(request: NextRequest) {
  const { userId, directoryId } = await request.json();

  if (!userId || !directoryId) {
    return new NextResponse(
      JSON.stringify({ error: "Missing userId or directoryId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Check if a RecentDirectory record already exists for the user
    const existingRecentDirectory = await prisma.recentDirectory.findUnique({
      where: { userId },
    });

    if (existingRecentDirectory) {
      // Update the existing record
      const updatedRecentDirectory = await prisma.recentDirectory.update({
        where: { userId },
        data: {
          directoryIds: {
            // Add directoryId to the existing array if not already present
            push: directoryId,
          },
        },
      });
      return NextResponse.json({
        status: "success",
        data: { recentDirectory: updatedRecentDirectory },
      });
    } else {
      // Create a new RecentDirectory record
      const newRecentDirectory = await prisma.recentDirectory.create({
        data: {
          userId,
          directoryIds: [directoryId],
        },
      });
      return NextResponse.json({
        status: "success",
        data: { recentDirectory: newRecentDirectory },
      });
    }
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update or create recent directories" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Handle GET requests to retrieve recent directories for a user
export async function GET(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return new NextResponse(
      JSON.stringify({ error: "Missing userId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Retrieve the RecentDirectory record for the user
    const recentDirectory = await prisma.recentDirectory.findUnique({
      where: { userId },
    });

    if (recentDirectory) {
      return NextResponse.json({
        status: "success",
        data: { directoryIds: recentDirectory.directoryIds },
      });
    } else {
      return NextResponse.json({
        status: "success",
        data: { directoryIds: [] },
      });
    }
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({ error: "Failed to retrieve recent directories" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
