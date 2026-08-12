import { NextRequest, NextResponse } from "next/server";
import {
  currentSession,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";

function safeId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const form = await request.formData();
  const requestId = safeId(String(form.get("request_id") ?? ""));
  if (!requestId) return NextResponse.json({ ok: false }, { status: 400 });

  const rows = await serviceRoleDatabaseRequest<{ id: string }[]>(
    `customer_bin_change_requests?id=eq.${requestId}&acknowledged_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: session.id,
      }),
    },
  );

  if (!rows.length) {
    return NextResponse.redirect(
      new URL("/bin-cleaning/crm?bin_change=already_acknowledged", request.url),
      303,
    );
  }

  return NextResponse.redirect(
    new URL("/bin-cleaning/crm?bin_change=acknowledged", request.url),
    303,
  );
}
