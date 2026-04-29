import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  canCreate,
  getMembershipPlan,
  normalizePlanId,
  startOfCurrentMonthUtcIso,
} from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateSharePayload = {
  galleryIds?: string[];
  message?: string | null;
  /**
   * Display name of the recipient group(s) chosen at create time
   * (e.g. 'Family' or 'Family & Friends'). Rendered on the public
   * share landing page; not used for any access control.
   */
  recipientGroupName?: string | null;
  /**
   * Flat list of individual recipient names (e.g. ['Mom', 'Dad',
   * 'Gigi']). Rendered as the eyebrow above the share landing
   * title; same access-control caveat as above.
   */
  recipientMemberLabels?: string[];
};

const RECIPIENT_GROUP_NAME_MAX = 120;
const RECIPIENT_MEMBER_LABEL_MAX = 60;
const RECIPIENT_MEMBER_LABELS_MAX = 50;

function sanitizeRecipientGroupName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, RECIPIENT_GROUP_NAME_MAX);
}

function sanitizeRecipientMemberLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      typeof entry === "string"
        ? entry.trim().slice(0, RECIPIENT_MEMBER_LABEL_MAX)
        : "",
    )
    .filter(Boolean)
    .slice(0, RECIPIENT_MEMBER_LABELS_MAX);
}

function uniqueNonEmptyIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function generateToken() {
  return randomBytes(24).toString("base64url");
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

    const payload = (await request.json()) as CreateSharePayload;
    const galleryIds = uniqueNonEmptyIds(payload.galleryIds ?? []);
    const message = payload.message?.trim() || null;
    const recipientGroupName = sanitizeRecipientGroupName(
      payload.recipientGroupName,
    );
    const recipientMemberLabels = sanitizeRecipientMemberLabels(
      payload.recipientMemberLabels,
    );

    if (galleryIds.length === 0) {
      return NextResponse.json({ error: "Select at least one gallery to share." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("selected_plan")
      .eq("id", user.id)
      .maybeSingle<{ selected_plan: string | null }>();
    const plan = getMembershipPlan(normalizePlanId(profile?.selected_plan ?? null));
    if (!plan) {
      return NextResponse.json({ error: "No plan selected." }, { status: 500 });
    }

    // Plus enforces a monthly quota that resets the 1st of each calendar
    // month (UTC); every other plan caps total shares ever created so
    // revoking does not free up headroom.
    const sharePeriod = plan.shareLimitPeriod ?? "lifetime";
    let countQuery = supabase
      .from("shares")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", user.id);
    if (sharePeriod === "monthly") {
      countQuery = countQuery.gte("created_at", startOfCurrentMonthUtcIso());
    }
    const { count: shareUsageCount, error: shareUsageError } = await countQuery;
    if (shareUsageError) {
      return NextResponse.json({ error: shareUsageError.message }, { status: 500 });
    }
    const usage = shareUsageCount ?? 0;
    const shareCheck = canCreate("shares", usage, plan);
    if (!shareCheck.allowed && Number.isFinite(shareCheck.limit)) {
      return NextResponse.json(
        {
          error:
            sharePeriod === "monthly"
              ? "Monthly share-link limit reached for your current plan."
              : "Share limit reached for your current plan.",
          code: "PLAN_LIMIT_REACHED",
          resource: "shares",
          currentPlan: plan.id,
          limit: shareCheck.limit,
          currentUsage: usage,
          sharePeriod,
        },
        { status: 409 },
      );
    }

    const { data: ownedGalleries, error: ownedGalleriesError } = await supabase
      .from("galleries")
      .select("id")
      .eq("user_id", user.id)
      .in("id", galleryIds);

    if (ownedGalleriesError) {
      return NextResponse.json({ error: ownedGalleriesError.message }, { status: 500 });
    }

    if ((ownedGalleries ?? []).length !== galleryIds.length) {
      return NextResponse.json(
        { error: "You can only share galleries that belong to your account." },
        { status: 403 },
      );
    }

    let shareRow: { id: string; token: string } | null = null;
    let insertError: string | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const token = generateToken();
      const { data, error } = await supabase
        .from("shares")
        .insert({
          owner_user_id: user.id,
          token,
          message,
          recipient_group_name: recipientGroupName,
          recipient_member_labels: recipientMemberLabels,
        })
        .select("id, token")
        .single();

      if (!error) {
        shareRow = data;
        break;
      }

      insertError = error.message;
      if (!error.message.toLowerCase().includes("duplicate")) {
        break;
      }
    }

    if (!shareRow) {
      return NextResponse.json({ error: insertError ?? "Unable to create share link." }, { status: 500 });
    }

    const { error: relationsError } = await supabase.from("share_galleries").insert(
      galleryIds.map((galleryId) => ({
        share_id: shareRow!.id,
        gallery_id: galleryId,
      })),
    );

    if (relationsError) {
      return NextResponse.json({ error: relationsError.message }, { status: 500 });
    }

    const shareUrl = `${request.nextUrl.origin}/share/${shareRow.token}`;
    return NextResponse.json({ shareUrl, token: shareRow.token, shareId: shareRow.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create share link." },
      { status: 500 },
    );
  }
}

