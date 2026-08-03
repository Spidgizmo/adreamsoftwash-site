import { areaForPath, mayAccess } from "./lib/bin-cleaning/access.ts";
import { NextRequest, NextResponse } from "next/server.js";

const LOGIN = "/bin-cleaning/login";
const ACCESS_COOKIE = "ads-test-access";
const REFRESH_COOKIE = "ads-test-refresh";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;
const protectedPrefix = [
  "/bin-cleaning/portal",
  "/bin-cleaning/crm",
  "/bin-cleaning/field",
];

type SessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!protectedPrefix.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return redirectLogin(request);

  let token = request.cookies.get(ACCESS_COOKIE)?.value;
  let rotated: SessionTokens | null = null;
  let user = token ? await fetchUser(url, key, token) : null;

  if (!user) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return expired(request);

    const refresh = await fetch(
      `${url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      },
    ).catch(() => null);

    if (!refresh?.ok) return expired(request);
    rotated = (await refresh.json()) as SessionTokens;
    token = rotated.access_token;
    request.cookies.set(ACCESS_COOKIE, rotated.access_token);
    request.cookies.set(REFRESH_COOKIE, rotated.refresh_token);
    user = await fetchUser(url, key, token);
    if (!user) return expired(request);
  }

  const profile = await fetch(
    `${url}/rest/v1/user_profiles?id=eq.${user.id}&select=login_status`,
    {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!profile?.ok) return expired(request);
  const loginStatus = ((await profile.json()) as { login_status: string }[])[0]
    ?.login_status;
  if (loginStatus !== "active") return expired(request);

  const roles = await fetch(
    `${url}/rest/v1/staff_roles?user_id=eq.${user.id}&revoked_at=is.null&select=role`,
    {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!roles?.ok) return expired(request);

  const role = ((await roles.json()) as { role: string }[])[0]?.role ?? "customer";
  const area = areaForPath(path);
  const allowed = area ? mayAccess(role as never, area) : false;

  let response: NextResponse;
  if (!allowed) {
    const target =
      role === "customer"
        ? "/bin-cleaning/portal"
        : role === "field_technician"
          ? "/bin-cleaning/field/visits/assigned"
          : "/bin-cleaning/crm";
    response = NextResponse.redirect(
      new URL(`${target}?denied=1`, request.url),
    );
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (rotated) storeRotatedSession(response, rotated);
  return response;
}

async function fetchUser(url: string, key: string, token: string) {
  try {
    const auth = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return auth.ok ? ((await auth.json()) as { id: string }) : null;
  } catch {
    return null;
  }
}

function storeRotatedSession(response: NextResponse, tokens: SessionTokens) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    ...options,
    maxAge: tokens.expires_in,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
    ...options,
    maxAge: REFRESH_MAX_AGE,
  });
}

function redirectLogin(request: NextRequest) {
  const url = new URL(LOGIN, request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function expired(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(`${LOGIN}?expired=1`, request.url),
  );
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

export const config = {
  matcher: [
    "/bin-cleaning/portal/:path*",
    "/bin-cleaning/crm/:path*",
    "/bin-cleaning/field/:path*",
  ],
};
