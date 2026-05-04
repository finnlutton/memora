"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  PUBLIC_BIO_MAX_LENGTH,
  PUBLIC_DISPLAY_NAME_MAX_LENGTH,
  PUBLIC_HANDLE_MAX_LENGTH,
  buildPublicProfileUrl,
  normalizeHandleInput,
  validateHandle,
} from "@/lib/public-profile";

type ProfilePayload = {
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  enabled: boolean;
};

type HandleStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; handle: string }
  | { kind: "error"; message: string };

export function PublicProfileSettings() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload>({
    handle: null,
    displayName: null,
    bio: null,
    enabled: false,
  });

  const [handleDraft, setHandleDraft] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [handleStatus, setHandleStatus] = useState<HandleStatus>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold the latest in-flight handle-check token so a slow response
  // doesn't overwrite a newer "checking" or "ok" state.
  const checkTokenRef = useRef(0);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/public-profile");
        if (!response.ok) throw new Error("Could not load your public page settings.");
        const data = (await response.json()) as ProfilePayload;
        if (cancelled) return;
        setProfile(data);
        setHandleDraft(data.handle ?? "");
        setDisplayNameDraft(data.displayName ?? "");
        setBioDraft(data.bio ?? "");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load settings.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const publicUrl = useMemo(() => {
    if (!profile.handle) return null;
    if (typeof window === "undefined") return null;
    return buildPublicProfileUrl(window.location.origin, profile.handle);
  }, [profile.handle]);

  const checkHandle = useCallback(
    async (raw: string) => {
      const normalized = normalizeHandleInput(raw);
      if (!normalized) {
        setHandleStatus({ kind: "idle" });
        return;
      }
      // Reusing the current handle is always "ok" for the current user.
      if (profile.handle && normalized === profile.handle) {
        setHandleStatus({ kind: "ok", handle: normalized });
        return;
      }
      const local = validateHandle(normalized);
      if (!local.ok) {
        setHandleStatus({ kind: "error", message: local.message });
        return;
      }

      const token = ++checkTokenRef.current;
      setHandleStatus({ kind: "checking" });
      try {
        const response = await fetch("/api/public-profile/check-handle", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ handle: normalized }),
        });
        const data = (await response.json()) as
          | { available: true; handle: string }
          | { available: false; message: string };
        if (token !== checkTokenRef.current) return;
        if (data.available) {
          setHandleStatus({ kind: "ok", handle: data.handle });
        } else {
          setHandleStatus({ kind: "error", message: data.message });
        }
      } catch {
        if (token === checkTokenRef.current) {
          setHandleStatus({
            kind: "error",
            message: "Could not check availability. Try again.",
          });
        }
      }
    },
    [profile.handle],
  );

  const persistPatch = useCallback(
    async (patch: Record<string, unknown>, successMessage: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/public-profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await response.json()) as ProfilePayload | { error: string };
        if (!response.ok) {
          throw new Error(
            (data as { error: string }).error ?? "Could not save your changes.",
          );
        }
        const fresh = data as ProfilePayload;
        setProfile(fresh);
        setHandleDraft(fresh.handle ?? "");
        setDisplayNameDraft(fresh.displayName ?? "");
        setBioDraft(fresh.bio ?? "");
        setHandleStatus({ kind: "idle" });
        addToast(successMessage, "success");
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Unable to save right now.",
        );
      } finally {
        setBusy(false);
      }
    },
    [addToast],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const normalizedHandle = normalizeHandleInput(handleDraft);
    if (normalizedHandle) {
      const local = validateHandle(normalizedHandle);
      if (!local.ok) {
        setError(local.message);
        return;
      }
    }
    await persistPatch(
      {
        handle: normalizedHandle || null,
        displayName: displayNameDraft.trim() || null,
        bio: bioDraft.trim() || null,
      },
      "Public page updated.",
    );
  };

  const toggleEnabled = async (next: boolean) => {
    if (next && !profile.handle && !normalizeHandleInput(handleDraft)) {
      setError("Pick a handle first, then enable your public page.");
      return;
    }
    // If we're enabling and the user has typed a handle but not saved,
    // include it in the same patch so they don't have to click twice.
    const pendingHandle = normalizeHandleInput(handleDraft);
    const includeHandle =
      next && !profile.handle && pendingHandle && pendingHandle !== "";
    const patch: Record<string, unknown> = { enabled: next };
    if (includeHandle) {
      const local = validateHandle(pendingHandle);
      if (!local.ok) {
        setError(local.message);
        return;
      }
      patch.handle = local.handle;
    }
    await persistPatch(
      patch,
      next ? "Public page is live." : "Public page disabled.",
    );
  };

  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      addToast("Link copied to clipboard", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast("Could not copy. Long-press the link instead.", "error");
    }
  };

  if (loading) {
    return (
      <div className="mt-3 space-y-2 text-sm text-[color:var(--ink-soft)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      {/* Status row + enable toggle. */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={profile.enabled}
          disabled={busy}
          onClick={() => void toggleEnabled(!profile.enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
            profile.enabled
              ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)]"
              : "border-[color:var(--border-strong)] bg-[color:var(--paper)]"
          } disabled:opacity-50`}
        >
          <span
            aria-hidden
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              profile.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-[color:var(--ink)]">
          {profile.enabled ? "Public page is live" : "Public page is off"}
        </span>
      </div>

      {/* Live URL + copy button (only when handle is set). */}
      {profile.handle ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2">
          <span className="break-all font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--ink)]">
            {publicUrl ?? `/@${profile.handle}`}
          </span>
          <span aria-hidden className="flex-1" />
          <button
            type="button"
            onClick={copyUrl}
            disabled={!publicUrl}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[color:var(--border-strong)] bg-transparent px-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)] disabled:opacity-50"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {publicUrl && profile.enabled ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[color:var(--border-strong)] bg-transparent px-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Handle. */}
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
          Handle
        </span>
        <span className="mt-1 flex items-center gap-1 border-b-[1.5px] border-[color:var(--border-strong)] pb-0.5 transition focus-within:border-[color:var(--ink)]">
          <span className="text-base text-[color:var(--ink-faint)] md:text-sm">@</span>
          <input
            type="text"
            value={handleDraft}
            onChange={(event) => {
              const next = event.target.value;
              setHandleDraft(next);
              setHandleStatus({ kind: "idle" });
            }}
            onBlur={() => void checkHandle(handleDraft)}
            placeholder="yourhandle"
            maxLength={PUBLIC_HANDLE_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 border-0 bg-transparent px-0 py-1 text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] md:text-sm"
          />
        </span>
        <HandleStatusLine status={handleStatus} />
      </label>

      {/* Public display name. */}
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
          Public display name
        </span>
        <input
          type="text"
          value={displayNameDraft}
          onChange={(event) => setDisplayNameDraft(event.target.value)}
          maxLength={PUBLIC_DISPLAY_NAME_MAX_LENGTH}
          placeholder="Shown above your bio"
          className="mt-1 w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-1.5 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--ink)] md:text-sm"
        />
        <p className="mt-1 text-[11px] leading-5 text-[color:var(--ink-faint)]">
          Separate from your account name on private shares.
        </p>
      </label>

      {/* Bio. */}
      <label className="block">
        <span className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            Bio
          </span>
          <span className="text-[10.5px] text-[color:var(--ink-faint)]">
            {bioDraft.length} / {PUBLIC_BIO_MAX_LENGTH}
          </span>
        </span>
        <textarea
          value={bioDraft}
          onChange={(event) =>
            setBioDraft(event.target.value.slice(0, PUBLIC_BIO_MAX_LENGTH))
          }
          rows={3}
          placeholder="A line or two about your archive."
          className="mt-1 w-full resize-none border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-base leading-6 text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--ink)] md:text-sm"
        />
      </label>

      {error ? (
        <p className="rounded-sm border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-sm text-[color:var(--error-text)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
        </Button>
        <p className="text-[11px] text-[color:var(--ink-faint)]">
          Choose which galleries to show on the gallery page itself.
        </p>
      </div>
    </form>
  );
}

function HandleStatusLine({ status }: { status: HandleStatus }) {
  if (status.kind === "idle") {
    return (
      <p className="mt-1 text-[11px] leading-5 text-[color:var(--ink-faint)]">
        Lowercase letters, numbers, underscores, hyphens. 3–30 characters.
      </p>
    );
  }
  if (status.kind === "checking") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] leading-5 text-[color:var(--ink-soft)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
      </p>
    );
  }
  if (status.kind === "ok") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] leading-5 text-[color:var(--ink-soft)]">
        <Check className="h-3 w-3 text-[color:var(--accent-strong)]" />
        @{status.handle} is available.
      </p>
    );
  }
  return (
    <p className="mt-1 text-[11px] leading-5 text-[color:var(--accent-strong)]">
      {status.message}
    </p>
  );
}
