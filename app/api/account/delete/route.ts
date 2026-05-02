import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

const STORAGE_BUCKET = "gallery-images";

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: unknown | null;
};

async function listAllStorageObjectsUnderPrefix(
  prefix: string,
  admin = createSupabaseAdminClient(),
) {
  const files: string[] = [];
  const queue: string[] = [prefix];

  while (queue.length) {
    const folder = queue.shift()!;
    let offset = 0;

    for (;;) {
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        throw error;
      }

      const items = (data ?? []) as StorageListItem[];
      if (items.length === 0) break;

      for (const item of items) {
        const isFolder = item.id == null && item.metadata == null;
        const nextPath = folder ? `${folder}/${item.name}` : item.name;

        if (isFolder) {
          queue.push(nextPath);
        } else {
          files.push(nextPath);
        }
      }

      if (items.length < 1000) break;
      offset += items.length;
    }
  }

  return files;
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Cancel Stripe subscription FIRST so we never leave a deleted user
    // with an active billing relationship. Done before storage/auth
    // cleanup on purpose: if Stripe is unreachable we abort early and the
    // user's data is still intact for a retry.
    //
    // Free users (and Lifetime users — webhook stores null subscription_id
    // for lifetime payments) skip this step entirely.
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle<{ stripe_subscription_id: string | null }>();

    const subscriptionId = profile?.stripe_subscription_id ?? null;
    if (subscriptionId) {
      try {
        const stripe = getStripeClient();
        await stripe.subscriptions.cancel(subscriptionId);
        console.info("Memora: account deletion canceled Stripe subscription", {
          userId: user.id,
          subscriptionId,
        });
      } catch (stripeError) {
        // "Already canceled" or "not found" is fine — we just want the
        // sub gone. Anything else is a real failure: surface it so the
        // user can retry rather than silently leaving them subscribed.
        const code = (stripeError as { code?: string } | null)?.code;
        const status = (stripeError as { statusCode?: number } | null)?.statusCode;
        const isAlreadyGone = code === "resource_missing" || status === 404;
        if (isAlreadyGone) {
          console.info(
            "Memora: account deletion — subscription already gone, continuing",
            { userId: user.id, subscriptionId },
          );
        } else {
          console.error(
            "Memora: account deletion — failed to cancel Stripe subscription",
            { userId: user.id, subscriptionId, stripeError },
          );
          return NextResponse.json(
            {
              error:
                "We couldn't cancel your subscription right now. Please try again, or contact support if this keeps happening.",
            },
            { status: 502 },
          );
        }
      }
    }

    const storagePaths = await listAllStorageObjectsUnderPrefix(user.id, admin);

    console.info("Memora: account deletion started", {
      userId: user.id,
      storageFileCount: storagePaths.length,
      hadSubscription: !!subscriptionId,
    });

    if (storagePaths.length) {
      const { error: storageError } = await admin.storage.from(STORAGE_BUCKET).remove(storagePaths);
      if (storageError) {
        console.error("Memora: account deletion storage cleanup failed", storageError);
        return NextResponse.json(
          { error: "Unable to delete uploaded files right now." },
          { status: 500 },
        );
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error("Memora: account deletion auth delete failed", deleteUserError);
      return NextResponse.json(
        { error: "Unable to delete your account right now." },
        { status: 500 },
      );
    }

    console.info("Memora: account deletion completed", { userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Memora: account deletion failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account deletion could not be completed.",
      },
      { status: 500 },
    );
  }
}
