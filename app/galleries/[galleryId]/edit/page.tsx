"use client";

import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function EditGalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { getGallery, updateGallery, hydrated } = useMemoraStore();
  const gallery = getGallery(params.galleryId);

  if (!gallery) {
    return (
      <AppShell>
        {hydrated ? (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Gallery not found.
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Loading gallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Edit gallery
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">{gallery.title}</h1>
      </section>
      <GalleryForm
        initialValue={gallery}
        onSubmit={(value) => {
          updateGallery(gallery.id, value);
          router.push(`/galleries/${gallery.id}`);
        }}
      />
    </AppShell>
  );
}
