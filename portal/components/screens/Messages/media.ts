/*
 * Prepares photos and videos in the browser before upload: photos are
 * resized (long side 2048 px) and get a small preview; videos get their
 * first frame as a preview, plus their size and length. No server work.
 */

export interface PreparedFile {
  file: Blob;
  name: string;
  mime: string;
  thumb?: Blob | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  /** A local link to show while it uploads. */
  previewUrl?: string | null;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const isImage = (mime: string) => mime.startsWith('image/');
export const isPlayableVideo = (mime: string) => VIDEO_TYPES.includes(mime);

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image.'));
    img.src = url;
  });

const drawScaled = (
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide: number,
) => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const jpgName = (name: string) => name.replace(/\.[^.]+$/, '') + '.jpg';

async function prepareImage(file: File): Promise<PreparedFile> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const thumb = await toBlob(
      drawScaled(img, width, height, 320),
      'image/jpeg',
      0.7,
    );
    // GIFs keep their animation; small photos are sent as they are.
    if (
      !IMAGE_TYPES.includes(file.type) ||
      (Math.max(width, height) <= 2048 && file.size < 1.5 * 1024 * 1024)
    )
      return {
        file,
        name: file.name,
        mime: file.type,
        thumb,
        width,
        height,
        previewUrl: url,
      };
    const resized = await toBlob(
      drawScaled(img, width, height, 2048),
      'image/jpeg',
      0.85,
    );
    const scale = Math.min(1, 2048 / Math.max(width, height));
    return {
      file: resized ?? file,
      name: resized ? jpgName(file.name) : file.name,
      mime: resized ? 'image/jpeg' : file.type,
      thumb,
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      previewUrl: url,
    };
  } catch {
    return { file, name: file.name, mime: file.type, previewUrl: url };
  }
}

async function prepareVideo(file: File): Promise<PreparedFile> {
  const url = URL.createObjectURL(file);
  const base: PreparedFile = {
    file,
    name: file.name,
    mime: file.type,
    previewUrl: url,
  };
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not read the video.'));
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 3000);
    });
    const thumb = await toBlob(
      drawScaled(video, video.videoWidth, video.videoHeight, 480),
      'image/jpeg',
      0.7,
    );
    return {
      ...base,
      thumb,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      duration: Number.isFinite(video.duration) ? video.duration : null,
    };
  } catch {
    return base;
  }
}

/** Gets a picked or pasted file ready to send. */
export function prepareFile(file: File): Promise<PreparedFile> {
  const mime = file.type || 'application/octet-stream';
  if (isImage(mime)) return prepareImage(file);
  if (isPlayableVideo(mime)) return prepareVideo(file);
  return Promise.resolve({ file, name: file.name, mime });
}
