"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function NewGalleryPage() {
  const router = useRouter();
  const { createGallery } = useMemoraStore();

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Create gallery
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">Compose a new memory</h1>
      </section>
      <GalleryForm
        onSubmit={(value) => {
          const galleryId = createGallery(value);
          router.push(`/galleries/${galleryId}`);
        }}
      />
    </AppShell>
  );
}
