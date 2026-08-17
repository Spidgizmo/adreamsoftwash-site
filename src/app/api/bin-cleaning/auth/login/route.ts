import { NextRequest, NextResponse } from "next/server";
import { isValidPortalPassword } from "@/lib/bin-cleaning/password-policy";
import {
  authenticatedUserFromToken,
  authRequest,
  databaseRequest,
  destinationForRole,
  serviceRoleDatabaseRequest,
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
    !isValidPortalPassword(password)
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

  if (session) {
    return NextResponse.redirect(
      new URL(destinationForRole(session.role), request.url),
      303,
    );
  }

  // A customer creates their Supabase Auth identity before Stripe payment. That
  // identity deliberately has no active customer role yet, but it must still be
  // able to sign back in and finish an abandoned checkout. Keep the Auth session
  // and route only the matching submitted/unpaid signup to the recovery page.
  const authenticatedUser = await authenticatedUserFromToken(tokens.access_token);
  if (authenticatedUser) {
    const pending = await serviceRoleDatabaseRequest<{ id: string }[]>(
      `signup_leads?auth_user_id=eq.${encodeURIComponent(authenticatedUser.id)}&status=eq.submitted_unpaid&is_test=eq.true&select=id&order=submitted_at.desc&limit=1`,
    ).catch(() => []);
    if (pending.length > 0) {
      return NextResponse.redirect(
        new URL("/bin-cleaning/complete-payment", request.url),
        303,
      );
    }
  }

  return NextResponse.redirect(
    new URL("/bin-cleaning/login?error=session", request.url),
    303,
  );
}
