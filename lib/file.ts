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

/**
 * Resize + re-encode an image File before upload so we don't ship a
 * raw 12 MP camera JPEG to storage. Caps the long edge at 1920 px and
 * re-encodes as JPEG @ q=82 — visually identical at the sizes Memora
 * actually displays, but typically 5–15× smaller on disk and over the
 * wire. Falls back to the original File on any failure (SSR, non-image
 * MIME, decode error, missing canvas API).
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }
  try {
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
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) return file;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch {
    // If anything goes wrong (HEIC without browser support, decode
    // failure, etc.), fall back to the original file rather than
    // blocking the upload.
    return file;
  }
}

export async function filesToPhotos(
  files: File[],
  subgalleryId: string | null,
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
