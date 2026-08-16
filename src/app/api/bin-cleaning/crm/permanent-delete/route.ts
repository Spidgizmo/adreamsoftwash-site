import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripeDeleteTestCustomer } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CustomerStripeRow = { id: string; stripe_customer_id: string | null };
type SignupLeadRow = { id: string; auth_user_id: string | null };
type CheckoutStripeRow = { stripe_customer_id: string | null };

function safeId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

async function stripeCustomersForErase(kind: "customer" | "signup", id: string) {
  if (kind === "customer") {
    const rows = await serviceRoleDatabaseRequest<CustomerStripeRow[]>(
      `customers?id=eq.${encodeURIComponent(id)}&select=id,stripe_customer_id&limit=1`,
    );
    if (!rows[0]) throw new Error("Customer was not found");
    return rows[0].stripe_customer_id ? [rows[0].stripe_customer_id] : [];
  }

  const leads = await serviceRoleDatabaseRequest<SignupLeadRow[]>(
    `signup_leads?id=eq.${encodeURIComponent(id)}&select=id,auth_user_id&limit=1`,
  );
  const lead = leads[0];
  if (!lead) throw new Error("Signup was not found");

  // Match the database erasure preflight before touching Stripe. If this signup
  // already produced a customer, the admin must erase from the customer record
  // so we never stop billing and then discover the signup-only erase is blocked.
  if (lead.auth_user_id) {
    const linked = await serviceRoleDatabaseRequest<{ id: string }[]>(
      `customers?user_id=eq.${encodeURIComponent(lead.auth_user_id)}&select=id&limit=1`,
    );
    if (linked[0]) throw new Error("Signup is already linked to a customer");
  }

  const attempts = await serviceRoleDatabaseRequest<CheckoutStripeRow[]>(
    `stripe_checkout_attempts?signup_lead_id=eq.${encodeURIComponent(id)}&select=stripe_customer_id`,
  );
  const stripeCustomerIds = [...new Set(
    attempts
      .map((attempt) => attempt.stripe_customer_id)
      .filter((value): value is string => Boolean(value)),
  )];

  for (const stripeCustomerId of stripeCustomerIds) {
    const linked = await serviceRoleDatabaseRequest<{ id: string }[]>(
      `customers?stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}&select=id&limit=1`,
    );
    if (linked[0]) throw new Error("Signup Stripe customer is already linked to a customer");
  }

  return stripeCustomerIds;
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Administrator authorization is required." }, { status: 403 });
  }

  const form = await request.formData();
  const id = safeId(form.get("id"));
  const kind = form.get("kind");
  const confirm = form.get("confirm");

  if (!id || (kind !== "customer" && kind !== "signup") || confirm !== "ERASE") {
    return NextResponse.json({ ok: false, error: "Permanent erase confirmation is invalid." }, { status: 400 });
  }

  const detailPath = kind === "customer"
    ? `/bin-cleaning/crm/customers/${id}`
    : `/bin-cleaning/crm/signups/${id}`;

  try {
    // Billing cleanup deliberately happens first. Stripe customer deletion in TEST
    // mode immediately cancels active subscriptions. If this step fails, no ADS
    // customer/signup data is erased, preventing an invisible recurring charge.
    const stripeCustomerIds = await stripeCustomersForErase(kind, id);
    for (const stripeCustomerId of stripeCustomerIds) {
      await stripeDeleteTestCustomer(stripeCustomerId);
    }

    const rpc = kind === "customer"
      ? "rpc/admin_hard_delete_customer"
      : "rpc/admin_hard_delete_signup_lead";
    const body = kind === "customer"
      ? { p_customer_id: id, p_actor_id: session.id }
      : { p_signup_lead_id: id, p_actor_id: session.id };

    await serviceRoleDatabaseRequest(rpc, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.redirect(new URL(`${detailPath}?erase_error=1`, request.url), 303);
  }

  return NextResponse.redirect(
    new URL(`/bin-cleaning/crm?erased=${kind}`, request.url),
    303,
  );
}
