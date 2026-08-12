import { NextRequest, NextResponse } from "next/server";
import {
  authRequest,
  databaseRequest,
  destinationForRole,
  sessionFromToken,
  storeSession,
} from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = form.get("email");
  const password = form.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 12
  ) {
    return NextResponse.redirect(new URL("/bin-cleaning/login?error=invalid", request.url), 303);
  }

  const response = await authRequest("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    return NextResponse.redirect(new URL("/bin-cleaning/login?error=credentials", request.url), 303);
  }

  const tokens = await response.json();
  await storeSession(tokens);
  const session = await sessionFromToken(tokens.access_token);

  if (session?.role === "customer") {
    await databaseRequest(
      "rpc/record_my_portal_activity",
      { method: "POST", body: JSON.stringify({ p_kind: "login" }) },
      tokens.access_token,
    ).catch(() => null);
  }

  return NextResponse.redirect(
    new URL(session ? destinationForRole(session.role) : "/bin-cleaning/login?error=session", request.url),
    303,
  );
}
