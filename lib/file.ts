import { createId } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

/** Keeps base64 payloads small enough for localStorage (~5MB limit in most browsers). */
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;

function readFileAsRawDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressRasterImageToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const max = MAX_EDGE_PX;
    if (width > max || height > max) {
      if (width >= height) {
        height = Math.round((height * max) / width);
        width = max;
      } else {
        width = Math.round((width * max) / height);
        height = max;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return readFileAsRawDataUrl(file);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

/**
 * Reads an image file as a data URL, resizing and JPEG-compressing raster images
 * so localStorage quota is not exceeded as quickly.
 */
export async function readFileAsDataUrl(file: File) {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return readFileAsRawDataUrl(file);
  }
  try {
    return await compressRasterImageToJpegDataUrl(file);
  } catch {
    return readFileAsRawDataUrl(file);
  }
}

export async function filesToPhotos(
  files: File[],
  subgalleryId: string,
  startingOrder = 0,
) {
  const photos: MemoryPhoto[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const src = await readFileAsDataUrl(file);
    photos.push({
      id: createId("photo"),
      subgalleryId,
      src,
      caption: "",
      createdAt: new Date().toISOString(),
      order: startingOrder + index,
    });
  }

  return photos;
}
