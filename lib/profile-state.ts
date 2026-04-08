import type { PostgrestError } from "@supabase/supabase-js";
import { getMembershipPlan, type MembershipPlanId } from "@/lib/plans";

export type ProfileStateRow = {
  id: string;
  email?: string | null;
  selected_plan?: string | null;
  has_seen_welcome?: boolean | null;
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
    update: (
      values: Record<string, unknown>,
    ) => {
      eq: (column: string, value: string) => PromiseLike<{
        error: PostgrestError | null;
      }>;
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
};

function normalizePlanId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return getMembershipPlan(value as MembershipPlanId) ? (value as MembershipPlanId) : null;
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

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
  });

  if (!error) {
    return true;
  }

  console.error("Memora: failed to ensure profile row", {
    context,
    userId: user.id,
    error,
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
    } satisfies ResolvedProfileState;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, selected_plan, has_seen_welcome")
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
      selectedPlanId: null,
    } satisfies ResolvedProfileState;
  }

  return {
    exists: true,
    hasSeenWelcome: Boolean(data.has_seen_welcome),
    selectedPlanId: normalizePlanId(data.selected_plan),
  } satisfies ResolvedProfileState;
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

  const { error } = await supabase
    .from("profiles")
    .update({
      selected_plan: planId,
    })
    .eq("id", user.id);

  if (!error) {
    return { ok: true as const, error: null };
  }

  console.error("Memora: failed to update selected_plan", {
    context,
    userId: user.id,
    planId,
    error,
  });

  return { ok: false as const, error };
}
