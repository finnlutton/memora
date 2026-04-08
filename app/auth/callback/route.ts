import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNextAuthenticatedRoute, readMembershipStateFromUser } from "@/lib/onboarding";
import { loadWelcomeStepCompletedFromProfile } from "@/lib/profile-state";

type ProfileQueryClient = Parameters<typeof loadWelcomeStepCompletedFromProfile>[0];

function safeInternalPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function applyInternalRedirect(url: URL, nextPath: string | null, fallbackPath: string) {
  const target = safeInternalPath(nextPath) ?? fallbackPath;
  const targetUrl = new URL(target, url.origin);
  url.pathname = targetUrl.pathname;
  url.search = targetUrl.search;
  url.hash = "";
}

function errorRedirect(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("mode", "signin");
  url.searchParams.set("error", "callback_failed");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeInternalPath(
    requestUrl.searchParams.get("next") ?? requestUrl.searchParams.get("redirect"),
  );
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return errorRedirect(request, error.message);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return errorRedirect(request, error.message);
    }
  } else {
    return errorRedirect(request, "The confirmation link is incomplete or has expired.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorRedirect(
      request,
      userError?.message ?? "We couldn't finish signing you in after confirmation.",
    );
  }

  const welcomeStepCompleted = await loadWelcomeStepCompletedFromProfile(
    supabase as unknown as ProfileQueryClient,
    user.id,
    "auth-callback",
  );
  const url = request.nextUrl.clone();
  if (!welcomeStepCompleted) {
    applyInternalRedirect(url, next, "/welcome");
    if (url.pathname !== "/welcome") {
      applyInternalRedirect(url, "/welcome", "/welcome");
    }
    return NextResponse.redirect(url);
  }

  const fallbackRoute = getNextAuthenticatedRoute({
    ...readMembershipStateFromUser(user),
    welcomeStepCompleted,
  });
  applyInternalRedirect(url, next, fallbackRoute);
  return NextResponse.redirect(url);
}
