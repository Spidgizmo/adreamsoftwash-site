import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_PASSWORD_REQUIREMENTS,
  portalPasswordErrors,
} from "@/lib/bin-cleaning/password-policy";
import { authRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_RECOVERY_ACCESS_COOKIE = "ads-test-recovery-access";
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Password reset request must be valid JSON." },
      { status: 400, headers: HEADERS },
    );
  }

  const input = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const suppliedAccessToken = typeof input.accessToken === "string" ? input.accessToken.trim() : "";
  const simulatedAccessToken = ["test", "staging"].includes(process.env.NEXT_PUBLIC_APP_ENV?.trim() || "")
    ? request.cookies.get(TEST_RECOVERY_ACCESS_COOKIE)?.value || ""
    : "";
  const accessToken = suppliedAccessToken || simulatedAccessToken;
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "This password reset link is invalid or has expired." },
      { status: 401, headers: HEADERS },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "The two passwords do not match." },
      { status: 400, headers: HEADERS },
    );
  }

  const errors = portalPasswordErrors(password);
  if (errors.length) {
    return NextResponse.json(
      { ok: false, error: PORTAL_PASSWORD_REQUIREMENTS, errors },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const response = await authRequest("user", {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "This password reset link is invalid or has expired." },
        { status: 401, headers: HEADERS },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "The password could not be updated right now." },
      { status: 503, headers: HEADERS },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: HEADERS });
  if (simulatedAccessToken) response.cookies.delete(TEST_RECOVERY_ACCESS_COOKIE);
  return response;
}
