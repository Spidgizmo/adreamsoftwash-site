import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_RECOVERY_COOKIE = "ads-test-recovery-token";

type GenerateLinkResponse = {
  hashed_token?: string;
  properties?: { hashed_token?: string };
};

function redirect(request: NextRequest, query: string) {
  return NextResponse.redirect(
    new URL(`/bin-cleaning/forgot-password?${query}`, request.url),
    303,
  );
}

function isHostedTest() {
  return ["test", "staging"].includes(process.env.NEXT_PUBLIC_APP_ENV?.trim() || "");
}

async function generateSimulatedRecoveryToken(email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "recovery", email }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const result = await response.json() as GenerateLinkResponse;
  return result.hashed_token || result.properties?.hashed_token || null;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const emailValue = form.get("email");

  if (typeof emailValue !== "string" || !/^\S+@\S+\.\S+$/.test(emailValue.trim())) {
    return redirect(request, "sent=1");
  }

  const email = emailValue.trim().toLowerCase();

  // Hosted staging uses fictional .test mailboxes. Generate the same one-time
  // recovery credential without attempting delivery, then keep it in an
  // HttpOnly cookie so testers can exercise the complete reset flow safely.
  if (isHostedTest() && email.endsWith(".test")) {
    const token = await generateSimulatedRecoveryToken(email).catch(() => null);
    const response = redirect(request, token ? "sent=1&simulated=1" : "sent=1");
    if (token) {
      response.cookies.set(TEST_RECOVERY_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/api/bin-cleaning/auth/open-simulated-recovery",
        maxAge: 10 * 60,
      });
    }
    return response;
  }

  const resetUrl = new URL("/bin-cleaning/reset-password", request.url).toString();

  try {
    const response = await authRequest(
      `recover?redirect_to=${encodeURIComponent(resetUrl)}`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );

    if (!response.ok) {
      return redirect(request, "error=send");
    }
  } catch {
    return redirect(request, "error=send");
  }

  return redirect(request, "sent=1");
}
