import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { createMembershipState, getNextAuthenticatedRoute } from "@/lib/onboarding";
import { loadProfileState } from "@/lib/profile-state";
import { getServerSiteOrigin } from "@/lib/site-url";

type ProfileQueryClient = Parameters<typeof loadProfileState>[0];

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/galleries")
  );
}

export async function middleware(request: NextRequest) {
  const siteOrigin = getServerSiteOrigin(request.nextUrl.origin);
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (request.nextUrl.origin !== siteOrigin) {
    const canonicalUrl = new URL(request.nextUrl.toString());
    const normalizedOrigin = new URL(siteOrigin);
    canonicalUrl.protocol = normalizedOrigin.protocol;
    canonicalUrl.host = normalizedOrigin.host;
    return NextResponse.redirect(canonicalUrl);
  }

  const pathname = request.nextUrl.pathname;
  if (pathname !== "/auth" && !isProtectedPath(pathname)) {
    // Public marketing routes should never depend on Supabase.
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh session if needed (reads/writes cookies).
  // Never block the page if Supabase cookies/session lookup fails.
  let user: User | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user ?? null;
  } catch {
    user = null;
  }

  if (pathname === "/auth" && user) {
    const profileState = await loadProfileState(
      supabase as unknown as ProfileQueryClient,
      {
        id: user.id,
        email: user.email ?? null,
      },
      "middleware:/auth",
    );
    const url = request.nextUrl.clone();
    url.pathname = getNextAuthenticatedRoute(
      {
        ...createMembershipState(profileState.selectedPlanId),
        welcomeStepCompleted: profileState.hasSeenWelcome,
      },
    );
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && pathname !== "/" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (user) {
    const profileState = await loadProfileState(
      supabase as unknown as ProfileQueryClient,
      {
        id: user.id,
        email: user.email ?? null,
      },
      `middleware:${pathname}`,
    );
    const membershipState = createMembershipState(profileState.selectedPlanId);
    const nextRoute = getNextAuthenticatedRoute({
      ...membershipState,
      welcomeStepCompleted: profileState.hasSeenWelcome,
    });

    if (pathname.startsWith("/galleries") && nextRoute !== "/galleries") {
      const url = request.nextUrl.clone();
      url.pathname = nextRoute;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/welcome") && nextRoute !== "/welcome") {
      const url = request.nextUrl.clone();
      url.pathname = nextRoute;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = nextRoute;
      url.search = "";
      return NextResponse.redirect(url);
    }

  }

  return response;
}

export const config = {
  // Only run middleware for routes that should be auth-aware.
  // Keep marketing pages fully public.
  matcher: ["/", "/auth", "/welcome/:path*", "/galleries/:path*"],
};
