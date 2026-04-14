import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateSharePayload = {
  galleryIds?: string[];
  message?: string | null;
};

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

    if (galleryIds.length === 0) {
      return NextResponse.json({ error: "Select at least one gallery to share." }, { status: 400 });
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

