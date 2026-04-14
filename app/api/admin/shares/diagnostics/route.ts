import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DiagnosticsPayload = {
  email?: string;
};

type ShareRow = {
  id: string;
  owner_user_id: string;
  token: string;
  message: string | null;
  created_at: string;
  revoked_at: string | null;
};

async function resolveUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: profileMatch, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", normalizedEmail)
    .maybeSingle<{ id: string; email: string | null }>();
  if (profileError) throw profileError;
  if (profileMatch?.id) return { id: profileMatch.id, email: profileMatch.email ?? normalizedEmail };

  const { data: authList, error: authListError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authListError) throw authListError;
  const authMatch = authList.users.find((entry) => entry.email?.trim().toLowerCase() === normalizedEmail) ?? null;
  if (!authMatch) return null;
  return { id: authMatch.id, email: authMatch.email ?? normalizedEmail };
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
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as DiagnosticsPayload;
    const filterEmail = payload.email?.trim().toLowerCase() ?? "";
    const admin = createSupabaseAdminClient();

    let targetUserId: string | null = null;
    let targetUserEmail: string | null = null;

    if (filterEmail) {
      const resolved = await resolveUserIdByEmail(admin, filterEmail);
      if (!resolved) {
        return NextResponse.json(
          {
            foundUser: false,
            filterEmail,
            metrics: {
              totalShares: 0,
              activeShares: 0,
              revokedShares: 0,
              totalMappings: 0,
              averageGalleriesPerShare: 0,
            },
            recentShares: [],
          },
          { status: 200 },
        );
      }
      targetUserId = resolved.id;
      targetUserEmail = resolved.email;
    }

    const totalQuery = admin.from("shares").select("id", { count: "exact", head: true });
    const activeQuery = admin.from("shares").select("id", { count: "exact", head: true }).is("revoked_at", null);
    const revokedQuery = admin
      .from("shares")
      .select("id", { count: "exact", head: true })
      .not("revoked_at", "is", null);
    const scopedTotal = targetUserId ? totalQuery.eq("owner_user_id", targetUserId) : totalQuery;
    const scopedActive = targetUserId ? activeQuery.eq("owner_user_id", targetUserId) : activeQuery;
    const scopedRevoked = targetUserId ? revokedQuery.eq("owner_user_id", targetUserId) : revokedQuery;

    const scopedRecentBase = admin
      .from("shares")
      .select("id, owner_user_id, token, message, created_at, revoked_at")
      .order("created_at", { ascending: false })
      .limit(30);
    const scopedRecent = targetUserId
      ? scopedRecentBase.eq("owner_user_id", targetUserId).returns<ShareRow[]>()
      : scopedRecentBase.returns<ShareRow[]>();

    const [totalRes, activeRes, revokedRes, recentRes] = await Promise.all([
      scopedTotal,
      scopedActive,
      scopedRevoked,
      scopedRecent,
    ]);

    if (totalRes.error) throw totalRes.error;
    if (activeRes.error) throw activeRes.error;
    if (revokedRes.error) throw revokedRes.error;
    if (recentRes.error) throw recentRes.error;

    const recentShares = recentRes.data ?? [];
    const shareIds = recentShares.map((entry) => entry.id);
    const ownerIds = Array.from(new Set(recentShares.map((entry) => entry.owner_user_id)));

    const mappingsRes = shareIds.length
      ? await admin
          .from("share_galleries")
          .select("share_id")
          .in("share_id", shareIds)
          .returns<Array<{ share_id: string }>>()
      : { data: [] as Array<{ share_id: string }>, error: null };
    if (mappingsRes.error) throw mappingsRes.error;

    const galleryCountByShare = new Map<string, number>();
    (mappingsRes.data ?? []).forEach((entry) => {
      galleryCountByShare.set(entry.share_id, (galleryCountByShare.get(entry.share_id) ?? 0) + 1);
    });

    let totalMappings = 0;
    if (targetUserId) {
      const allShareIdsRes = await admin
        .from("shares")
        .select("id")
        .eq("owner_user_id", targetUserId)
        .returns<Array<{ id: string }>>();
      if (allShareIdsRes.error) throw allShareIdsRes.error;
      const allShareIds = (allShareIdsRes.data ?? []).map((entry) => entry.id);
      if (allShareIds.length) {
        const mappingCountRes = await admin
          .from("share_galleries")
          .select("id", { count: "exact", head: true })
          .in("share_id", allShareIds);
        if (mappingCountRes.error) throw mappingCountRes.error;
        totalMappings = mappingCountRes.count ?? 0;
      }
    } else {
      const mappingCountRes = await admin.from("share_galleries").select("id", { count: "exact", head: true });
      if (mappingCountRes.error) throw mappingCountRes.error;
      totalMappings = mappingCountRes.count ?? 0;
    }

    const ownerEmailMap = new Map<string, string>();
    if (ownerIds.length) {
      const profileOwnersRes = await admin
        .from("profiles")
        .select("id, email")
        .in("id", ownerIds)
        .returns<Array<{ id: string; email: string | null }>>();
      if (profileOwnersRes.error) throw profileOwnersRes.error;
      (profileOwnersRes.data ?? []).forEach((entry) => {
        if (entry.email) ownerEmailMap.set(entry.id, entry.email);
      });
    }

    const totalShares = totalRes.count ?? 0;
    const averageGalleriesPerShare = totalShares > 0 ? Number((totalMappings / totalShares).toFixed(2)) : 0;

    return NextResponse.json(
      {
        foundUser: targetUserId ? true : undefined,
        filterEmail: filterEmail || undefined,
        filterUserEmail: targetUserEmail || undefined,
        metrics: {
          totalShares,
          activeShares: activeRes.count ?? 0,
          revokedShares: revokedRes.count ?? 0,
          totalMappings,
          averageGalleriesPerShare,
        },
        recentShares: recentShares.map((entry) => ({
          id: entry.id,
          createdAt: entry.created_at,
          status: entry.revoked_at ? "revoked" : "active",
          messagePreview: entry.message ? entry.message.slice(0, 80) : "",
          ownerEmail: ownerEmailMap.get(entry.owner_user_id) ?? "Unknown",
          galleryCount: galleryCountByShare.get(entry.id) ?? 0,
          tokenPreview:
            entry.token.length > 10
              ? `${entry.token.slice(0, 6)}...${entry.token.slice(-4)}`
              : entry.token,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load share diagnostics." },
      { status: 500 },
    );
  }
}
