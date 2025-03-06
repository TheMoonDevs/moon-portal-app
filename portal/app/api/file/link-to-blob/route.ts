import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, res: NextResponse) {
  const fileUrl = req.nextUrl.searchParams.get('fileUrl');

  if (!fileUrl) {
    return NextResponse.json(
      { error: 'File URL not provided' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(decodeURIComponent(fileUrl));
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`,
      );
    }

    const fileBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');
    // Get the file extension from the URL
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase();

    // Determine the correct MIME type
    let mimeType = 'application/octet-stream'; // Default binary type
    if (fileExtension === 'pdf') {
      mimeType = 'application/pdf';
    } else if (fileExtension === 'png') {
      mimeType = 'image/png';
    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      mimeType = 'image/jpeg';
    }

    return NextResponse.json({
      status: 'success',
      data: {
        src: `data:${mimeType};base64,${base64Data}`,
        type: mimeType,
        name: fileUrl.split('/').pop(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 },
    );
  }
}
