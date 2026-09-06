export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SUPPORTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Prepares a picked image for upload: downscales it to a compact WebP avatar
 * (~≤512px) so uploads stay tiny. When the browser cannot decode/re-encode the
 * file (e.g. HEIC), the original is returned if its MIME type is supported,
 * otherwise an error is thrown.
 */
export async function preparePhotoFile(file: File): Promise<File> {
  if (file.size === 0) throw new Error('That file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Image must be 5 MB or smaller.');
  try {
    return await downscaleToWebp(file);
  } catch {
    if (SUPPORTED_PHOTO_TYPES.includes(file.type)) return file;
    throw new Error('Unsupported image — use JPG, PNG, WebP or GIF.');
  }
}

async function downscaleToWebp(file: File, maxDimension = 512): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available.');
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob) throw new Error('Could not encode the image.');
    return new File([blob], 'avatar.webp', { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
