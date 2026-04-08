import type { PostgrestError } from "@supabase/supabase-js";

export type ProfileStateRow = {
  id: string;
  email?: string | null;
  membership_tier?: string | null;
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

function isMissingHasSeenWelcomeColumnError(error: PostgrestError | null | undefined) {
  if (!error) {
    return false;
  }

  const detail = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return detail.includes("has_seen_welcome");
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

  if (isMissingHasSeenWelcomeColumnError(error)) {
    const { error: fallbackError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
    });

    if (!fallbackError) {
      return true;
    }

    console.error("Memora: failed to ensure profile row without has_seen_welcome", {
      context,
      userId: user.id,
      error: fallbackError,
    });
  }

  return false;
}

export async function loadHasSeenWelcomeFromProfile(
  supabase: ProfileQueryClient,
  user: ProfileIdentity | null | undefined,
  context: string,
) {
  if (!user?.id) {
    console.warn("Memora: skipped welcome query because user id was missing", {
      context,
      user,
    });
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, membership_tier, has_seen_welcome")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Memora: failed to load onboarding profile state", {
      context,
      userId: user.id,
      error,
    });
    return false;
  }

  if (!data) {
    return false;
  }

  return Boolean(data.has_seen_welcome);
}

export async function upsertProfileState(
  supabase: ProfileQueryClient,
  values: Record<string, unknown>,
  context: string,
) {
  const { error } = await supabase.from("profiles").upsert(values);

  if (!error) {
    return { ok: true as const, error: null };
  }

  console.error("Memora: failed to write profile state", {
    context,
    values,
    error,
  });

  if (isMissingHasSeenWelcomeColumnError(error) && "has_seen_welcome" in values) {
    const { has_seen_welcome, ...fallbackValues } = values;
    void has_seen_welcome;
    const { error: fallbackError } = await supabase.from("profiles").upsert(fallbackValues);

    if (!fallbackError) {
      return { ok: true as const, error: null };
    }

    console.error("Memora: failed profile write without has_seen_welcome", {
      context,
      values: fallbackValues,
      error: fallbackError,
    });
    return { ok: false as const, error: fallbackError };
  }

  return { ok: false as const, error };
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
