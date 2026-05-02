import { createId } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

/** Keeps base64 payloads small enough for localStorage (~5MB limit in most browsers). */
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Wall-clock cap on `createImageBitmap`. On slow phones, large or oddly-encoded
 * files (looking at you, 50MB iPhone HEIC) can decode for ages or never resolve
 * at all. We'd rather fail fast and let the caller surface a clear error than
 * leave the user staring at a spinner.
 */
const DECODE_TIMEOUT_MS = 30_000;

/**
 * If compression fails (HEIC without browser support, decode error, missing
 * canvas API, timeout), we fall back to the original file as-is. Cap that
 * fallback size so a multi-megabyte raw upload doesn't slip through — anything
 * larger gets rejected and surfaces an error instead.
 */
const RAW_FALLBACK_MAX_BYTES = 5 * 1024 * 1024;

class CompressionError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "CompressionError";
    this.userMessage = userMessage;
  }
}

function readFileAsRawDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function decodeImageBitmap(file: File): Promise<ImageBitmap> {
  return new Promise<ImageBitmap>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Image decode timed out"));
    }, DECODE_TIMEOUT_MS);
    createImageBitmap(file).then(
      (bitmap) => {
        clearTimeout(timer);
        resolve(bitmap);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function fitWithinMaxEdge(width: number, height: number) {
  if (width <= MAX_EDGE_PX && height <= MAX_EDGE_PX) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: MAX_EDGE_PX,
      height: Math.round((height * MAX_EDGE_PX) / width),
    };
  }
  return {
    width: Math.round((width * MAX_EDGE_PX) / height),
    height: MAX_EDGE_PX,
  };
}

async function compressRasterImageToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await decodeImageBitmap(file);
  try {
    const { width, height } = fitWithinMaxEdge(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

function rejectIfFallbackTooLarge(file: File): void {
  if (file.size > RAW_FALLBACK_MAX_BYTES) {
    throw new CompressionError(
      "We couldn't process this image. Try a smaller file or a JPEG/PNG export.",
    );
  }
}

/**
 * Reads an image file as a data URL, resizing and JPEG-compressing raster images
 * so localStorage quota is not exceeded as quickly. Falls back to the raw bytes
 * only for small originals; larger files that fail to decode are rejected so we
 * don't blow the localStorage budget with a multi-MB data URL.
 */
export async function readFileAsDataUrl(file: File) {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    rejectIfFallbackTooLarge(file);
    return readFileAsRawDataUrl(file);
  }
  try {
    return await compressRasterImageToJpegDataUrl(file);
  } catch (error) {
    if (error instanceof CompressionError) throw error;
    rejectIfFallbackTooLarge(file);
    return readFileAsRawDataUrl(file);
  }
}

/**
 * Resize + re-encode an image File before upload so we don't ship a
 * raw 12 MP camera JPEG to storage. Caps the long edge at 1920 px and
 * re-encodes as JPEG @ q=82 — visually identical at the sizes Memora
 * actually displays, but typically 5–15× smaller on disk and over the
 * wire. Falls back to the original File on any failure (HEIC without
 * browser support, decode error, missing canvas API), but only for small
 * originals — large files that can't be compressed are rejected with a
 * user-readable error rather than uploaded raw.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    rejectIfFallbackTooLarge(file);
    return file;
  }
  try {
    const bitmap = await decodeImageBitmap(file);
    try {
      const { width, height } = fitWithinMaxEdge(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) throw new Error("Canvas toBlob returned null");
      const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch (error) {
    if (error instanceof CompressionError) throw error;
    rejectIfFallbackTooLarge(file);
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
