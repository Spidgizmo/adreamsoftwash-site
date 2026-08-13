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
};

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() || "";
  if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "A valid Stripe TEST Checkout Session is required." }, { status: 400, headers: HEADERS });
  }

  const rows = await serviceRoleDatabaseRequest<CheckoutRow[]>(
    `stripe_checkout_attempts?stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}&select=status,checkout_mode,plan_id,bin_count,first_charge_cents&limit=1`,
  ).catch(() => []);
  const row = rows[0];
  if (!row) return NextResponse.json({ ok: false, error: "Checkout status is not available." }, { status: 404, headers: HEADERS });

  return NextResponse.json({
    ok: true,
    status: row.status,
    paid: row.status === "paid",
    planId: row.plan_id,
    binCount: row.bin_count,
    firstChargeCents: row.first_charge_cents,
    checkoutMode: row.checkout_mode,
  }, { headers: HEADERS });
}
