import { NextRequest, NextResponse } from "next/server";
import { authRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirect(request: NextRequest, query: string) {
  return NextResponse.redirect(
    new URL(`/bin-cleaning/forgot-password?${query}`, request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = form.get("email");

  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return redirect(request, "sent=1");
  }

  const resetUrl = new URL("/bin-cleaning/reset-password", request.url).toString();

  try {
    const response = await authRequest(
      `recover?redirect_to=${encodeURIComponent(resetUrl)}`,
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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
