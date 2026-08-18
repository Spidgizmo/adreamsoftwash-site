import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripePost, stripeTestConfig } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CustomerRow = { id: string; stripe_customer_id: string | null; is_test: boolean };
type SubscriptionRow = {
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean;
  ended_at: string | null;
};
type PortalSession = { id: string; url: string; livemode?: boolean };

type BillingAction = "manage" | "payment_method" | "cancel";

function billingAction(value: FormDataEntryValue | null): BillingAction | null {
  if (value === null || value === "") return "manage";
  if (value === "manage" || value === "payment_method" || value === "cancel") return value;
  return null;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ ok: false, error: "Customer authentication is required." }, { status: 401 });
  }

  let action: BillingAction | null = "manage";
  try {
    const form = await request.formData();
    action = billingAction(form.get("action"));
  } catch {
    action = "manage";
  }
  if (!action) {
    return NextResponse.json({ ok: false, error: "Billing action is invalid." }, { status: 400 });
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
  const portalValues: Record<string, unknown> = {
    customer: customer.stripe_customer_id,
    return_url: `${origin}/bin-cleaning/portal`,
  };

  if (action === "payment_method") {
    portalValues["flow_data[type]"] = "payment_method_update";
    portalValues["flow_data[after_completion][type]"] = "redirect";
    portalValues["flow_data[after_completion][redirect][return_url]"] = `${origin}/bin-cleaning/portal?billing=payment-updated`;
  }

  if (action === "cancel") {
    const subscriptions = await serviceRoleDatabaseRequest<SubscriptionRow[]>(
      `subscriptions?customer_id=eq.${encodeURIComponent(customer.id)}&ended_at=is.null&select=stripe_subscription_id,cancel_at_period_end,ended_at&order=started_at.desc.nullslast&limit=1`,
    ).catch(() => []);
    const subscription = subscriptions[0];
    if (!subscription?.stripe_subscription_id?.startsWith("sub_")) {
      return NextResponse.json({ ok: false, error: "No active recurring Stripe TEST subscription is linked to this customer." }, { status: 409 });
    }
    if (subscription.cancel_at_period_end) {
      return NextResponse.redirect(new URL("/bin-cleaning/portal?billing=cancel-already-scheduled", request.url), 303);
    }
    portalValues["flow_data[type]"] = "subscription_cancel";
    portalValues["flow_data[subscription_cancel][subscription]"] = subscription.stripe_subscription_id;
    portalValues["flow_data[after_completion][type]"] = "redirect";
    portalValues["flow_data[after_completion][redirect][return_url]"] = `${origin}/bin-cleaning/portal?billing=cancel-requested`;
  }

  try {
    const portal = await stripePost<PortalSession>(
      "billing_portal/sessions",
      portalValues,
      `ads-bin-portal-test:${customer.id}:${action}:${randomUUID()}`,
    );
    if (!portal.url || portal.livemode) throw new Error("Stripe returned an unsafe billing portal session");
    return NextResponse.redirect(portal.url, 303);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe TEST billing portal could not be opened." },
      { status: 502 },
    );
  }
}
