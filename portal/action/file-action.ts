'use server';
export async function fileProxy(url: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(decodeURIComponent(url));

    if (!response.ok) {
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`,
      );
    }

    const fileBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');
    // Get the file extension from the URL
    const fileExtension = url.split('.').pop()?.toLowerCase();

    // Determine the correct MIME type
    let mimeType = 'application/octet-stream'; // Default binary type
    if (fileExtension === 'pdf') {
      mimeType = 'application/pdf';
    } else if (fileExtension === 'png') {
      mimeType = 'image/png';
    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      mimeType = 'image/jpeg';
    }

    return {
      src: `data:${mimeType};base64,${base64Data}`,
      type: mimeType,
      name: url.split('/').pop(),
    };
  } catch (error) {
    console.error('Error fetching file:', error);
    return null;
  }
}
