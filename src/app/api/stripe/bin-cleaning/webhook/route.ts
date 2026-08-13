import { NextRequest, NextResponse } from "next/server";
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

type Attempt = { id: string };

function text(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
function nestedRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function metadataAttemptId(object: StripeObject) {
  const direct = text(object.metadata?.ads_checkout_attempt_id);
  if (direct) return direct;
  const parent = nestedRecord(object.parent);
  const subscriptionDetails = nestedRecord(parent?.subscription_details) || nestedRecord(object.subscription_details);
  const metadata = nestedRecord(subscriptionDetails?.metadata);
  return text(metadata?.ads_checkout_attempt_id);
}
function invoiceSubscriptionId(object: StripeObject) {
  const direct = text(object.subscription);
  if (direct) return direct;
  const parent = nestedRecord(object.parent);
  const details = nestedRecord(parent?.subscription_details);
  return text(details?.subscription);
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

async function rpc(path: string, body: Record<string, unknown>) {
  return serviceRoleDatabaseRequest(path, { method: "POST", body: JSON.stringify(body) });
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
  const claimed = await rpc("rpc/claim_stripe_test_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_object_id: text(object.id),
    p_livemode: event.livemode,
  }) as boolean;
  if (!claimed) {
    return NextResponse.json({ ok: true, duplicate: true }, { headers: HEADERS });
  }

  try {
    const attemptId = await attemptFor(object);
    switch (event.type) {
      case "checkout.session.completed": {
        if (!attemptId) throw new Error("Checkout attempt could not be resolved");
        const mode = text(object.mode);
        const paymentStatus = text(object.payment_status);
        await rpc("rpc/sync_stripe_test_checkout_session", {
          p_attempt_id: attemptId,
          p_session_id: text(object.id),
          p_customer_id: text(object.customer),
          p_subscription_id: text(object.subscription),
          p_payment_intent_id: text(object.payment_intent),
          p_paid: mode === "payment" && paymentStatus === "paid",
        });
        if (mode === "payment" && paymentStatus === "paid") {
          await rpc("rpc/activate_stripe_test_payment", {
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
        await rpc("rpc/activate_stripe_test_payment", {
          p_attempt_id: attemptId,
          p_stripe_customer_id: text(object.customer),
          p_stripe_subscription_id: invoiceSubscriptionId(object),
          p_stripe_invoice_id: text(object.id),
          p_stripe_payment_intent_id: text(object.payment_intent),
        });
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
        if (subscriptionId && ["canceled", "unpaid", "incomplete_expired"].includes(status || "")) {
          await rpc("rpc/cancel_stripe_test_subscription", { p_stripe_subscription_id: subscriptionId });
        }
        break;
      }
      default:
        await rpc("rpc/finish_stripe_test_webhook_event", { p_event_id: event.id, p_status: "ignored", p_error: null });
        return NextResponse.json({ ok: true, ignored: true }, { headers: HEADERS });
    }

    await rpc("rpc/finish_stripe_test_webhook_event", { p_event_id: event.id, p_status: "processed", p_error: null });
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
