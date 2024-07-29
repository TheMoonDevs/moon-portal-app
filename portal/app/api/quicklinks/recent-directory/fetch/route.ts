import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

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
      },
    });

    if (!recentDirectory) {
      return NextResponse.json({
        status: 'success',
        data: { directories: [] },
      });
    }

    const directoryIds = recentDirectory.directoryIds;

    // Get the last 9 unique directory IDs
    const uniqueDirectoryIds = Array.from(new Set(directoryIds)).slice(-9);

    // Fetch child directories
    const directories = await prisma.directory.findMany({
      where: {
        id: {
          in: uniqueDirectoryIds,
        },
      },
      select: {
        id: true,
        title: true,
        parentDirId: true,
        timestamp: true,
      },
    });

    // Check for IDs not found in the directory model
    const foundDirectoryIds = directories.map(dir => dir.id);
    const missingDirectoryIds = uniqueDirectoryIds.filter(id => !foundDirectoryIds.includes(id));

    // Fetch directories from parentDirectory model for missing IDs
    const parentDirectories = await prisma.parentDirectory.findMany({
      where: {
        id: {
          in: missingDirectoryIds,
        },
      },
      select: {
        id: true,
        title: true,
        logo: true,
        type: true,
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
          parentDirTitle = parentDir.title;
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
            type = parentParentDir.type.toLowerCase();
            logos.unshift(parentParentDir.logo || "📁");
            parentDirTitle = parentParentDir.title;
            break;
          } else {
            return null;
          }
        }
      }

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

    // Process parent directories separately
    const parentDirResults = parentDirectories.map(dir => ({
      id: dir.id,
      fullPath: `${dir.type?.toLowerCase()}/${dir.title}`,
      parentChildPath: dir.title,
      directoryName: dir.title,
      logos: [dir.logo],
    }));

    return NextResponse.json({
      status: "success",
      data: { directories: [...result, ...parentDirResults] },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to retrieve recent directories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
