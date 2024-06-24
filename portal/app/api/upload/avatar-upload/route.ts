import { prisma } from "@/prisma/prisma";
import { s3FileUploadSdk } from "@/utils/services/fileUploadSdk";
import { File } from "buffer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as unknown as File[];

    if (!files || files.length === 0) {
      return NextResponse.json("File not found", { status: 404 });
    }

    const filePromises = files.map(async (file) => {
      const s3Response = await s3FileUploadSdk.uploadFile({
        file,
      });

      if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
        throw new Error("Failed to upload file");
      }

      const fileInfo = {
        fileUrl: s3FileUploadSdk.getPublicFileUrl({
          file,
        }),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      };

      return {
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
