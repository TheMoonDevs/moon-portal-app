import { s3FileUploadSdk } from "@/utils/services/s3FileUploadSdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json("File not found", { status: 404 });
    }

    const s3Response = await s3FileUploadSdk.uploadFile({
      file,
      folder: "quicklinks",
    });

    if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to upload file");
    }

    const fileInfo = {
      fileUrl: s3FileUploadSdk.getPublicFileUrl({ file, folder: "quicklinks" }),
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    };

    return NextResponse.json({ fileInfo });
  } catch (reason) {
    console.log(reason);
    return NextResponse.json({ message: "failure" });
  }
}
