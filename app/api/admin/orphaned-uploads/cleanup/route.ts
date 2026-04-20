import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "gallery-images";

type CleanupPayload = {
  paths?: string[];
};

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
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

    const payload = (await request.json()) as CleanupPayload;
    const paths = Array.from(new Set((payload.paths ?? []).map((entry) => entry.trim()).filter(Boolean))).filter(
      (path) => isLikelyStoragePath(path),
    );

    if (paths.length === 0) {
      return NextResponse.json({ deleted: 0 }, { status: 200 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage.from(STORAGE_BUCKET).remove(paths);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.info("Memora: admin deleted orphaned uploads", { adminEmail: user.email, deletedCount: paths.length });
    return NextResponse.json({ deleted: paths.length }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to clean orphaned uploads." },
      { status: 500 },
    );
  }
}
