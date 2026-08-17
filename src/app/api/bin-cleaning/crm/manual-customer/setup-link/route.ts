import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

type ManualLead = Readonly<{
  id: string;
  status: string;
  email: string | null;
  phone: string | null;
  form_data: Record<string, unknown> | null;
}>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) {
    return NextResponse.json({ ok: false, error: "Staff access required" }, { status: 403, headers: HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Setup-link request must be valid JSON." }, { status: 400, headers: HEADERS });
  }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const leadId = text(input.leadId);
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
    return NextResponse.json({ ok: false, error: "A valid manual signup lead is required." }, { status: 400, headers: HEADERS });
  }

  const rows = await serviceRoleDatabaseRequest<ManualLead[]>(
    `signup_leads?id=eq.${encodeURIComponent(leadId)}&select=id,status,email,phone,form_data&limit=1`,
  ).catch(() => []);
  const lead = rows[0];
  if (!lead || lead.form_data?.manual_intake !== true) {
    return NextResponse.json({ ok: false, error: "This is not a staff-created manual customer intake." }, { status: 404, headers: HEADERS });
  }
  if (lead.status !== "incomplete") {
    return NextResponse.json(
      { ok: false, error: "A new setup link can be issued only before the customer finishes account setup. Submitted and converted signup records remain locked." },
      { status: 409, headers: HEADERS },
    );
  }

  const editToken = randomBytes(32).toString("hex");
  const editTokenHash = createHash("sha256").update(editToken).digest("hex");
  const now = new Date().toISOString();
  const nextFormData = {
    ...(lead.form_data ?? {}),
    setup_link_reissued_at: now,
    setup_link_reissued_by_staff_user_id: session.id,
  };

  try {
    await serviceRoleDatabaseRequest(`signup_leads?id=eq.${encodeURIComponent(lead.id)}&status=eq.incomplete`, {
      method: "PATCH",
      body: JSON.stringify({
        edit_token_hash: editTokenHash,
        form_data: nextFormData,
        last_activity_at: now,
        updated_at: now,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "The secure setup link could not be reissued." }, { status: 500, headers: HEADERS });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  const fragment = new URLSearchParams({ lead: lead.id, token: editToken }).toString();
  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    setupUrl: `${origin}/bin-cleaning/setup#${fragment}`,
    email: lead.email,
    phone: lead.phone,
  }, { headers: HEADERS });
}
