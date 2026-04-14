"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Share2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { CreateSharePanel } from "@/components/share/create-share-panel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { createId } from "@/lib/utils";
import { getMembershipPlan } from "@/lib/plans";
import type { RecipientGroup } from "@/types/share";

export default function GalleriesPage() {
  const { galleries, hydrated, onboarding } = useMemoraStore();
  const [shareMode, setShareMode] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([
    {
      id: createId("group"),
      name: "Parents",
      members: [{ id: createId("member"), label: "Mom & Dad" }],
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId("group"),
      name: "Grandparents",
      members: [{ id: createId("member"), label: "Grandma & Grandpa" }],
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId("group"),
      name: "Close Friends",
      members: [{ id: createId("member"), label: "Core group" }],
      updatedAt: new Date().toISOString(),
    },
  ]);
  const sortedGalleries = useMemo(
    () =>
      [...galleries].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [galleries],
  );
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const hasReachedGalleryLimit = Boolean(
    onboarding.isAuthenticated &&
      selectedPlan &&
      sortedGalleries.length >= selectedPlan.galleryCount,
  );
  const usageLabel = selectedPlan
    ? `${sortedGalleries.length} of ${selectedPlan.galleryCount} active galleries`
    : `${sortedGalleries.length} galleries in archive`;
  const selectedCount = selectedGalleryIds.length;
  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Workspace"
        title="My Galleries"
        subtitle="Curate, preserve, and share your experiences here."
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              className="text-[color:var(--ink)]"
              onClick={() => {
                setShareMode(true);
                setSharePanelOpen(false);
                setSelectedGalleryIds([]);
                setSelectedGroupIds([]);
                setCustomMessage("");
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Galleries
            </Button>
            {hasReachedGalleryLimit ? (
              <Button asChild variant="secondary">
                <Link href="/pricing?source=gallery-limit">Upgrade membership</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/galleries/new">
                  <Plus className="h-3 w-3" />
                  Create gallery
                </Link>
              </Button>
            )}
          </>
        }
      />

      <section className="mb-4 grid gap-4 md:grid-cols-3 md:gap-6">
        <QuickStat label="Membership" value={selectedPlan?.name ?? "No plan selected"} />
        <QuickStat label="Archive usage" value={usageLabel} />
        <QuickStat
          label="Next step"
          value={sortedGalleries.length ? "Open a gallery to continue" : "Create your first gallery"}
        />
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="mt-7 space-y-4">
          {shareMode ? (
            <div className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.64)] px-3 py-2 text-sm text-[color:var(--ink-soft)]">
              <span>
                Share mode active. Select one or more galleries.
              </span>
              <span className="text-[color:var(--ink)]">{selectedCount} selected</span>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
          {sortedGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              shareSelectable={shareMode}
              selected={selectedGalleryIds.includes(gallery.id)}
              onToggleSelected={(galleryId) =>
                setSelectedGalleryIds((current) =>
                  current.includes(galleryId)
                    ? current.filter((entry) => entry !== galleryId)
                    : [...current, galleryId],
                )
              }
            />
          ))}
          </div>
        </section>
      ) : onboarding.isAuthenticated ? (
        <section className="px-6 py-20 text-center md:px-10">
          <p className="font-serif text-3xl leading-tight text-[color:var(--ink-faint)] md:text-4xl">
            One gallery at a time...
          </p>
        </section>
      ) : (
        <EmptyState
          title="No galleries yet"
          description="Start with a trip, a season, or a chapter of life. Memora works best when each gallery has a clear emotional frame."
          actionHref="/galleries/new"
          actionLabel="Create your first gallery"
        />
      )}
      <CreateSharePanel
        open={sharePanelOpen}
        onOpenChange={(next) => {
          setSharePanelOpen(next);
          if (!next) {
            setShareMode(false);
            setSelectedGalleryIds([]);
            setSelectedGroupIds([]);
            setCustomMessage("");
          }
        }}
        selectedGalleryCount={selectedGalleryIds.length}
        selectedGalleryIds={selectedGalleryIds}
        groups={recipientGroups}
        selectedGroupIds={selectedGroupIds}
        customMessage={customMessage}
        onToggleGroup={(groupId) =>
          setSelectedGroupIds((current) =>
            current.includes(groupId)
              ? current.filter((entry) => entry !== groupId)
              : [...current, groupId],
          )
        }
        onCustomMessageChange={setCustomMessage}
        onGroupsChange={setRecipientGroups}
        onCreateShare={async (input) => {
          const response = await fetch("/api/shares", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          });
          const payload = (await response.json()) as { error?: string; shareUrl?: string };
          if (!response.ok || !payload.shareUrl) {
            throw new Error(payload.error ?? "Unable to create share link.");
          }
          return { shareUrl: payload.shareUrl };
        }}
      />
      {shareMode && !sharePanelOpen ? (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border border-[rgba(34,52,79,0.12)] bg-[rgba(251,253,255,0.95)] p-2 shadow-[0_14px_34px_rgba(16,24,38,0.15)] md:bottom-7 md:right-7">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShareMode(false);
              setSelectedGalleryIds([]);
              setSelectedGroupIds([]);
              setCustomMessage("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedGalleryIds.length === 0}
            onClick={() => setSharePanelOpen(true)}
          >
            Continue to share
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative px-1 py-0.5 md:pl-4">
      <span className="absolute left-0 top-1 hidden h-10 w-px bg-[rgba(36,58,88,0.14)] md:block" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] leading-6 text-[color:var(--ink)]">{value}</p>
    </div>
  );
}
