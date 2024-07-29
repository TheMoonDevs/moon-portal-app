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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new NextResponse(
      JSON.stringify({ error: 'Missing userId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Retrieve the RecentDirectory record for the user
    const recentDirectory = await prisma.recentDirectory.findUnique({
      where: { userId },
      select: {
        directoryIds: true,
        updatedAt: true,  // Access the updatedAt field
      },
    });

    if (recentDirectory) {
      // Assume you have a way to map directoryIds to their respective updatedAt timestamps
      // Here, we'll assume the updatedAt field is a single timestamp for all entries
      // If you need individual timestamps, you would require a different approach

      const directoryIds = recentDirectory.directoryIds;

      // Create an array of objects to simulate directory entries with their timestamps
      const directoryEntries = directoryIds.map(id => ({
        id,
        updatedAt: recentDirectory.updatedAt, // Placeholder, adjust if needed
      }));

      // Remove duplicates by id and sort by updatedAt in descending order
      const uniqueEntries = Array.from(
        new Map(directoryEntries.map(entry => [entry.id, entry])).values()
      ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Get the last 9 unique entries
      const last9Entries = uniqueEntries.slice(0, 9);

      return NextResponse.json({
        status: 'success',
        data: { directoryIds: last9Entries.map(entry => entry.id) },
      });
    } else {
      return NextResponse.json({
        status: 'success',
        data: { directoryIds: [] },
      });
    }
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to retrieve recent directories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}