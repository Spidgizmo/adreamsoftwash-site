import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_RECOVERY_COOKIE = "ads-test-recovery-token";
const TEST_RECOVERY_ACCESS_COOKIE = "ads-test-recovery-access";

type RecoverySession = {
  access_token?: string;
  expires_in?: number;
};

function recoveryError(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/bin-cleaning/forgot-password?error=expired", request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  if (!["test", "staging"].includes(process.env.NEXT_PUBLIC_APP_ENV?.trim() || "")) {
    return new NextResponse(null, { status: 404 });
  }

  const token = request.cookies.get(TEST_RECOVERY_COOKIE)?.value;
  if (!token) return recoveryError(request);

  let response: Response;
  try {
    response = await authRequest("verify", {
      method: "POST",
      body: JSON.stringify({ type: "recovery", token_hash: token }),
    });
  } catch {
    return recoveryError(request);
  }
  if (!response.ok) return recoveryError(request);

  const session = await response.json() as RecoverySession;
  if (!session.access_token) return recoveryError(request);

  const redirect = NextResponse.redirect(
    new URL("/bin-cleaning/reset-password?simulated=1", request.url),
    303,
  );
  redirect.cookies.delete(TEST_RECOVERY_COOKIE);
  redirect.cookies.set(TEST_RECOVERY_ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/api/bin-cleaning/auth/reset-password",
    maxAge: Math.min(session.expires_in || 600, 10 * 60),
  });
  return redirect;
}
