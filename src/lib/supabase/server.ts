import { cookies } from "next/headers";
import { roleForIdentity } from "@/lib/bin-cleaning/access";
import type { AppRole } from "@/lib/bin-cleaning/domain";

const ACCESS_COOKIE = "ads-test-access";
const REFRESH_COOKIE = "ads-test-refresh";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

type SessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type SessionUser = { id: string; email: string; role: AppRole };
export type AuthenticatedUser = { id: string; email: string };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Test Supabase is not configured");
  return { url, key };
}

async function parseDatabaseResponse<T>(response: Response) {
  if (response.status === 204) return [] as T;
  const body = await response.text();
  if (!body.trim()) return [] as T;
  return JSON.parse(body) as T;
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  return fetch(`${url}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function databaseRequest<T>(
  path: string,
  init: RequestInit = {},
  suppliedToken?: string,
) {
  const { url, key } = config();
  const cookieStore = suppliedToken ? null : await cookies();
  const token = suppliedToken ?? cookieStore?.get(ACCESS_COOKIE)?.value;
  if (!token) throw new Error("Authentication required");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Database request failed (${response.status}): ${await response.text()}`,
    );
  }
  return parseDatabaseResponse<T>(response);
}

/**
 * Server-only administrative read/write boundary. Never import this module into
 * a client component and never return the service-role credential to a browser.
 */
export async function serviceRoleDatabaseRequest<T>(
  path: string,
  init: RequestInit = {},
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Server-only staging database configuration is unavailable");
  }
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Server database request failed (${response.status})`);
  }
  return parseDatabaseResponse<T>(response);
}

export async function authenticatedUserFromToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  try {
    const response = await authRequest("user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { id: string; email?: string };
    return { id: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}

async function profileRole(userId: string, token?: string): Promise<AppRole> {
  const profiles = await databaseRequest<{ login_status: string }[]>(
    `user_profiles?id=eq.${userId}&select=login_status`,
    {},
    token,
  );
  if (profiles[0]?.login_status !== "active") {
    throw new Error("Login is disabled");
  }

  const roles = await databaseRequest<{ role: AppRole }[]>(
    `staff_roles?user_id=eq.${userId}&revoked_at=is.null&select=role`,
    {},
    token,
  );
  const staffRole = roles[0]?.role;

  let hasCustomer = false;
  if (!staffRole) {
    const customers = await databaseRequest<{ id: string }[]>(
      `customers?user_id=eq.${userId}&select=id&limit=1`,
      {},
      token,
    );
    hasCustomer = customers.length > 0;
  }

  const role = roleForIdentity(staffRole, hasCustomer);
  if (!role) throw new Error("Application role is not assigned");
  return role;
}

export async function sessionFromToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const user = await authenticatedUserFromToken(token);
    if (!user) return null;
    return {
      ...user,
      role: await profileRole(user.id, token),
    };
  } catch {
    return null;
  }
}

async function rotateSession(refreshToken: string) {
  const response = await authRequest("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  const tokens = (await response.json()) as SessionTokens;
  await storeSession(tokens);
  return tokens;
}

export async function currentAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = await authenticatedUserFromToken(accessToken);
    if (user) return user;
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    const tokens = await rotateSession(refreshToken);
    return tokens ? authenticatedUserFromToken(tokens.access_token) : null;
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const session = await sessionFromToken(accessToken);
    if (session) return session;
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    const tokens = await rotateSession(refreshToken);
    return tokens ? sessionFromToken(tokens.access_token) : null;
  } catch {
    return null;
  }
}

export async function storeSession(value: SessionTokens) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: value.expires_in,
  };
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, value.access_token, options);
  cookieStore.set(REFRESH_COOKIE, value.refresh_token, {
    ...options,
    maxAge: REFRESH_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export function destinationForRole(role: AppRole) {
  return role === "customer"
    ? "/bin-cleaning/portal"
    : role === "field_technician"
      ? "/bin-cleaning/field/visits/assigned"
      : "/bin-cleaning/crm";
}
