import { prisma } from "@/prisma/prisma";
import { fileUploadSdk } from "@/utils/services/fileUploadSdk";
import { File } from "buffer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const loggedInUserId = req.nextUrl.searchParams.get("userId");
  // if (!loggedInUserId) {
  //   return NextResponse.json("User not found", { status: 404 });
  // }

  try {
    let certificates;

    if (loggedInUserId) {
      certificates = await prisma.certificate.findMany({
        where: {
          userId: loggedInUserId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      certificates = await prisma.certificate.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!certificates || certificates.length === 0) {
      return NextResponse.json("Certificate not found", { status: 404 });
    }

    return NextResponse.json(certificates);
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
    const certificateTitle = formData.get("certificateTitle") as string;
    if (!userId) {
      return NextResponse.json("User not found", { status: 404 });
    }

    const filePromises = files.map(async (file) => {
      const s3Response = await fileUploadSdk.uploadFile({
        file,
        userId,
        folder: "certificates",
      });

      if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
        throw new Error("Failed to upload file");
      }

      const fileInfo = {
        fileUrl: fileUploadSdk.getPublicFileUrl({
          userId,
          file,
          folder: "certificates",
        }),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      };

      return {
        userId,
        // uploadedByUserId: uploadedByUserId ? uploadedByUserId : null,
        ...fileInfo,
      };
    });

    const fileInfo = await Promise.all(filePromises);

    //fetch user info
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    // Save to db
    const uploadFilesToDbPromises = fileInfo.map((file) => {
      return prisma.fileUpload.create({
        data: file,
      });
    });
    const uploadFilesToDB = await Promise.all(uploadFilesToDbPromises);

    const addCertificatesToDbPromises = uploadFilesToDB.map((file) => {
      return prisma.certificate.create({
        data: {
          userId: file.userId,
          title: certificateTitle,
          uploadedByUserId: file.uploadedByUserId,
          fileId: file.id,
          file: file,
          userInfo: user,
        },
      });
    });
    const addCertificatesToDb = await Promise.all(addCertificatesToDbPromises);
    // const DBresponse = await prisma.certificate.createMany({
    //   data: fileInfo,
    // });
    // console.log(DBresponse);
    return NextResponse.json({ certificates: addCertificatesToDb });
  } catch (reason) {
    console.log(reason);
    return NextResponse.json({ message: "failure" });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, userId, fileName } = await req.json();

    const response = await fileUploadSdk.deleteFile({
      userId: userId,
      fileName: fileName,
      folder: "certificates",
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

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: id,
      },
    });
    const fileId = certificate?.fileId;

    if (!fileId) {
      throw new Error("Certificate file not found");
    }

    const deletedCertificateFile = await prisma.fileUpload.delete({
      where: {
        id: fileId,
      },
    });
    const deletedCertificateDoc = await prisma.certificate.delete({
      where: {
        id: id,
      },
    });
    return NextResponse.json({
      message: "Certificate deleted successfully",
      certificate: deletedCertificateDoc,
    });

    // return NextResponse.json(DBresponse);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: Request) {
  try {
    const { certificate: certificateData, deleteCertificateFromPrevId } =
      await req.json();

    if (deleteCertificateFromPrevId) {
      const downloadedFile = await fileUploadSdk.downloadFile({
        userId: deleteCertificateFromPrevId,
        fileName: certificateData.file.fileName,
        folder: "certificates",
      });

      if (
        !downloadedFile ||
        (downloadedFile.$metadata.httpStatusCode !== 200 &&
          downloadedFile.$metadata.httpStatusCode !== 204)
      ) {
        throw new Error("Error updating the document!");
      }

      const fileData = (await fileUploadSdk.streamToBuffer(
        downloadedFile?.Body!
      )) as Buffer;

      const addCertificateToNewIdInSpaces = await fileUploadSdk.uploadFile({
        fileInfoWithFileBuffer: {
          fileName: certificateData.file.fileName,
          fileType: certificateData.file.mimeType,
          fileBuffer: fileData,
        },
        userId: certificateData.userId,
        folder: "certificates",
      });

      if (
        !addCertificateToNewIdInSpaces ||
        (addCertificateToNewIdInSpaces.$metadata.httpStatusCode !== 200 &&
          addCertificateToNewIdInSpaces.$metadata.httpStatusCode !== 204)
      ) {
        throw new Error("Error updating the document!");
      }

      const response = await fileUploadSdk.deleteFile({
        userId: deleteCertificateFromPrevId,
        fileName: certificateData.file.fileName,
        folder: "certificates",
      });
      if (
        !response ||
        (response.$metadata.httpStatusCode !== 204 &&
          response.$metadata.httpStatusCode !== 200)
      ) {
        // return NextResponse.json({ message: "Failed to delete file" });
        throw new Error("Error updating the document!");
      }

      const updateFileRecord = await prisma.fileUpload.update({
        where: {
          id: certificateData.file.id,
        },
        data: {
          userId: certificateData.userId,
          userInfo: certificateData.userInfo,
        },
      });
    }
    const { id: certificateId, ...certificateDataWithoutId } = certificateData;
    const certificate = await prisma.certificate.update({
      where: {
        id: certificateId,
      },
      data: {
        ...certificateDataWithoutId,
        file: {
          ...certificateDataWithoutId.file,
          fileUrl: fileUploadSdk.getPublicFileUrl({
            userId: certificateDataWithoutId.userId,
            file: certificateDataWithoutId.file,
            folder: "certificates",
          }),
          userId: certificateDataWithoutId.userId,
          userInfo: certificateDataWithoutId.userInfo,
        },
      },
    });
    return NextResponse.json(certificate);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
