import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripePost, stripeTestConfig } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CustomerRow = { id: string; stripe_customer_id: string | null; is_test: boolean };
type PortalSession = { id: string; url: string; livemode?: boolean };

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ ok: false, error: "Customer authentication is required." }, { status: 401 });
  }

  try {
    stripeTestConfig();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe TEST billing is unavailable." },
      { status: 503 },
    );
  }

  const rows = await serviceRoleDatabaseRequest<CustomerRow[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id,stripe_customer_id,is_test&limit=1`,
  ).catch(() => []);
  const customer = rows[0];
  if (!customer?.is_test || !customer.stripe_customer_id?.startsWith("cus_")) {
    return NextResponse.json({ ok: false, error: "No Stripe TEST billing profile is linked to this customer." }, { status: 409 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  try {
    const portal = await stripePost<PortalSession>("billing_portal/sessions", {
      customer: customer.stripe_customer_id,
      return_url: `${origin}/bin-cleaning/portal`,
    }, `ads-bin-portal-test:${customer.id}:${randomUUID()}`);
    if (!portal.url || portal.livemode) throw new Error("Stripe returned an unsafe billing portal session");
    return NextResponse.redirect(portal.url, 303);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe TEST billing portal could not be opened." },
      { status: 502 },
    );
  }
}
