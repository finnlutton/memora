"use client";

import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubgalleryForm } from "@/components/subgallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function NewSubgalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { createSubgallery, getGallery, hydrated } = useMemoraStore();
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
      <section className="mb-4 md:mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Add subgallery
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:mt-3 md:text-5xl">
          Add a new scene
        </h1>
      </section>
      <SubgalleryForm
        galleryId={params.galleryId}
        onSubmit={async (value) => {
          const subgalleryId = await createSubgallery(params.galleryId, value);
          router.push(`/galleries/${params.galleryId}/subgalleries/${subgalleryId}`);
        }}
      />
    </AppShell>
  );
}
