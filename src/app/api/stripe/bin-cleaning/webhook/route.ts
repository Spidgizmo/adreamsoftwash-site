import { NextRequest, NextResponse } from "next/server";
import { processReferralNotificationOutbox } from "@/lib/bin-cleaning/referral-notification-outbox";
import {
  armAvailableStripeReferralRewards,
  clearStripeReferralRewardState,
} from "@/lib/bin-cleaning/stripe-referral-rewards";
import { provisionPaidStripeTestCustomerAuth } from "@/lib/bin-cleaning/test-auth-provisioning";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { verifyStripeSignature } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

type StripeObject = Record<string, unknown> & {
  id?: string;
  metadata?: Record<string, string>;
};
type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: StripeObject };
};
type Attempt = { id: string; subtotal_cents?: number; first_charge_cents?: number };
type ActivationResult = { customerId: string };
type ReferralCredit = {
  id: string;
  remaining_cents: number;
  status: string;
  stripe_subscription_id: string | null;
  stripe_armed_at: string | null;
};

function text(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
function integer(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}
function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}
function stripeTimestamp(value: unknown) {
  const seconds = integer(value);
  return seconds && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}
function nestedRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function subscriptionDetails(object: StripeObject) {
  const parent = nestedRecord(object.parent);
  return nestedRecord(parent?.subscription_details) || nestedRecord(object.subscription_details);
}
function subscriptionMetadata(object: StripeObject) {
  return nestedRecord(subscriptionDetails(object)?.metadata);
}
function metadataAttemptId(object: StripeObject) {
  const direct = text(object.metadata?.ads_checkout_attempt_id);
  if (direct) return direct;
  return text(subscriptionMetadata(object)?.ads_checkout_attempt_id);
}
function invoiceReferralCreditId(object: StripeObject) {
  const id = text(subscriptionMetadata(object)?.ads_referral_credit_id);
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
function invoiceSubscriptionId(object: StripeObject) {
  const direct = text(object.subscription);
  if (direct) return direct;
  return text(subscriptionDetails(object)?.subscription);
}

async function attemptFor(object: StripeObject) {
  const metadataId = metadataAttemptId(object);
  if (metadataId) return metadataId;
  const subscriptionId = invoiceSubscriptionId(object) || text(object.subscription);
  if (subscriptionId) {
    const rows = await serviceRoleDatabaseRequest<Attempt[]>(
      `stripe_checkout_attempts?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=id&order=created_at.desc&limit=1`,
    );
    if (rows[0]?.id) return rows[0].id;
  }
  const customerId = text(object.customer);
  if (customerId) {
    const rows = await serviceRoleDatabaseRequest<Attempt[]>(
      `stripe_checkout_attempts?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=id&order=created_at.desc&limit=1`,
    );
    if (rows[0]?.id) return rows[0].id;
  }
  return null;
}

async function trustedAttempt(attemptId: string) {
  const rows = await serviceRoleDatabaseRequest<Attempt[]>(
    `stripe_checkout_attempts?id=eq.${encodeURIComponent(attemptId)}&select=id,subtotal_cents,first_charge_cents&limit=1`,
  );
  if (!rows[0] || !Number.isSafeInteger(rows[0].subtotal_cents) || !Number.isSafeInteger(rows[0].first_charge_cents)) {
    throw new Error("Trusted checkout amount could not be resolved");
  }
  return rows[0] as Required<Attempt>;
}

async function trustedReferralCredit(creditId: string, subscriptionId: string) {
  const rows = await serviceRoleDatabaseRequest<ReferralCredit[]>(
    `referral_credits?id=eq.${encodeURIComponent(creditId)}&select=id,remaining_cents,status,stripe_subscription_id,stripe_armed_at&limit=1`,
  );
  const credit = rows[0];
  if (!credit
      || credit.status !== "issued"
      || !Number.isSafeInteger(credit.remaining_cents)
      || credit.remaining_cents <= 0
      || !credit.stripe_armed_at
      || credit.stripe_subscription_id !== subscriptionId) {
    throw new Error("Trusted referral reward could not be resolved");
  }
  return credit;
}

async function verifyPaidAmount(attemptId: string, object: StripeObject, kind: "checkout" | "invoice") {
  const attempt = await trustedAttempt(attemptId);
  const paidCents = integer(kind === "checkout" ? object.amount_total : object.amount_paid);
  if (paidCents === null) throw new Error("Stripe paid amount is missing");

  let expectedCents = attempt.first_charge_cents;
  let referralCreditId: string | null = null;
  if (kind === "invoice" && text(object.billing_reason) !== "subscription_create") {
    expectedCents = attempt.subtotal_cents;
    referralCreditId = invoiceReferralCreditId(object);
    const subscriptionId = invoiceSubscriptionId(object);
    if (referralCreditId) {
      if (!subscriptionId) throw new Error("Stripe referral invoice subscription is missing");
      const credit = await trustedReferralCredit(referralCreditId, subscriptionId);
      expectedCents = Math.max(0, expectedCents - Math.min(credit.remaining_cents, expectedCents));
    }
  }
  if (paidCents !== expectedCents) {
    throw new Error(`Stripe paid amount mismatch: expected ${expectedCents}, received ${paidCents}`);
  }
  return referralCreditId;
}

async function rpc<T = unknown>(path: string, body: Record<string, unknown>) {
  return serviceRoleDatabaseRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
}

async function activatePaidTestCustomer(body: Record<string, unknown>) {
  const activated = await rpc<ActivationResult>("rpc/activate_stripe_test_payment", body);
  if (!activated?.customerId) throw new Error("Paid test customer activation did not return a customer id");
  await provisionPaidStripeTestCustomerAuth(activated.customerId);
}

async function flushReferralNotifications() {
  await processReferralNotificationOutbox(20).catch(() => null);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ ok: false, error: "Invalid Stripe signature." }, { status: 400, headers: HEADERS });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Stripe event payload." }, { status: 400, headers: HEADERS });
  }
  if (!event.id || !event.type || !event.data?.object || event.livemode) {
    return NextResponse.json({ ok: false, error: "Only Stripe TEST events are accepted." }, { status: 400, headers: HEADERS });
  }

  const object = event.data.object;
  const claimed = await rpc<boolean>("rpc/claim_stripe_test_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_object_id: text(object.id),
    p_livemode: event.livemode,
  });
  if (!claimed) {
    await flushReferralNotifications();
    return NextResponse.json({ ok: true, duplicate: true }, { headers: HEADERS });
  }

  try {
    const attemptId = await attemptFor(object);
    switch (event.type) {
      case "checkout.session.completed": {
        if (!attemptId) throw new Error("Checkout attempt could not be resolved");
        const mode = text(object.mode);
        const paymentStatus = text(object.payment_status);
        if (mode === "payment" && paymentStatus === "paid") await verifyPaidAmount(attemptId, object, "checkout");
        await rpc("rpc/sync_stripe_test_checkout_session", {
          p_attempt_id: attemptId,
          p_session_id: text(object.id),
          p_customer_id: text(object.customer),
          p_subscription_id: text(object.subscription),
          p_payment_intent_id: text(object.payment_intent),
          p_paid: mode === "payment" && paymentStatus === "paid",
        });
        if (mode === "payment" && paymentStatus === "paid") {
          await activatePaidTestCustomer({
            p_attempt_id: attemptId,
            p_stripe_customer_id: text(object.customer),
            p_stripe_subscription_id: null,
            p_stripe_invoice_id: null,
            p_stripe_payment_intent_id: text(object.payment_intent),
          });
        }
        break;
      }
      case "checkout.session.expired": {
        if (attemptId) {
          await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "expired", updated_at: new Date().toISOString() }),
          });
        }
        break;
      }
      case "invoice.paid": {
        if (!attemptId) throw new Error("Subscription checkout attempt could not be resolved");
        const referralCreditId = await verifyPaidAmount(attemptId, object, "invoice");
        const subscriptionId = invoiceSubscriptionId(object);
        await activatePaidTestCustomer({
          p_attempt_id: attemptId,
          p_stripe_customer_id: text(object.customer),
          p_stripe_subscription_id: subscriptionId,
          p_stripe_invoice_id: text(object.id),
          p_stripe_payment_intent_id: text(object.payment_intent),
        });
        if (referralCreditId && subscriptionId && text(object.id)) {
          await rpc("rpc/apply_stripe_referral_reward_invoice", {
            p_credit_id: referralCreditId,
            p_stripe_subscription_id: subscriptionId,
            p_stripe_invoice_id: text(object.id),
          });
          await clearStripeReferralRewardState(subscriptionId, referralCreditId);
          await armAvailableStripeReferralRewards(20);
        }
        break;
      }
      case "invoice.payment_failed": {
        if (!attemptId) throw new Error("Failed-payment checkout attempt could not be resolved");
        await rpc("rpc/mark_stripe_test_payment_failed", {
          p_attempt_id: attemptId,
          p_stripe_subscription_id: invoiceSubscriptionId(object),
          p_stripe_invoice_id: text(object.id),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscriptionId = text(object.id);
        if (subscriptionId) await rpc("rpc/cancel_stripe_test_subscription", { p_stripe_subscription_id: subscriptionId });
        break;
      }
      case "customer.subscription.updated": {
        const subscriptionId = text(object.id);
        const status = text(object.status);
        if (subscriptionId) {
          await rpc("rpc/sync_stripe_test_subscription_state", {
            p_stripe_subscription_id: subscriptionId,
            p_stripe_status: status,
            p_cancel_at_period_end: booleanValue(object.cancel_at_period_end),
            p_cancel_at: stripeTimestamp(object.cancel_at),
          });
          if (["canceled", "unpaid", "incomplete_expired"].includes(status || "")) {
            await rpc("rpc/cancel_stripe_test_subscription", { p_stripe_subscription_id: subscriptionId });
          }
        }
        break;
      }
      default:
        await rpc("rpc/finish_stripe_test_webhook_event", { p_event_id: event.id, p_status: "ignored", p_error: null });
        await flushReferralNotifications();
        return NextResponse.json({ ok: true, ignored: true }, { headers: HEADERS });
    }

    await rpc("rpc/finish_stripe_test_webhook_event", { p_event_id: event.id, p_status: "processed", p_error: null });
    await flushReferralNotifications();
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (error) {
    await rpc("rpc/finish_stripe_test_webhook_event", {
      p_event_id: event.id,
      p_status: "failed",
      p_error: error instanceof Error ? error.message : "Unknown webhook processing error",
    }).catch(() => null);
    return NextResponse.json({ ok: false, error: "Stripe event processing failed." }, { status: 500, headers: HEADERS });
  }
}
