import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPortalSlugFromHost } from "@/utils/portal";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function createPortalHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  requestHeaders.set("x-portal-slug", getPortalSlugFromHost(host));
  return requestHeaders;
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = createPortalHeaders(request);
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/library") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname === "/create-account";
  const isLoginRoute = pathname === "/login";

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
