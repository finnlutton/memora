"use client";

import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubgalleryForm } from "@/components/subgallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function EditSubgalleryPage() {
  const params = useParams<{ galleryId: string; subgalleryId: string }>();
  const router = useRouter();
  const { getSubgallery, updateSubgallery, hydrated } = useMemoraStore();
  const subgallery = getSubgallery(params.galleryId, params.subgalleryId);

  if (!subgallery) {
    return (
      <AppShell>
        {hydrated ? (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Subgallery not found.
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Loading subgallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Edit subgallery
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">{subgallery.title}</h1>
      </section>
      <SubgalleryForm
        galleryId={params.galleryId}
        initialValue={subgallery}
        onSubmit={async (value) => {
          await updateSubgallery(params.galleryId, params.subgalleryId, value);
          router.push(`/galleries/${params.galleryId}/subgalleries/${params.subgalleryId}`);
        }}
      />
    </AppShell>
  );
}
