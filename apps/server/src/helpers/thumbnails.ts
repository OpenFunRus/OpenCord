import fs from 'fs/promises';
import path from 'path';
import { PUBLIC_PATH } from './paths';

const THUMBNAIL_MAX_WIDTH = 320;
const THUMBNAILS_DIR = path.join(PUBLIC_PATH, '.thumbs');

const THUMBNAIL_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);
let jimpLoaderAttempted = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jimpReader: any | null = null;

const canGenerateThumbnailForMime = (mimeType: string): boolean => {
  return THUMBNAIL_ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
};

const getThumbnailCachePath = (fileName: string): string => {
  return path.join(THUMBNAILS_DIR, `${fileName}.png`);
};

const getJimpReader = async () => {
  if (jimpLoaderAttempted) {
    return jimpReader;
  }

  jimpLoaderAttempted = true;

  try {
    // jimp is pure JS, so it works in both Windows .exe and Linux runtime.
    const jimpModule = (await import('jimp')) as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Jimp?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default?: any;
    };
    jimpReader = jimpModule.Jimp ?? jimpModule.default ?? null;
  } catch {
    jimpReader = null;
  }

  return jimpReader;
};

const ensureThumbnail = async (
  sourcePath: string,
  fileName: string,
  mimeType: string
): Promise<string | null> => {
  if (!canGenerateThumbnailForMime(mimeType)) {
    return null;
  }

  const thumbPath = getThumbnailCachePath(fileName);

  try {
    await fs.access(thumbPath);
    return thumbPath;
  } catch {
    // continue and generate new thumbnail
  }

  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

  const Jimp = await getJimpReader();
  if (!Jimp) {
    return null;
  }

  try {
    const image = await Jimp.read(sourcePath);
    image.scaleToFit({
      w: THUMBNAIL_MAX_WIDTH,
      h: THUMBNAIL_MAX_WIDTH
    });
    await image.write(thumbPath);
  } catch {
    // Failed to decode/encode this specific image; return original as fallback.
    return null;
  }

  return thumbPath;
};

export {
  canGenerateThumbnailForMime,
  ensureThumbnail,
  getThumbnailCachePath
};
