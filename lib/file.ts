import { createId } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
