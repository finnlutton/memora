import type { PostgrestError } from "@supabase/supabase-js";

type WelcomeStepRow = {
  welcome_step_completed?: boolean | null;
} | null;

type ProfileQueryClient = {
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: WelcomeStepRow;
          error: PostgrestError | null;
        }>;
      };
    };
    upsert: (
      values: Record<string, unknown>,
    ) => PromiseLike<{
      error: PostgrestError | null;
    }>;
  };
};

export function isMissingWelcomeStepCompletedColumnError(error: PostgrestError | null | undefined) {
  if (!error) {
    return false;
  }

  const detail = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return detail.includes("welcome_step_completed");
}

export async function loadWelcomeStepCompletedFromProfile(
  supabase: ProfileQueryClient,
  userId: string | null | undefined,
  context: string,
) {
  if (!userId) {
    console.warn("Memora: skipped welcome step query because user id was missing", {
      context,
      userId,
    });
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("welcome_step_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Memora: failed to load welcome step state", {
      context,
      userId,
      error,
    });

    // If the migration has not been applied yet, avoid breaking pricing/login.
    // This keeps the app usable while still exposing the exact schema issue.
    if (isMissingWelcomeStepCompletedColumnError(error)) {
      return true;
    }

    return true;
  }

  return data ? Boolean(data.welcome_step_completed) : true;
}

export async function upsertProfileState(
  supabase: ProfileQueryClient,
  values: Record<string, unknown>,
  context: string,
) {
  const { error } = await supabase.from("profiles").upsert(values);

  if (!error) {
    return;
  }

  console.error("Memora: failed to upsert profile state", {
    context,
    values,
    error,
  });

  if (isMissingWelcomeStepCompletedColumnError(error) && "welcome_step_completed" in values) {
    const { welcome_step_completed, ...fallbackValues } = values;
    void welcome_step_completed;
    const { error: fallbackError } = await supabase.from("profiles").upsert(fallbackValues);

    if (!fallbackError) {
      return;
    }

    console.error("Memora: failed to upsert profile state without welcome step field", {
      context,
      values: fallbackValues,
      error: fallbackError,
    });
    throw fallbackError;
  }

  throw error;
}
