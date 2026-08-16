import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_PASSWORD_REQUIREMENTS,
  portalPasswordErrors,
} from "@/lib/bin-cleaning/password-policy";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

type SignupLead = {
  id: string;
  status: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  edit_token_hash: string;
  auth_user_id: string | null;
  is_test: boolean;
};

type AuthUser = { id: string; email?: string };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function secureHashMatches(editToken: string, expectedHex: string) {
  const actualHex = createHash("sha256").update(editToken).digest("hex");
  if (actualHex.length !== expectedHex.length) return false;
  return timingSafeEqual(Buffer.from(actualHex), Buffer.from(expectedHex));
}

function authConfiguration() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!["test", "staging"].includes(appEnv || "") || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Portal account preparation is available only in configured staging.");
  }
  return { supabaseUrl, serviceRoleKey };
}

async function adminAuthRequest(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit,
) {
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Account request must be valid JSON." }, { status: 400, headers: HEADERS });
  }

  const input = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const leadId = text(input.leadId);
  const editToken = text(input.editToken);
  const password = typeof input.password === "string" ? input.password : "";
  const passwordErrors = portalPasswordErrors(password);

  if (!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) {
    return NextResponse.json({ ok: false, error: "Save the signup before creating the portal account." }, { status: 400, headers: HEADERS });
  }
  if (passwordErrors.length) {
    return NextResponse.json(
      { ok: false, error: PORTAL_PASSWORD_REQUIREMENTS, errors: passwordErrors },
      { status: 400, headers: HEADERS },
    );
  }

  let config: ReturnType<typeof authConfiguration>;
  try {
    config = authConfiguration();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Portal account preparation is unavailable." },
      { status: 503, headers: HEADERS },
    );
  }

  const leads = await serviceRoleDatabaseRequest<SignupLead[]>(
    `signup_leads?id=eq.${encodeURIComponent(leadId)}&select=id,status,email,full_name,phone,edit_token_hash,auth_user_id,is_test&limit=1`,
  ).catch(() => []);
  const lead = leads[0];
  if (!lead?.is_test || !secureHashMatches(editToken, lead.edit_token_hash)) {
    return NextResponse.json({ ok: false, error: "Signup identity could not be verified." }, { status: 403, headers: HEADERS });
  }
  if (lead.status === "submitted_unpaid" && !lead.auth_user_id) {
    return NextResponse.json({ ok: false, error: "This submitted signup cannot be assigned a new portal identity." }, { status: 409, headers: HEADERS });
  }
  if (!lead.email || !lead.email.toLowerCase().endsWith(".test")) {
    return NextResponse.json({ ok: false, error: "A valid staging email is required before creating the portal account." }, { status: 400, headers: HEADERS });
  }

  const userBody = JSON.stringify({
    email: lead.email,
    password,
    email_confirm: true,
    phone_confirm: false,
    user_metadata: {
      display_name: lead.full_name || lead.email,
      ads_signup_lead_id: lead.id,
      ads_environment: "test",
    },
  });

  let authUser: AuthUser | null = null;
  let newlyCreated = false;
  if (lead.auth_user_id) {
    const response = await adminAuthRequest(
      config.supabaseUrl,
      config.serviceRoleKey,
      `users/${encodeURIComponent(lead.auth_user_id)}`,
      { method: "PUT", body: userBody },
    );
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "The saved portal identity could not be updated." }, { status: 502, headers: HEADERS });
    }
    authUser = await response.json() as AuthUser;
  } else {
    const response = await adminAuthRequest(
      config.supabaseUrl,
      config.serviceRoleKey,
      "users",
      { method: "POST", body: userBody },
    );
    if (response.status === 422) {
      return NextResponse.json(
        { ok: false, error: "An account already exists for this email. Use a different test email for a new customer." },
        { status: 409, headers: HEADERS },
      );
    }
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: "The portal identity could not be created." }, { status: 502, headers: HEADERS });
    }
    authUser = await response.json() as AuthUser;
    newlyCreated = true;
  }

  if (!authUser?.id) {
    return NextResponse.json({ ok: false, error: "The portal identity was incomplete." }, { status: 502, headers: HEADERS });
  }

  try {
    await serviceRoleDatabaseRequest("user_profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: authUser.id,
        display_name: lead.full_name || lead.email,
        phone: lead.phone,
        login_status: "pending_payment",
        is_test: true,
      }),
    });

    if (!lead.auth_user_id) {
      await serviceRoleDatabaseRequest(`signup_leads?id=eq.${encodeURIComponent(lead.id)}&status=neq.submitted_unpaid`, {
        method: "PATCH",
        body: JSON.stringify({ auth_user_id: authUser.id, updated_at: new Date().toISOString() }),
      });
    }
  } catch {
    if (newlyCreated) {
      await adminAuthRequest(
        config.supabaseUrl,
        config.serviceRoleKey,
        `users/${encodeURIComponent(authUser.id)}`,
        { method: "DELETE" },
      ).catch(() => null);
    }
    return NextResponse.json({ ok: false, error: "The portal identity could not be linked to the signup." }, { status: 500, headers: HEADERS });
  }

  return NextResponse.json(
    {
      ok: true,
      accountPrepared: true,
      email: lead.email,
      message: "Portal sign-in is prepared and will activate only after verified payment.",
    },
    { headers: HEADERS },
  );
}
