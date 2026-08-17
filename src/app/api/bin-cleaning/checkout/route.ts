import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_BIN_CLEANING_PLANS,
  calculateBinCleaningPrice,
  evaluateBinCleaningPromotion,
} from "@/lib/bin-cleaning-plans";
import {
  currentAuthenticatedUser,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";
import {
  ensureStripeTestCouponForDiscount,
  stripeDeleteTestCustomer,
  stripeGet,
  stripePost,
  stripeTestConfig,
} from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

type PreparedLead = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  planId: string;
  binCount: number;
  promoCode: string | null;
  referralCode: string | null;
  addressFingerprint: string;
};

type StripeCustomer = { id: string };
type StripeSession = { id: string; url: string | null; livemode: boolean };
type StripeSessionLookup = StripeSession & {
  status: "open" | "complete" | "expired" | null;
  payment_status: "paid" | "unpaid" | "no_payment_required" | null;
};
type FailedCheckout = { stripe_customer_id: string | null };
type PendingSignup = { id: string };
type OpenCheckoutAttempt = {
  id: string;
  stripe_checkout_session_id: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function recoverPendingSignupCheckout() {
  const authenticatedUser = await currentAuthenticatedUser();
  if (!authenticatedUser) {
    return { error: "Sign in with the customer account before resuming payment.", status: 401 } as const;
  }

  const pending = await serviceRoleDatabaseRequest<PendingSignup[]>(
    `signup_leads?auth_user_id=eq.${encodeURIComponent(authenticatedUser.id)}&status=eq.submitted_unpaid&is_test=eq.true&select=id&order=submitted_at.desc&limit=1`,
  ).catch(() => []);
  const lead = pending[0];
  if (!lead) {
    return { error: "No submitted unpaid signup is available for this customer account.", status: 409 } as const;
  }

  // Reuse the most recent still-open Stripe TEST Checkout Session when possible.
  // This prevents one abandoned signup from accumulating multiple simultaneously
  // payable sessions and multiple Stripe customers.
  const attempts = await serviceRoleDatabaseRequest<OpenCheckoutAttempt[]>(
    `stripe_checkout_attempts?signup_lead_id=eq.${encodeURIComponent(lead.id)}&status=eq.open&livemode=eq.false&stripe_checkout_session_id=not.is.null&select=id,stripe_checkout_session_id&order=created_at.desc&limit=1`,
  ).catch(() => []);
  const attempt = attempts[0];
  if (attempt?.stripe_checkout_session_id?.startsWith("cs_test_")) {
    try {
      const session = await stripeGet<StripeSessionLookup>(
        `checkout/sessions/${encodeURIComponent(attempt.stripe_checkout_session_id)}`,
      );
      if (!session.livemode && session.status === "open" && session.payment_status === "unpaid" && session.url) {
        return { checkoutUrl: session.url, checkoutSessionId: session.id } as const;
      }
      if (!session.livemode && session.status === "complete" && session.payment_status !== "unpaid") {
        return { error: "Stripe received the payment. ADS is waiting for verified webhook activation before opening the portal.", status: 409 } as const;
      }
    } catch {
      // If the old TEST session can no longer be retrieved, rotate the signup
      // edit credential below and safely create a replacement checkout session.
    }
  }

  const editToken = randomBytes(32).toString("base64url");
  const editTokenHash = createHash("sha256").update(editToken).digest("hex");
  const updated = await serviceRoleDatabaseRequest<{ id: string }[]>(
    `signup_leads?id=eq.${encodeURIComponent(lead.id)}&auth_user_id=eq.${encodeURIComponent(authenticatedUser.id)}&status=eq.submitted_unpaid&is_test=eq.true`,
    {
      method: "PATCH",
      body: JSON.stringify({ edit_token_hash: editTokenHash, updated_at: new Date().toISOString() }),
    },
  ).catch(() => []);
  if (!updated[0]?.id) {
    return { error: "The pending signup changed while payment recovery was starting. Sign in again and retry.", status: 409 } as const;
  }

  return { leadId: lead.id, editToken } as const;
}

export async function POST(request: NextRequest) {
  try {
    stripeTestConfig();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe test checkout is unavailable." },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Checkout request must be valid JSON." }, { status: 400, headers: RESPONSE_HEADERS });
  }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  let leadId = asText(input.leadId);
  let editToken = asText(input.editToken);

  if ((!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) && input.resumePendingPayment === true) {
    const recovery = await recoverPendingSignupCheckout();
    if ("error" in recovery) {
      return NextResponse.json(
        { ok: false, error: recovery.error },
        { status: recovery.status, headers: RESPONSE_HEADERS },
      );
    }
    if ("checkoutUrl" in recovery) {
      return NextResponse.json(
        { ok: true, checkoutUrl: recovery.checkoutUrl, checkoutSessionId: recovery.checkoutSessionId, resumed: true },
        { headers: RESPONSE_HEADERS },
      );
    }
    leadId = recovery.leadId;
    editToken = recovery.editToken;
  }

  if (!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) {
    return NextResponse.json({ ok: false, error: "A valid submitted signup is required before checkout." }, { status: 400, headers: RESPONSE_HEADERS });
  }

  let lead: PreparedLead;
  try {
    lead = await serviceRoleDatabaseRequest<PreparedLead>("rpc/prepare_stripe_test_checkout", {
      method: "POST",
      body: JSON.stringify({ p_lead_id: leadId, p_edit_token: editToken }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "This signup is not eligible to start checkout." }, { status: 400, headers: RESPONSE_HEADERS });
  }

  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === lead.planId && item.status === "active" && item.checkoutEnabled);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "The selected service plan is not available for checkout." }, { status: 400, headers: RESPONSE_HEADERS });
  }
  const price = calculateBinCleaningPrice(plan, lead.binCount);
  if (!price) {
    return NextResponse.json({ ok: false, error: "The selected plan does not have checkout pricing." }, { status: 400, headers: RESPONSE_HEADERS });
  }

  let discountKind: "none" | "promotion" | "referral" = "none";
  let discountCents = 0;
  if (lead.promoCode) {
    const promotion = evaluateBinCleaningPromotion(lead.promoCode, plan, price.subtotalCents, lead.binCount);
    if (promotion.status !== "applied") {
      return NextResponse.json({ ok: false, error: "The promotion is not eligible for this plan and bin count." }, { status: 400, headers: RESPONSE_HEADERS });
    }
    discountKind = "promotion";
    discountCents = promotion.discountCents;
  } else if (lead.referralCode) {
    if (!plan.referralEligible) {
      return NextResponse.json({ ok: false, error: "Referral discounts require an eligible Monthly plan." }, { status: 400, headers: RESPONSE_HEADERS });
    }
    discountKind = "referral";
    discountCents = Math.round(price.subtotalCents * 0.5);
  }

  const firstChargeCents = price.subtotalCents - discountCents;
  let coupon: string | null = null;
  if (discountCents > 0) {
    try {
      coupon = await ensureStripeTestCouponForDiscount(discountKind, lead.promoCode);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "The Stripe TEST discount could not be prepared.",
        },
        { status: 502, headers: RESPONSE_HEADERS },
      );
    }
    if (!coupon) {
      return NextResponse.json({ ok: false, error: "The Stripe TEST discount could not be prepared." }, { status: 502, headers: RESPONSE_HEADERS });
    }
  }

  // Failed checkout creation can leave a TEST customer behind even though no ADS
  // customer was activated. Clear those stale Stripe customers before retrying the
  // same submitted lead so test failures do not accumulate orphan billing records.
  const staleAttempts = await serviceRoleDatabaseRequest<FailedCheckout[]>(
    `stripe_checkout_attempts?signup_lead_id=eq.${lead.id}&status=eq.canceled&livemode=eq.false&stripe_customer_id=not.is.null&select=stripe_customer_id&order=created_at.desc&limit=5`,
  ).catch(() => []);
  try {
    for (const stale of staleAttempts) {
      if (stale.stripe_customer_id?.startsWith("cus_")) {
        await stripeDeleteTestCustomer(stale.stripe_customer_id);
      }
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "The previous failed Stripe TEST checkout could not be cleaned up safely. Try again shortly." },
      { status: 502, headers: RESPONSE_HEADERS },
    );
  }

  const checkoutMode = plan.chargeType === "recurring" ? "subscription" : "payment";
  const attemptId = randomUUID();
  const idempotencyKey = `ads-bin-test:${lead.id}:${attemptId}`;
  await serviceRoleDatabaseRequest("stripe_checkout_attempts", {
    method: "POST",
    body: JSON.stringify({
      id: attemptId,
      signup_lead_id: lead.id,
      checkout_mode: checkoutMode,
      plan_id: plan.id,
      bin_count: lead.binCount,
      subtotal_cents: price.subtotalCents,
      discount_cents: discountCents,
      first_charge_cents: firstChargeCents,
      discount_kind: discountKind,
      promo_code: lead.promoCode || null,
      referral_code: lead.referralCode || null,
      address_fingerprint: lead.addressFingerprint,
      idempotency_key: idempotencyKey,
      status: "preparing",
      livemode: false,
    }),
  });

  try {
    const customer = await stripePost<StripeCustomer>("customers", {
      email: lead.email,
      name: lead.fullName,
      phone: lead.phone,
      "address[line1]": lead.line1,
      "address[line2]": lead.line2 || undefined,
      "address[city]": lead.city,
      "address[state]": lead.region,
      "address[postal_code]": lead.postalCode,
      "address[country]": "US",
      "metadata[ads_signup_lead_id]": lead.id,
      "metadata[ads_checkout_attempt_id]": attemptId,
      "metadata[ads_address_fingerprint]": lead.addressFingerprint,
      "metadata[ads_environment]": "test",
    }, `${idempotencyKey}:customer`);

    await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() }),
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
    const values: Record<string, unknown> = {
      mode: checkoutMode,
      customer: customer.id,
      client_reference_id: lead.id,
      success_url: `${origin}/bin-cleaning/signup/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bin-cleaning/complete-payment?checkout=canceled`,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": price.subtotalCents,
      "line_items[0][price_data][product_data][name]": `ADS Bin Cleaning — ${plan.name} (${lead.binCount} ${lead.binCount === 1 ? "bin" : "bins"})`,
      "metadata[ads_signup_lead_id]": lead.id,
      "metadata[ads_checkout_attempt_id]": attemptId,
      "metadata[ads_plan_id]": plan.id,
      "metadata[ads_bin_count]": lead.binCount,
      "metadata[ads_environment]": "test",
    };
    if (checkoutMode === "subscription") {
      values["line_items[0][price_data][recurring][interval]"] = "month";
      values["line_items[0][price_data][recurring][interval_count]"] = plan.intervalMonths ?? 1;
      values["subscription_data[metadata][ads_signup_lead_id]"] = lead.id;
      values["subscription_data[metadata][ads_checkout_attempt_id]"] = attemptId;
      values["subscription_data[metadata][ads_plan_id]"] = plan.id;
    } else {
      values["payment_intent_data[metadata][ads_signup_lead_id]"] = lead.id;
      values["payment_intent_data[metadata][ads_checkout_attempt_id]"] = attemptId;
    }
    if (coupon) values["discounts[0][coupon]"] = coupon;

    const session = await stripePost<StripeSession>("checkout/sessions", values, `${idempotencyKey}:session`);
    if (session.livemode || !session.url) throw new Error("Stripe returned an unsafe or incomplete Checkout Session");

    await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_checkout_session_id: session.id, status: "open", updated_at: new Date().toISOString() }),
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url, checkoutSessionId: session.id }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "canceled", updated_at: new Date().toISOString() }),
    }).catch(() => null);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe TEST checkout could not be created." },
      { status: 502, headers: RESPONSE_HEADERS },
    );
  }
}
