import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RevokeUserPayload = {
  email?: string;
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

    const payload = (await request.json()) as RevokeUserPayload;
    const targetEmail = payload.email?.trim().toLowerCase() ?? "";
    if (!targetEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const resolved = await resolveUserIdByEmail(admin, targetEmail);
    if (!resolved) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const revokedAt = new Date().toISOString();
    const { data, error } = await admin
      .from("shares")
      .update({ revoked_at: revokedAt })
      .eq("owner_user_id", resolved.id)
      .is("revoked_at", null)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        revokedCount: (data ?? []).length,
        userEmail: resolved.email,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to revoke shares for user." },
      { status: 500 },
    );
  }
}
