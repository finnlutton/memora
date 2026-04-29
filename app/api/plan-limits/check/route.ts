import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCreate,
  getMembershipPlan,
  normalizePlanId,
  startOfCurrentMonthUtcIso,
  type PlanResource,
} from "@/lib/plans";

type CheckPayload = {
  resource?: PlanResource;
  galleryId?: string;
  subgalleryId?: string;
  desiredUsage?: number;
};

function isFiniteLimit(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const payload = (await request.json()) as CheckPayload;
    const resource = payload.resource;
    if (!resource) {
      return NextResponse.json({ error: "resource is required." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("selected_plan, is_internal_account")
      .eq("id", user.id)
      .maybeSingle<{
        selected_plan: string | null;
        is_internal_account: boolean | null;
      }>();

    // Internal/founder accounts bypass plan limits entirely. Return early
    // with a permissive response so callers proceed without further work.
    if (profile?.is_internal_account) {
      return NextResponse.json({
        ok: true,
        resource,
        currentPlan: "internal",
        limit: null,
        currentUsage: 0,
      });
    }

    const plan = getMembershipPlan(normalizePlanId(profile?.selected_plan ?? null));
    if (!plan) {
      return NextResponse.json({ error: "No plan configuration available." }, { status: 500 });
    }

    let currentUsage = payload.desiredUsage ?? 0;

    if (resource === "galleries") {
      const countRes = await supabase
        .from("galleries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (countRes.error) throw countRes.error;
      currentUsage = countRes.count ?? 0;
    } else if (resource === "subgalleries") {
      if (!payload.galleryId) {
        return NextResponse.json({ error: "galleryId is required for subgalleries." }, { status: 400 });
      }
      const countRes = await supabase
        .from("subgalleries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("gallery_id", payload.galleryId);
      if (countRes.error) throw countRes.error;
      currentUsage = countRes.count ?? 0;
    } else if (resource === "photos") {
      if (typeof payload.desiredUsage !== "number") {
        if (!payload.subgalleryId) {
          return NextResponse.json({ error: "subgalleryId is required for photos." }, { status: 400 });
        }
        const countRes = await supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("subgallery_id", payload.subgalleryId);
        if (countRes.error) throw countRes.error;
        currentUsage = countRes.count ?? 0;
      }
    } else if (resource === "directPhotos") {
      // Count photos uploaded directly to a gallery (subgallery_id IS NULL).
      // Caller passes desiredUsage = current local count + about-to-add
      // count, OR omits it to have us count from the DB.
      if (typeof payload.desiredUsage !== "number") {
        if (!payload.galleryId) {
          return NextResponse.json(
            { error: "galleryId is required for directPhotos." },
            { status: 400 },
          );
        }
        const countRes = await supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("gallery_id", payload.galleryId)
          .is("subgallery_id", null);
        if (countRes.error) throw countRes.error;
        currentUsage = countRes.count ?? 0;
      }
    } else if (resource === "shares") {
      // Plus enforces a monthly quota that resets the 1st of each
      // calendar month (UTC); every other plan caps total shares
      // ever created so revoking does not free up headroom.
      const period = plan.shareLimitPeriod ?? "lifetime";
      let query = supabase
        .from("shares")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user.id);
      if (period === "monthly") {
        query = query.gte("created_at", startOfCurrentMonthUtcIso());
      }
      const countRes = await query;
      if (countRes.error) throw countRes.error;
      currentUsage = countRes.count ?? 0;
    }

    const { allowed, limit } = canCreate(resource, currentUsage, plan);
    const sharePeriod =
      resource === "shares" ? plan.shareLimitPeriod ?? "lifetime" : undefined;
    if (!allowed && isFiniteLimit(limit)) {
      return NextResponse.json(
        {
          error: "Plan limit reached.",
          code: "PLAN_LIMIT_REACHED",
          resource,
          currentPlan: plan.id,
          limit,
          currentUsage,
          ...(sharePeriod ? { sharePeriod } : {}),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        allowed: true,
        resource,
        currentPlan: plan.id,
        limit,
        currentUsage,
        ...(sharePeriod ? { sharePeriod } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to check plan limits." },
      { status: 500 },
    );
  }
}
