import type { PostgrestError } from "@supabase/supabase-js";
import { normalizePlanId, type MembershipPlanId } from "@/lib/plans";

export type ProfileStateRow = {
  id: string;
  email?: string | null;
  selected_plan?: string | null;
  has_seen_welcome?: boolean | null;
  display_name?: string | null;
} | null;

type ProfileQueryClient = {
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: ProfileStateRow;
          error: PostgrestError | null;
        }>;
      };
    };
    upsert: (
      values: Record<string, unknown>,
    ) => PromiseLike<{
      error: PostgrestError | null;
    }>;
    insert: (
      values: Record<string, unknown>,
    ) => PromiseLike<{
      error: PostgrestError | null;
    }>;
    update: (
      values: Record<string, unknown>,
    ) => {
      eq: (column: string, value: string) => PromiseLike<{
        error: PostgrestError | null;
      }> & {
        select: (columns: string) => {
          maybeSingle: () => PromiseLike<{
            data: ProfileStateRow;
            error: PostgrestError | null;
          }>;
        };
      };
    };
  };
};

export type ProfileIdentity = {
  id: string;
  email?: string | null;
};

export type ResolvedProfileState = {
  exists: boolean;
  hasSeenWelcome: boolean;
  selectedPlanId: MembershipPlanId | null;
  displayName: string | null;
};

export const DISPLAY_NAME_MAX_LENGTH = 40;

export function sanitizeDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

export async function ensureProfileRow(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  context: string,
) {
  if (!user?.id) {
    console.warn("Memora: skipped profile ensure because user id was missing", {
      context,
      user,
    });
    return false;
  }

  const updateAttempt = await supabase
    .from("profiles")
    .update({ email: user.email ?? null })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (!updateAttempt.error && updateAttempt.data?.id) {
    return true;
  }

  const insertAttempt = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
  });

  if (!insertAttempt.error) {
    return true;
  }

  console.error("Memora: failed to ensure profile row", {
    context,
    userId: user.id,
    table: "profiles",
    action: "update-then-insert",
    updateError: updateAttempt.error
      ? {
          message: updateAttempt.error.message,
          code: updateAttempt.error.code,
          details: updateAttempt.error.details,
          hint: updateAttempt.error.hint,
        }
      : null,
    insertError: {
      message: insertAttempt.error.message,
      code: insertAttempt.error.code,
      details: insertAttempt.error.details,
      hint: insertAttempt.error.hint,
    },
  });

  return false;
}

export async function loadProfileState(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  context: string,
) {
  if (!user?.id) {
    console.warn("Memora: skipped profile query because user id was missing", {
      context,
      user,
    });
    return {
      exists: false,
      hasSeenWelcome: false,
      selectedPlanId: null,
      displayName: null,
    } satisfies ResolvedProfileState;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, selected_plan, has_seen_welcome, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Memora: failed to load profile state", {
      context,
      userId: user.id,
      error,
    });
    throw error;
  }

  if (!data) {
    return {
      exists: false,
      hasSeenWelcome: false,
      selectedPlanId: "free",
      displayName: null,
    } satisfies ResolvedProfileState;
  }

  const normalizedPlan = normalizePlanId(data.selected_plan);
  if (!data.selected_plan || data.selected_plan !== normalizedPlan) {
    const { error: planWriteError } = await supabase
      .from("profiles")
      .update({ selected_plan: normalizedPlan })
      .eq("id", user.id);
    if (planWriteError) {
      console.error("Memora: failed to normalize selected_plan", {
        context,
        userId: user.id,
        selectedPlan: data.selected_plan,
        normalizedPlan,
        error: planWriteError,
      });
    }
  }

  return {
    exists: true,
    hasSeenWelcome: Boolean(data.has_seen_welcome),
    selectedPlanId: normalizedPlan,
    displayName: sanitizeDisplayName(data.display_name),
  } satisfies ResolvedProfileState;
}

export async function setDisplayName(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  displayName: string,
  context: string,
) {
  if (!user?.id) {
    const error = new Error("User id missing for display_name update.");
    console.error("Memora: failed to update display_name", {
      context,
      user,
      error,
    });
    return { ok: false as const, error };
  }

  const sanitized = sanitizeDisplayName(displayName);
  if (!sanitized) {
    const error = new Error("Please enter at least one non-blank character.");
    return { ok: false as const, error };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: sanitized,
      email: user.email ?? null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Memora: failed to update display_name", {
      context,
      userId: user.id,
      error,
    });
    return { ok: false as const, error };
  }

  return { ok: true as const, error: null, displayName: sanitized };
}

export async function setHasSeenWelcome(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  hasSeenWelcome: boolean,
  context: string,
) {
  if (!user?.id) {
    const error = new Error("User id missing for welcome update.");
    console.error("Memora: failed to update has_seen_welcome", {
      context,
      user,
      error,
    });
    return { ok: false as const, error };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      has_seen_welcome: hasSeenWelcome,
      email: user.email ?? null,
    })
    .eq("id", user.id);

  if (!error) {
    return { ok: true as const, error: null };
  }

  console.error("Memora: failed to update has_seen_welcome", {
    context,
    userId: user.id,
    hasSeenWelcome,
    error,
  });

  return { ok: false as const, error };
}

export async function setSelectedPlan(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  planId: MembershipPlanId,
  context: string,
) {
  if (!user?.id) {
    const error = new Error("User id missing for selected_plan update.");
    console.error("Memora: failed to update selected_plan", {
      context,
      user,
      planId,
      error,
    });
    return { ok: false as const, error };
  }

  console.info("Memora: selected_plan update attempt", {
    context,
    userId: user.id,
    planId,
  });

  const { data, error } = await supabase
    .from("profiles")
    .update({
      selected_plan: planId,
    })
    .eq("id", user.id)
    .select("id, selected_plan")
    .maybeSingle();

  if (error) {
    console.error("Memora: failed to update selected_plan", {
      context,
      userId: user.id,
      planId,
      error,
    });

    return { ok: false as const, error };
  }

  if (!data) {
    const missingRowError = new Error("Profile row not found for selected_plan update.");
    console.error("Memora: selected_plan update affected no profile row", {
      context,
      userId: user.id,
      planId,
      error: missingRowError,
    });
    return { ok: false as const, error: missingRowError };
  }

  console.info("Memora: selected_plan update success", {
    context,
    userId: user.id,
    planId,
  });

  return { ok: true as const, error: null };
}
