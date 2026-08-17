import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_BIN_CLEANING_PLANS,
  calculateBinCleaningPrice,
} from "@/lib/bin-cleaning-plans";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripePost, stripeTestConfig } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  stripe_customer_id: string | null;
  is_test: boolean;
};
type Subscription = {
  id: string;
  stripe_subscription_id: string | null;
  subscription_status: string;
  service_status: string;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  ended_at: string | null;
  service_plan_versions: { plan_id: string };
};
type Address = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal_code: string;
  normalized_address_hash: string | null;
  preferred_return_location: string | null;
  access_instructions: string | null;
  gate_information: string | null;
  animal_warning: string | null;
};
type Preference = { email_allowed: boolean; sms_allowed: boolean; phone_allowed: boolean };
type Bin = { collection_stream: "trash" | "recycling" | "other" };
type TrashSchedule = { weekday: number | null };
type RecyclingSchedule = {
  weekday: number;
  frequency_weeks: number;
  anchor_collection_date: string;
};
type StripeSubscription = { id: string; status: string; cancel_at_period_end: boolean; cancel_at: number | null; livemode?: boolean };
type StripeSession = { id: string; url: string | null; livemode: boolean };

function addressFingerprint(address: Address) {
  if (address.normalized_address_hash) return address.normalized_address_hash;
  return createHash("sha256")
    .update(`${address.line1}|${address.line2 ?? ""}|${address.city}|${address.region}|${address.postal_code}`.toLowerCase())
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ ok: false, error: "Customer authentication is required." }, { status: 401 });
  }
  try {
    stripeTestConfig();
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Stripe TEST billing is unavailable." }, { status: 503 });
  }

  const customers = await serviceRoleDatabaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id,full_name,email,phone,stripe_customer_id,is_test&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer?.is_test || !customer.stripe_customer_id?.startsWith("cus_")) {
    return NextResponse.json({ ok: false, error: "No Stripe TEST customer is linked to this portal account." }, { status: 409 });
  }

  const subscriptions = await serviceRoleDatabaseRequest<Subscription[]>(
    `subscriptions?customer_id=eq.${customer.id}&select=id,stripe_subscription_id,subscription_status,service_status,cancel_at_period_end,cancel_at,ended_at,service_plan_versions(plan_id)&order=started_at.desc.nullslast&limit=1`,
  ).catch(() => []);
  const subscription = subscriptions[0];
  if (!subscription?.stripe_subscription_id?.startsWith("sub_")) {
    return NextResponse.json({ ok: false, error: "No recurring subscription is available to resume." }, { status: 409 });
  }

  // Before the paid period ends, resuming means undoing the scheduled cancellation
  // on the same Stripe subscription. Stripe sends customer.subscription.updated too,
  // but we also sync the returned state immediately so the portal changes at once.
  if (subscription.cancel_at_period_end && !subscription.ended_at) {
    try {
      const resumed = await stripePost<StripeSubscription>(
        `subscriptions/${subscription.stripe_subscription_id}`,
        { cancel_at_period_end: false },
        `ads-bin-resume-scheduled:${subscription.id}:${randomUUID()}`,
      );
      if (resumed.livemode) throw new Error("Stripe returned a live subscription");
      await serviceRoleDatabaseRequest("rpc/sync_stripe_test_subscription_state", {
        method: "POST",
        body: JSON.stringify({
          p_stripe_subscription_id: subscription.stripe_subscription_id,
          p_stripe_status: resumed.status || "active",
          p_cancel_at_period_end: false,
          p_cancel_at: null,
        }),
      });
      return NextResponse.redirect(new URL("/bin-cleaning/portal?billing=resumed", request.url), 303);
    } catch {
      return NextResponse.redirect(new URL("/bin-cleaning/portal?billing=resume-error", request.url), 303);
    }
  }

  const canceled = Boolean(
    subscription.ended_at ||
      subscription.subscription_status === "canceled" ||
      subscription.service_status === "canceled",
  );
  if (!canceled) {
    return NextResponse.redirect(new URL("/bin-cleaning/portal", request.url), 303);
  }

  // A fully canceled Stripe subscription cannot be reactivated. Keep the same ADS
  // customer/login/history, but create a fresh subscription Checkout for the restart.
  const [addresses, preferences] = await Promise.all([
    serviceRoleDatabaseRequest<Address[]>(
      `service_addresses?customer_id=eq.${customer.id}&is_current=eq.true&select=id,line1,line2,city,region,postal_code,normalized_address_hash,preferred_return_location,access_instructions,gate_information,animal_warning&limit=1`,
    ).catch(() => []),
    serviceRoleDatabaseRequest<Preference[]>(
      `customer_contact_preferences?customer_id=eq.${customer.id}&select=email_allowed,sms_allowed,phone_allowed&limit=1`,
    ).catch(() => []),
  ]);
  const address = addresses[0];
  if (!address) return NextResponse.json({ ok: false, error: "Current service address is missing." }, { status: 409 });

  const [bins, trashSchedules, recyclingSchedules] = await Promise.all([
    serviceRoleDatabaseRequest<Bin[]>(
      `bins?service_address_id=eq.${address.id}&active=eq.true&select=collection_stream`,
    ).catch(() => []),
    serviceRoleDatabaseRequest<TrashSchedule[]>(
      `trash_pickup_schedules?service_address_id=eq.${address.id}&effective_to=is.null&select=weekday&limit=1`,
    ).catch(() => []),
    serviceRoleDatabaseRequest<RecyclingSchedule[]>(
      `recycling_pickup_schedules?service_address_id=eq.${address.id}&is_current=eq.true&select=weekday,frequency_weeks,anchor_collection_date&limit=1`,
    ).catch(() => []),
  ]);

  const trashBins = bins.filter((bin) => bin.collection_stream === "trash").length;
  const recyclingBins = bins.filter((bin) => bin.collection_stream === "recycling").length;
  const binCount = trashBins + recyclingBins;
  const planId = subscription.service_plan_versions.plan_id;
  const plan = PUBLIC_BIN_CLEANING_PLANS.find(
    (item) => item.id === planId && item.status === "active" && item.checkoutEnabled && item.chargeType === "recurring",
  );
  if (!plan || binCount < 1) {
    return NextResponse.json({ ok: false, error: "The prior recurring plan is not available to resume." }, { status: 409 });
  }
  const price = calculateBinCleaningPrice(plan, binCount);
  if (!price) return NextResponse.json({ ok: false, error: "Resume pricing is unavailable." }, { status: 409 });

  const leadId = randomUUID();
  const attemptId = randomUUID();
  const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
  const fingerprint = addressFingerprint(address);
  const now = new Date().toISOString();
  const pref = preferences[0] ?? { email_allowed: true, sms_allowed: true, phone_allowed: true };
  const recycling = recyclingSchedules[0];

  await serviceRoleDatabaseRequest("signup_leads", {
    method: "POST",
    body: JSON.stringify({
      id: leadId,
      edit_token_hash: tokenHash,
      status: "submitted_unpaid",
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      region: address.region,
      postal_code: address.postal_code,
      plan_id: plan.id,
      bin_count: binCount,
      bin_streams: { trash: trashBins, recycling: recyclingBins, other: 0 },
      trash_weekday: trashSchedules[0]?.weekday ?? null,
      recycling_weekday: recycling?.weekday ?? null,
      recycling_frequency_weeks: recycling?.frequency_weeks ?? null,
      recycling_anchor_collection_date: recycling?.anchor_collection_date ?? null,
      preferred_return_location: address.preferred_return_location,
      access_instructions: address.access_instructions,
      gate_information: address.gate_information,
      animal_warning: address.animal_warning,
      email_allowed: pref.email_allowed,
      sms_allowed: pref.sms_allowed,
      phone_allowed: pref.phone_allowed,
      terms_accepted: true,
      source_path: "/bin-cleaning/portal/resume",
      estimated_subtotal_cents: price.subtotalCents,
      estimated_discount_cents: 0,
      estimated_first_charge_cents: price.subtotalCents,
      discount_kind: "none",
      discount_status: "none",
      form_data: { signup_method: "portal_resume", lead_source: "repeat-bin-customer" },
      submitted_at: now,
      auth_user_id: session.id,
    }),
  });

  const idempotencyKey = `ads-bin-resume:${customer.id}:${attemptId}`;
  await serviceRoleDatabaseRequest("stripe_checkout_attempts", {
    method: "POST",
    body: JSON.stringify({
      id: attemptId,
      signup_lead_id: leadId,
      checkout_mode: "subscription",
      plan_id: plan.id,
      bin_count: binCount,
      subtotal_cents: price.subtotalCents,
      discount_cents: 0,
      first_charge_cents: price.subtotalCents,
      discount_kind: "none",
      promo_code: null,
      referral_code: null,
      address_fingerprint: fingerprint,
      idempotency_key: idempotencyKey,
      stripe_customer_id: customer.stripe_customer_id,
      status: "preparing",
      livemode: false,
    }),
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
  try {
    const values: Record<string, unknown> = {
      mode: "subscription",
      customer: customer.stripe_customer_id,
      client_reference_id: leadId,
      success_url: `${origin}/bin-cleaning/portal?billing=resume-paid`,
      cancel_url: `${origin}/bin-cleaning/portal?billing=resume-canceled`,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": price.subtotalCents,
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][recurring][interval_count]": plan.intervalMonths ?? 1,
      "line_items[0][price_data][product_data][name]": `ADS Bin Cleaning — ${plan.name} (${binCount} ${binCount === 1 ? "bin" : "bins"})`,
      "metadata[ads_signup_lead_id]": leadId,
      "metadata[ads_checkout_attempt_id]": attemptId,
      "metadata[ads_plan_id]": plan.id,
      "metadata[ads_bin_count]": binCount,
      "metadata[ads_environment]": "test",
      "metadata[ads_resume_customer_id]": customer.id,
      "subscription_data[metadata][ads_signup_lead_id]": leadId,
      "subscription_data[metadata][ads_checkout_attempt_id]": attemptId,
      "subscription_data[metadata][ads_plan_id]": plan.id,
      "subscription_data[metadata][ads_resume_customer_id]": customer.id,
      payment_method_collection: "always",
    };
    const checkout = await stripePost<StripeSession>("checkout/sessions", values, `${idempotencyKey}:session`);
    if (checkout.livemode || !checkout.url) throw new Error("Stripe returned an unsafe resume Checkout Session");

    await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({
        stripe_checkout_session_id: checkout.id,
        status: "open",
        updated_at: new Date().toISOString(),
      }),
    });
    return NextResponse.redirect(checkout.url, 303);
  } catch {
    await serviceRoleDatabaseRequest(`stripe_checkout_attempts?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "canceled", updated_at: new Date().toISOString() }),
    }).catch(() => null);
    return NextResponse.redirect(new URL("/bin-cleaning/portal?billing=resume-error", request.url), 303);
  }
}
