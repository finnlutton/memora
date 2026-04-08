import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createMembershipState, getNextAuthenticatedRoute } from "@/lib/onboarding";
import { ensureProfileRow, loadProfileState } from "@/lib/profile-state";
import { getServerSiteOrigin } from "@/lib/site-url";

type ProfileQueryClient = Parameters<typeof loadProfileState>[0];

function safeInternalPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function applyInternalRedirect(url: URL, nextPath: string | null, fallbackPath: string) {
  const target = safeInternalPath(nextPath) ?? fallbackPath;
  const targetUrl = new URL(target, url.origin);
  url.protocol = targetUrl.protocol;
  url.host = targetUrl.host;
  url.pathname = targetUrl.pathname;
  url.search = targetUrl.search;
  url.hash = "";
}

function errorRedirect(request: NextRequest, message: string) {
  const url = new URL(request.nextUrl.toString());
  const origin = getServerSiteOrigin(request.nextUrl.origin);
  url.protocol = new URL(origin).protocol;
  url.host = new URL(origin).host;
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("mode", "signin");
  url.searchParams.set("error", "callback_failed");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestOrigin = getServerSiteOrigin(requestUrl.origin);
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

  await ensureProfileRow(
    supabase as unknown as ProfileQueryClient,
    {
      id: user.id,
      email: user.email ?? null,
    },
    "auth-callback:ensure-profile",
  );

  const profileState = await loadProfileState(
    supabase as unknown as ProfileQueryClient,
    {
      id: user.id,
      email: user.email ?? null,
    },
    "auth-callback",
  );
  const url = new URL(request.nextUrl.toString());
  const normalizedOrigin = new URL(requestOrigin);
  url.protocol = normalizedOrigin.protocol;
  url.host = normalizedOrigin.host;
  if (!profileState.hasSeenWelcome) {
    applyInternalRedirect(url, next, "/welcome");
    if (url.pathname !== "/welcome") {
      applyInternalRedirect(url, "/welcome", "/welcome");
    }
    return NextResponse.redirect(url);
  }

  const fallbackRoute = getNextAuthenticatedRoute({
    ...createMembershipState(profileState.selectedPlanId),
    welcomeStepCompleted: profileState.hasSeenWelcome,
  });
  applyInternalRedirect(url, next, fallbackRoute);
  return NextResponse.redirect(url);
}
