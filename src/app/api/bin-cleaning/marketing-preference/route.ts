import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Customer = { id: string };
type Preference = { customer_id: string };

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ ok: false, error: "Customer authentication is required." }, { status: 401 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (action !== "enable" && action !== "disable") {
    return NextResponse.json({ ok: false, error: "Marketing preference action is invalid." }, { status: 400 });
  }

  const customers = await serviceRoleDatabaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Customer account is not linked." }, { status: 409 });
  }

  const existing = await serviceRoleDatabaseRequest<Preference[]>(
    `customer_contact_preferences?customer_id=eq.${customer.id}&select=customer_id&limit=1`,
  ).catch(() => []);
  if (!existing[0]) {
    return NextResponse.json({ ok: false, error: "Customer communication preferences are missing." }, { status: 409 });
  }

  await serviceRoleDatabaseRequest(
    `customer_contact_preferences?customer_id=eq.${customer.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        marketing_allowed: action === "enable",
        marketing_consent_version: "ads-marketing-v1",
      }),
    },
  );

  return NextResponse.redirect(
    new URL(`/bin-cleaning/portal?marketing=${action === "enable" ? "on" : "off"}`, request.url),
    303,
  );
}
