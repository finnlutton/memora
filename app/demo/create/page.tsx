"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function DemoCreatePage() {
  const router = useRouter();
  const { createGallery } = useMemoraStore();

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Try the demo
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">Create a test gallery</h1>
      </section>
      <GalleryForm
        createLabel="Create gallery"
        backHref="/"
        backLabel="Back to home"
        defaultCoverImage="/demo/mountain-window.svg"
        onSubmit={async (value) => {
          await createGallery(value);
          router.push("/galleries");
        }}
      />
    </AppShell>
  );
}
