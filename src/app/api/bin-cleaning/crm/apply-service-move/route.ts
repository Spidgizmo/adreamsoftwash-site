import { NextRequest, NextResponse } from "next/server";
import {
  currentSession,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeId(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f-]{36}$/i.test(text) ? text : null;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) {
    return NextResponse.json({ ok: false, error: "Staff authorization is required." }, { status: 403 });
  }

  const form = await request.formData();
  const requestId = safeId(form.get("request_id"));
  const customerId = safeId(form.get("customer_id"));
  if (!requestId || !customerId) {
    return NextResponse.json({ ok: false, error: "Move request is invalid." }, { status: 400 });
  }

  try {
    await serviceRoleDatabaseRequest("rpc/apply_customer_service_move", {
      method: "POST",
      body: JSON.stringify({
        p_request_id: requestId,
        p_reviewer_id: session.id,
      }),
    });
  } catch {
    return NextResponse.redirect(
      new URL(`/bin-cleaning/crm/customers/${customerId}?move_error=1`, request.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(`/bin-cleaning/crm/customers/${customerId}?move_applied=1`, request.url),
    303,
  );
}
