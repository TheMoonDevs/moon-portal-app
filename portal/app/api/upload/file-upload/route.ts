import type { File } from 'buffer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { parseCreateInput } from '@/lib/mongodb/validation';
import { enforcePermission } from '@/lib/permissions/server';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';

export async function GET(req: NextRequest) {
  const denied = await enforcePermission('files:read');
  if (denied) return denied;

  const loggedInUserId = req.nextUrl.searchParams.get('userId');
  // if (!loggedInUserId) {
  //   return NextResponse.json("User not found", { status: 404 });
  // }

  try {
    let files;

    if (loggedInUserId) {
      files = await db.fileUpload.findMany({
        where: {
          userId: loggedInUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      files = await db.fileUpload.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    console.log(files);
    if (!files || files.length === 0) {
      return NextResponse.json('No Files found', { status: 404 });
    }

    return NextResponse.json(files);
  } catch (error) {
    console.log(error);
    return NextResponse.json('Something went wrong', { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await enforcePermission('files:create');
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as unknown as File[];

    if (!files || files.length === 0) {
      return NextResponse.json('File not found', { status: 404 });
    }

    const userId = formData.get('userId') as string;
    const uploadedByUserId = formData.get('uploadedByUserId') as string;
    const folderName = formData.get('folderName') as string;

    if (!userId) {
      return NextResponse.json('User not found', { status: 404 });
    }

    const filePromises = files.map(async (file) => {
      const s3Response = await s3FileUploadSdk.uploadFile({
        file,
        userId,
        ...(folderName && { folder: folderName }),
      });

      if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
        throw new Error('Failed to upload file');
      }

      const fileInfo = {
        fileUrl: s3FileUploadSdk.getPublicFileUrl({
          userId,
          file,
          folder: folderName,
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
    const parsedFileInfo = fileInfo.map((item) =>
      parseCreateInput('fileUpload', item),
    );

    // Save to db

    const DBresponse = await db.fileUpload.createMany({
      data: parsedFileInfo,
    });

    return NextResponse.json({ DBresponse, fileInfo: parsedFileInfo });
  } catch (reason) {
    console.log(reason);
    return NextResponse.json({ message: 'failure' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await enforcePermission('files:create');
  if (denied) return denied;

  try {
    const { id } = await req.json();

    const DBresponse = await db.fileUpload.delete({
      where: {
        id: id,
      },
    });

    const { userId, fileName, folderName } = DBresponse;

    if (!DBresponse || !fileName || !userId || !folderName) {
      throw new Error(
        'Failed to delete file! Any of the fields are missing: userId, fileName, folderName',
      );
    }

    const response = await s3FileUploadSdk.deleteFile({
      userId: userId,
      fileName: fileName,
      folder: folderName,
    });

    if (
      !response ||
      (response.$metadata.httpStatusCode !== 204 &&
        response.$metadata.httpStatusCode !== 200)
    ) {
      // return NextResponse.json({ message: "Failed to delete file" });
      throw new Error('Failed to delete file');
    }

    return NextResponse.json({ DBresponse });
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
