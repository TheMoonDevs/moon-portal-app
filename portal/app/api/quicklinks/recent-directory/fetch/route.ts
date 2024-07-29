import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { directoryIds } = await request.json();

    if (!directoryIds || !Array.isArray(directoryIds)) {
      return new NextResponse(
        JSON.stringify({ error: "directoryIds must be a valid array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch child directories
    const directories = await prisma.directory.findMany({
      where: {
        id: {
          in: directoryIds,
        },
      },
      select: {
        id: true,
        title: true,
        parentDirId: true,
        timestamp: true,
      },
    });

    // Helper function to find the highest-level parent directory and construct the string
    const findAndConstructParentDirectoryString = async (startId: string | null, childTitle: string, childTimestamp: Date) => {
      let currentId = startId;
      let pathComponents = [`${childTitle}-${new Date(childTimestamp).getTime().toString().slice(-5)}`];
      let parentDirTitle = "";
      let logos = [];
      let type = "";

      while (currentId) {
        // Check for the parent directory in the directory model
        const parentDir = await prisma.directory.findUnique({
          where: { id: currentId },
          select: { id: true, title: true, parentDirId: true },
        });

        if (parentDir) {
          parentDirTitle = parentDir.title; // update the top-most parent directory
          currentId = parentDir.parentDirId;
        } else {
          // No further parents in the directory model, check ParentDirectory model
          const parentParentDir = await prisma.parentDirectory.findUnique({
            where: { id: currentId },
            select: {
              id: true,
              title: true,
              logo: true,
              type: true,
            },
          });

          if (parentParentDir && parentParentDir.type) {
            // Set the type
            type = parentParentDir.type.toLowerCase();
            logos.unshift(parentParentDir.logo || "📁"); // Use default folder logo if logo is not available
            parentDirTitle = parentParentDir.title; // update the top-most parent directory
            break;
          } else {
            return null;
          }
        }
      }

      // Construct full path
      const fullPath = `${type}/${parentDirTitle}/${pathComponents[0]}`;
      const parentChildPath = `${parentDirTitle}/${childTitle}`;

      return {
        fullPath,
        parentChildPath,
        logos,
      };
    };

    const result = [];

    for (const dir of directories) {
      const pathInfo = await findAndConstructParentDirectoryString(dir.parentDirId, dir.title, dir.timestamp);
      if (pathInfo) {
        result.push({
          id: dir.id,
          fullPath: pathInfo.fullPath,
          parentChildPath: pathInfo.parentChildPath,
          directoryName: dir.title,
          logos: pathInfo.logos,
        });
      }
    }

    return NextResponse.json({
      status: "success",
      data: { directories: result },
    });
  } catch (e) {
    console.error("Failed to fetch directories:", e);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch directories" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
