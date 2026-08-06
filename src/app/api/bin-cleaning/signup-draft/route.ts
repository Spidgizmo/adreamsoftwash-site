import { NextRequest, NextResponse } from "next/server";
import { isStagingEnvironment } from "@/lib/app-environment";
import { validateSignupLeadRequest } from "@/lib/bin-cleaning/signup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  if (!isStagingEnvironment()) {
    return NextResponse.json(
      { ok: false, error: "Fictional signup is available only in staging." },
      { status: 404, headers: RESPONSE_HEADERS },
    );
  }

  const length = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Signup payload is too large." },
      { status: 413, headers: RESPONSE_HEADERS },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Signup payload must be valid JSON." },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const validation = validateSignupLeadRequest(input);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "The fictional signup needs correction.",
        errors: validation.errors,
      },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Staging database configuration is unavailable." },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  const { value } = validation;
  const databaseResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/save_fictional_signup_lead`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      cache: "no-store",
      body: JSON.stringify({
        p_payload: {
          ...value.payload,
          estimate: value.estimate,
        },
        p_lead_id: value.leadId,
        p_edit_token: value.editToken,
        p_status: value.status,
      }),
    },
  ).catch(() => null);

  if (!databaseResponse?.ok) {
    const databaseStatus = databaseResponse?.status ?? 503;
    const safeStatus = databaseStatus >= 400 && databaseStatus < 500 ? 400 : 503;
    return NextResponse.json(
      {
        ok: false,
        error:
          safeStatus === 400
            ? "The fictional signup could not be saved. Check its fields and edit token."
            : "The staging signup database is temporarily unavailable.",
      },
      { status: safeStatus, headers: RESPONSE_HEADERS },
    );
  }

  const lead = (await databaseResponse.json()) as {
    id: string;
    editToken: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };

  return NextResponse.json(
    {
      ok: true,
      lead,
      estimate: value.estimate,
      payment: {
        stripeMode: "disabled",
        checkoutStarted: false,
        amountCollectedCents: 0,
      },
    },
    { headers: RESPONSE_HEADERS },
  );
}
