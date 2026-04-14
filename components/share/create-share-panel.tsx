"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createId } from "@/lib/utils";
import type { RecipientGroup } from "@/types/share";

type CreateSharePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGalleryCount: number;
  selectedGalleryIds: string[];
  groups: RecipientGroup[];
  selectedGroupIds: string[];
  customMessage: string;
  onToggleGroup: (groupId: string) => void;
  onCustomMessageChange: (value: string) => void;
  onGroupsChange: (groups: RecipientGroup[]) => void;
  onCreateShare: (input: { galleryIds: string[]; message: string }) => Promise<{ shareUrl: string }>;
};

export function CreateSharePanel({
  open,
  onOpenChange,
  selectedGalleryCount,
  selectedGalleryIds,
  groups,
  selectedGroupIds,
  customMessage,
  onToggleGroup,
  onCustomMessageChange,
  onGroupsChange,
  onCreateShare,
}: CreateSharePanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState("");

  const selectedGroupsCount = selectedGroupIds.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const editingGroup = useMemo(
    () => groups.find((group) => group.id === editingGroupId) ?? null,
    [groups, editingGroupId],
  );

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      setShareUrl(null);
      setEditingGroupId(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-end">
      <div className="pointer-events-auto h-full w-full max-w-[34rem] border-l border-[rgba(26,42,67,0.14)] bg-[rgba(251,253,255,0.98)] p-6 shadow-[-18px_0_48px_rgba(14,22,34,0.14)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Share</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--ink)]">
              Create a share set
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              Choose galleries, pick recipient groups, and add a custom note. Sending and public pages come next.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--ink-soft)] transition hover:bg-[rgba(22,35,56,0.06)] hover:text-[color:var(--ink)]"
            aria-label="Close share panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {error ? (
            <p className="rounded-lg border border-[#d8a5a5] bg-[#fff6f6] px-3 py-2 text-sm text-[#8f4848]">
              {error}
            </p>
          ) : null}
          {shareUrl ? (
            <div className="rounded-xl border border-[rgba(26,42,67,0.12)] bg-white/88 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">Share link ready</p>
              <p className="mt-2 break-all text-sm text-[color:var(--ink)]">{shareUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (typeof navigator === "undefined" || !navigator.clipboard) return;
                    await navigator.clipboard.writeText(shareUrl);
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
                >
                  Open Preview
                </Button>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : null}
          <section className="space-y-2 border-b border-[rgba(26,42,67,0.1)] pb-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">Selected galleries</p>
            <p className="text-sm text-[color:var(--ink)]">
              <span className="font-medium">{selectedGalleryCount}</span> selected
            </p>
          </section>

          <section className="space-y-3 border-b border-[rgba(26,42,67,0.1)] pb-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                Recipient groups
              </p>
              <p className="text-xs text-[color:var(--ink-soft)]">{selectedGroupsCount} selected</p>
            </div>

            <div className="space-y-2">
              {groups.map((group) => {
                const checked = selectedGroupIds.includes(group.id);
                return (
                  <div key={group.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.id)}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition ${
                        checked
                          ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white"
                          : "border-[rgba(41,62,90,0.28)] text-transparent"
                      }`}
                      aria-label={`Select ${group.name}`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(group.id)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-left text-sm text-[color:var(--ink)] transition hover:bg-[rgba(22,35,56,0.05)]"
                    >
                      <p>{group.name}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
                        {group.members.map((member) => member.label).join(", ") || "No members yet"}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-[rgba(26,42,67,0.12)] bg-white/75 p-3">
              <p className="text-xs text-[color:var(--ink-soft)]">Create new group</p>
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Group name (e.g. Close Friends)"
                className="mt-2 w-full border border-[rgba(26,42,67,0.12)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
              />
              <input
                value={newGroupMembers}
                onChange={(event) => setNewGroupMembers(event.target.value)}
                placeholder="Members (comma separated)"
                className="mt-2 w-full border border-[rgba(26,42,67,0.12)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
              />
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  const name = newGroupName.trim();
                  if (!name) return;
                  const members = newGroupMembers
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((label) => ({ id: createId("member"), label }));
                  onGroupsChange([
                    ...groups,
                    {
                      id: createId("group"),
                      name,
                      members,
                      updatedAt: new Date().toISOString(),
                    },
                  ]);
                  setNewGroupName("");
                  setNewGroupMembers("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add group
              </Button>
            </div>

            {editingGroup ? (
              <div className="rounded-xl border border-[rgba(26,42,67,0.12)] bg-white/78 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">Edit group</p>
                  <button
                    type="button"
                    onClick={() => setEditingGroupId(null)}
                    className="text-xs text-[color:var(--ink-soft)] underline-offset-2 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <input
                  value={editingGroup.name}
                  onChange={(event) =>
                    onGroupsChange(
                      groups.map((group) =>
                        group.id === editingGroup.id
                          ? { ...group, name: event.target.value, updatedAt: new Date().toISOString() }
                          : group,
                      ),
                    )
                  }
                  className="mt-2 w-full border border-[rgba(26,42,67,0.12)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
                />
                <textarea
                  value={editingGroup.members.map((member) => member.label).join(", ")}
                  onChange={(event) => {
                    const members = event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean)
                      .map((label) => ({ id: createId("member"), label }));
                    onGroupsChange(
                      groups.map((group) =>
                        group.id === editingGroup.id
                          ? { ...group, members, updatedAt: new Date().toISOString() }
                          : group,
                      ),
                    );
                  }}
                  className="mt-2 min-h-20 w-full resize-none border border-[rgba(26,42,67,0.12)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 text-[#9a4545] hover:bg-[#fff2f2] hover:text-[#9a4545]"
                  onClick={() => {
                    onGroupsChange(groups.filter((group) => group.id !== editingGroup.id));
                    setEditingGroupId(null);
                  }}
                >
                  Remove group
                </Button>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
              Custom message
            </label>
            <textarea
              value={customMessage}
              onChange={(event) => onCustomMessageChange(event.target.value)}
              placeholder="Optional message to show above shared galleries. Example: We loved this trip and wanted to share highlights with you."
              className="min-h-28 w-full resize-none border border-[rgba(26,42,67,0.12)] bg-white px-3 py-2 text-sm leading-6 text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
            />
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[rgba(26,42,67,0.1)] pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || selectedGalleryIds.length === 0 || selectedGroupIds.length === 0}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const result = await onCreateShare({
                  galleryIds: selectedGalleryIds,
                  message: customMessage,
                });
                setShareUrl(result.shareUrl);
              } catch (createError) {
                setError(createError instanceof Error ? createError.message : "Unable to create share link.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            {busy ? "Creating..." : "Create share link"}
          </Button>
        </div>
      </div>
    </div>
  );
}

