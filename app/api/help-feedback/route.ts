import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const HELP_INBOX = process.env.SUPPORT_EMAIL_TO ?? "cfl63@cornell.edu";
if (!process.env.SUPPORT_EMAIL_TO) {
  console.warn("Memora: SUPPORT_EMAIL_TO is not set — help feedback falling back to hardcoded address.");
}
const MAX_MESSAGE_LENGTH = 250;
const DEFAULT_FROM_EMAIL = "support@memoragallery.com";
const DEFAULT_FROM_NAME = "Memora Beta";

type HelpFeedbackPayload = {
  category?: string;
  message?: string;
  path?: string;
};

function isValidEmail(value: string | undefined | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

    const payload = (await request.json()) as HelpFeedbackPayload;
    const category = payload.category?.trim() || "";
    const message = payload.message?.trim() || "";
    const path = payload.path?.trim() || request.nextUrl.pathname;

    if (!category) {
      return NextResponse.json({ error: "Please choose an issue category." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Please include a message." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Help feedback is not configured yet. Set RESEND_API_KEY (and optionally SUPPORT_EMAIL_FROM).",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(resendApiKey);

    const timestamp = new Date().toISOString();
    const userEmail = user.email ?? "Unknown";
    const fromEmail = process.env.SUPPORT_EMAIL_FROM || DEFAULT_FROM_EMAIL;
    const from = `${DEFAULT_FROM_NAME} <${fromEmail}>`;
    const replyTo = isValidEmail(user.email) ? user.email : undefined;

    await resend.emails.send({
      from,
      to: HELP_INBOX,
      subject: `[Memora Beta] ${category}`,
      replyTo,
      text: [
        "New beta feedback report",
        "",
        `Category: ${category}`,
        `Message: ${message}`,
        `Path: ${path}`,
        `User email: ${userEmail}`,
        `User id: ${user.id}`,
        `Timestamp (UTC): ${timestamp}`,
        `User agent: ${request.headers.get("user-agent") ?? "Unknown"}`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send feedback right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
