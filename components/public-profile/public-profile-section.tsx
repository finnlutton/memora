"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicProfileGalleriesPicker } from "@/components/public-profile/public-profile-galleries-picker";
import { PublicProfileSettings } from "@/components/public-profile/public-profile-settings";

type ProfileStatus = {
  enabled: boolean;
  handle: string | null;
};

// Collapsible wrapper for the Public Memora page settings. Default is
// closed because the section, fully expanded, has 4 fields, a save
// button, and a list of every gallery — too much to dump on the
// Settings page above all the other rows. The header always shows a
// status chip ("Live · @handle" / "Off") so the state is legible
// without expanding.
//
// Owns a single GET /api/public-profile fetch for the status chip.
// PublicProfileSettings still does its own fetch internally; on save
// it calls onProfileChange so the chip stays in sync without the
// parent and child arguing over who owns the form state.
export function PublicProfileSection() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProfileStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/public-profile");
      if (!response.ok) {
        // Common case in dev: migration not applied yet → 500 with
        // "column ... does not exist". Show "Off" on the chip and
        // surface the real error inside the form once it's expanded.
        setStatus({ enabled: false, handle: null });
        return;
      }
      const data = (await response.json()) as ProfileStatus;
      setStatus({ enabled: Boolean(data.enabled), handle: data.handle ?? null });
      setStatusError(null);
    } catch (caught) {
      setStatusError(
        caught instanceof Error ? caught.message : "Could not load status.",
      );
      setStatus({ enabled: false, handle: null });
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return (
    <section
      aria-labelledby="settings-public-profile-heading"
      className="mx-auto mb-6 w-full max-w-5xl border-b border-[color:var(--border)] pb-6"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="settings-public-profile-body"
        className="flex w-full items-center gap-3 py-2 text-left transition"
      >
        <span className="min-w-0 flex-1">
          <span
            id="settings-public-profile-heading"
            className="block text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]"
          >
            Public Memora page
          </span>
          {open ? null : (
            <span className="mt-1.5 block text-sm text-[color:var(--ink-soft)]">
              {statusToSubtitle(status)}
            </span>
          )}
        </span>
        <StatusChip status={status} />
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-[color:var(--ink-soft)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div id="settings-public-profile-body" className="mt-2">
          <p className="max-w-xl text-sm text-[color:var(--ink-soft)]">
            One clean URL —{" "}
            <span className="font-[family-name:var(--font-mono)]">
              memoragallery.com/@yourhandle
            </span>{" "}
            — that shows just the galleries you choose. Great for an Instagram
            bio link.
          </p>
          {statusError ? (
            <p className="mt-3 text-[12px] text-[color:var(--accent-strong)]">
              {statusError}
            </p>
          ) : null}
          <PublicProfileSettings onProfileChange={fetchStatus} />
          <PublicProfileGalleriesPicker />
        </div>
      ) : null}
    </section>
  );
}

function statusToSubtitle(status: ProfileStatus | null) {
  if (!status) return "Loading…";
  if (status.enabled && status.handle) {
    return `Live at /@${status.handle}.`;
  }
  if (status.handle) {
    return `Handle @${status.handle} reserved — page is off.`;
  }
  return "Off — set up a handle to share your archive publicly.";
}

function StatusChip({ status }: { status: ProfileStatus | null }) {
  if (!status) return null;
  const live = status.enabled && Boolean(status.handle);
  return (
    <span
      className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] sm:inline-flex ${
        live
          ? "border-[color:var(--accent-strong)] bg-[rgba(46,78,114,0.08)] text-[color:var(--accent-strong)]"
          : "border-[color:var(--border-strong)] text-[color:var(--ink-soft)]"
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          live ? "bg-[color:var(--accent-strong)]" : "bg-[color:var(--ink-faint)]"
        }`}
      />
      {live ? "Live" : "Off"}
    </span>
  );
}
