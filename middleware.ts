import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getNextAuthenticatedRoute,
  readMembershipStateFromUser,
} from "@/lib/onboarding";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/galleries") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/checkout")
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
  let user: unknown = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user ?? null;
  } catch {
    user = null;
  }

  if (pathname === "/auth" && user) {
    const url = request.nextUrl.clone();
    url.pathname = getNextAuthenticatedRoute(
      readMembershipStateFromUser(user as { user_metadata?: Record<string, unknown> | null }),
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
    const membershipState = readMembershipStateFromUser(
      user as { user_metadata?: Record<string, unknown> | null },
    );
    const nextRoute = getNextAuthenticatedRoute(membershipState);

    if (pathname.startsWith("/galleries") && nextRoute !== "/galleries") {
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

    if (pathname.startsWith("/checkout")) {
      const requestedPlanId = request.nextUrl.searchParams.get("plan");
      if (!requestedPlanId && membershipState.onboardingComplete) {
        const url = request.nextUrl.clone();
        url.pathname = "/galleries";
        url.search = "";
        return NextResponse.redirect(url);
      }
      if (!requestedPlanId && !membershipState.selectedPlanId) {
        const url = request.nextUrl.clone();
        url.pathname = "/pricing";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  // Only run middleware for routes that should be auth-aware.
  // Keep marketing pages fully public.
  matcher: ["/", "/auth", "/pricing/:path*", "/galleries/:path*", "/checkout/:path*"],
};
