import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/library/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/login",
    "/create-account",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/api/admin/:path*",
  ],
};
