import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Administrator authorization is required." }, { status: 403 });
  }

  const form = await request.formData();
  const id = safeId(form.get("id"));
  const kind = form.get("kind");
  const confirm = form.get("confirm");

  if (!id || (kind !== "customer" && kind !== "signup") || confirm !== "ERASE") {
    return NextResponse.json({ ok: false, error: "Permanent erase confirmation is invalid." }, { status: 400 });
  }

  const detailPath = kind === "customer"
    ? `/bin-cleaning/crm/customers/${id}`
    : `/bin-cleaning/crm/signups/${id}`;

  try {
    const rpc = kind === "customer"
      ? "rpc/admin_hard_delete_customer"
      : "rpc/admin_hard_delete_signup_lead";
    const body = kind === "customer"
      ? { p_customer_id: id, p_actor_id: session.id }
      : { p_signup_lead_id: id, p_actor_id: session.id };

    await serviceRoleDatabaseRequest(rpc, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.redirect(new URL(`${detailPath}?erase_error=1`, request.url), 303);
  }

  return NextResponse.redirect(
    new URL(`/bin-cleaning/crm?erased=${kind}`, request.url),
    303,
  );
}
