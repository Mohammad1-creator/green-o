// Shrinks a photo in the browser before upload: phone photos are often
// 3-8 MB, while 1600 px JPEG is plenty to show a fault or a finished job.

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PreparedImage = {
  blob: Blob;
  mimeType: (typeof ALLOWED_IMAGE_TYPES)[number];
  extension: string;
};

const EXTENSIONS: Record<PreparedImage["mimeType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isAllowed(type: string): type is PreparedImage["mimeType"] {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Returns a JPEG no larger than maxSide on its long edge, honouring the
 * camera's orientation. Falls back to the original file when the browser
 * cannot decode it but the format is allowed; otherwise returns null.
 */
export async function prepareImage(
  file: File,
  maxSide = 1600,
  quality = 0.82,
): Promise<PreparedImage | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    return isAllowed(file.type)
      ? { blob: file, mimeType: file.type, extension: EXTENSIONS[file.type] }
      : null;
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ? { blob, mimeType: "image/jpeg", extension: "jpg" } : null;
}
