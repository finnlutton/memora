import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LookupPayload = {
  email?: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  selected_plan: string | null;
  created_at: string | null;
};

type GalleryRow = {
  title: string;
  created_at: string;
  updated_at: string;
};

type ShareRow = {
  revoked_at: string | null;
  created_at: string;
};

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

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as LookupPayload;
    const normalizedEmail = payload.email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    let profile: ProfileRow | null = null;
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("id, email, selected_plan, created_at")
      .ilike("email", normalizedEmail)
      .maybeSingle<ProfileRow>();
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    profile = profileData ?? null;

    let userId = profile?.id ?? null;
    let userCreatedAt = profile?.created_at ?? null;
    let resolvedEmail = profile?.email ?? normalizedEmail;

    if (!userId) {
      const { data: authList, error: authListError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authListError) {
        return NextResponse.json({ error: authListError.message }, { status: 500 });
      }
      const authMatch =
        authList.users.find((entry) => entry.email?.trim().toLowerCase() === normalizedEmail) ?? null;
      if (!authMatch) {
        return NextResponse.json({ found: false }, { status: 200 });
      }
      userId = authMatch.id;
      userCreatedAt = authMatch.created_at ?? null;
      resolvedEmail = authMatch.email ?? normalizedEmail;
    }

    const [galleriesRes, recentGalleriesRes, subgalleriesRes, photosRes, sharesRes] = await Promise.all([
      admin.from("galleries").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin
        .from("galleries")
        .select("title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3)
        .returns<GalleryRow[]>(),
      admin.from("subgalleries").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin.from("photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
      admin
        .from("shares")
        .select("revoked_at, created_at")
        .eq("owner_user_id", userId)
        .order("created_at", { ascending: false })
        .returns<ShareRow[]>(),
    ]);

    if (galleriesRes.error) return NextResponse.json({ error: galleriesRes.error.message }, { status: 500 });
    if (recentGalleriesRes.error) return NextResponse.json({ error: recentGalleriesRes.error.message }, { status: 500 });
    if (subgalleriesRes.error) return NextResponse.json({ error: subgalleriesRes.error.message }, { status: 500 });
    if (photosRes.error) return NextResponse.json({ error: photosRes.error.message }, { status: 500 });
    if (sharesRes.error) return NextResponse.json({ error: sharesRes.error.message }, { status: 500 });

    const shares = sharesRes.data ?? [];
    const activeShares = shares.filter((entry) => !entry.revoked_at).length;
    const revokedShares = shares.filter((entry) => Boolean(entry.revoked_at)).length;
    const latestShareCreatedAt = shares[0]?.created_at ?? null;

    const recentGalleries = recentGalleriesRes.data ?? [];
    const latestGallery = recentGalleries[0] ?? null;

    return NextResponse.json(
      {
        found: true,
        user: {
          id: userId,
          email: resolvedEmail,
          createdAt: userCreatedAt,
          selectedPlan: profile?.selected_plan ?? null,
        },
        archive: {
          galleries: galleriesRes.count ?? 0,
          subgalleries: subgalleriesRes.count ?? 0,
          photos: photosRes.count ?? 0,
        },
        sharing: {
          totalShares: shares.length,
          activeShares,
          revokedShares,
          latestShareCreatedAt,
        },
        recentActivity: {
          latestGalleryUpdatedAt: latestGallery?.updated_at ?? null,
          latestGalleryTitle: latestGallery?.title ?? null,
        },
        recentGalleries: recentGalleries.map((entry) => ({
          title: entry.title,
          updatedAt: entry.updated_at,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to lookup user." },
      { status: 500 },
    );
  }
}
