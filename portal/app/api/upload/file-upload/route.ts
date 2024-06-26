import { prisma } from "@/prisma/prisma";
import { s3FileUploadSdk } from "@/utils/services/s3FileUploadSdk";
import { File } from "buffer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const loggedInUserId = req.nextUrl.searchParams.get("userId");
  // if (!loggedInUserId) {
  //   return NextResponse.json("User not found", { status: 404 });
  // }

  try {
    let files;

    if (loggedInUserId) {
      files = await prisma.fileUpload.findMany({
        where: {
          userId: loggedInUserId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      files = await prisma.fileUpload.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    console.log(files);
    if (!files || files.length === 0) {
      return NextResponse.json("No Files found", { status: 404 });
    }

    return NextResponse.json(files);
  } catch (error) {
    console.log(error);
    return NextResponse.json("Something went wrong", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as unknown as File[];

    if (!files || files.length === 0) {
      return NextResponse.json("File not found", { status: 404 });
    }

    const userId = formData.get("userId") as string;
    const uploadedByUserId = formData.get("uploadedByUserId") as string;
    const folderName = formData.get("folderName") as string;

    if (!userId) {
      return NextResponse.json("User not found", { status: 404 });
    }

    const filePromises = files.map(async (file) => {
      const s3Response = await s3FileUploadSdk.uploadFile({
        file,
        userId,
        ...(folderName && { folder: folderName }),
      });

      if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
        throw new Error("Failed to upload file");
      }

      const fileInfo = {
        fileUrl: s3FileUploadSdk.getPublicFileUrl({
          userId,
          file,
          ...(folderName && { folderName }),
        }),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        ...(folderName && { folderName }),
      };

      return {
        userId,
        uploadedByUserId: uploadedByUserId ? uploadedByUserId : null,
        ...fileInfo,
      };
    });

    const fileInfo = await Promise.all(filePromises);

    // Save to db

    const DBresponse = await prisma.fileUpload.createMany({
      data: fileInfo,
    });
    // console.log(DBresponse);
    return NextResponse.json({ DBresponse, fileInfo });
  } catch (reason) {
    console.log(reason);
    return NextResponse.json({ message: "failure" });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, userId, fileName, folderName } = await req.json();

    const response = await s3FileUploadSdk.deleteFile({
      userId: userId,
      fileName: fileName,
      ...(folderName && { folder: folderName }),
    });

    console.log(response);
    if (
      !response ||
      (response.$metadata.httpStatusCode !== 204 &&
        response.$metadata.httpStatusCode !== 200)
    ) {
      // return NextResponse.json({ message: "Failed to delete file" });
      throw new Error("Failed to delete file");
    }

    const DBresponse = await prisma.fileUpload.delete({
      where: {
        id: id,
      },
    });
    console.log(DBresponse);

    return NextResponse.json(DBresponse.fileName);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
