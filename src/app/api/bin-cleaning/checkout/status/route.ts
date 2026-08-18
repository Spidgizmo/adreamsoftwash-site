import { NextRequest, NextResponse } from "next/server";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

type CheckoutRow = {
  status: string;
  checkout_mode: "payment" | "subscription";
  plan_id: string;
  bin_count: number;
  first_charge_cents: number;
  signup_lead_id: string;
};
type LeadRow = { status: string; auth_user_id: string | null };
type CustomerActivationRow = {
  id: string;
  account_status: string;
  subscriptions: { payment_status: string; subscription_status: string }[];
};

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() || "";
  if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "A valid Stripe TEST Checkout Session is required." }, { status: 400, headers: HEADERS });
  }

  const rows = await serviceRoleDatabaseRequest<CheckoutRow[]>(
    `stripe_checkout_attempts?stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}&select=status,checkout_mode,plan_id,bin_count,first_charge_cents,signup_lead_id&limit=1`,
  ).catch(() => []);
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, error: "Checkout status is not available." }, { status: 404, headers: HEADERS });

  let paid = row.status === "paid";
  if (!paid && row.signup_lead_id) {
    const leads = await serviceRoleDatabaseRequest<LeadRow[]>(
      `signup_leads?id=eq.${encodeURIComponent(row.signup_lead_id)}&select=status,auth_user_id&limit=1`,
    ).catch(() => []);
    const lead = leads[0];
    if (lead?.status === "converted" && lead.auth_user_id) {
      const customers = await serviceRoleDatabaseRequest<CustomerActivationRow[]>(
        `customers?user_id=eq.${encodeURIComponent(lead.auth_user_id)}&select=id,account_status,subscriptions(payment_status,subscription_status)&limit=1`,
      ).catch(() => []);
      const customer = customers[0];
      paid = Boolean(
        customer
        && customer.account_status === "test_active"
        && customer.subscriptions.some((subscription) => subscription.payment_status === "test_paid"),
      );
      if (paid) {
        await serviceRoleDatabaseRequest(
          `stripe_checkout_attempts?stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: "paid", updated_at: new Date().toISOString() }),
            headers: { Prefer: "return=minimal" },
          },
        ).catch(() => null);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    status: paid ? "paid" : row.status,
    paid,
    planId: row.plan_id,
    binCount: row.bin_count,
    firstChargeCents: row.first_charge_cents,
    checkoutMode: row.checkout_mode,
  }, { headers: HEADERS });
}
