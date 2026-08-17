import { NextRequest, NextResponse } from "next/server";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripeDeleteTestCustomer } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EraseKind = "customer" | "signup";
type CustomerStripeRow = { id: string; stripe_customer_id: string | null };
type SignupLeadRow = { id: string; auth_user_id: string | null };
type CheckoutStripeRow = { stripe_customer_id: string | null };
type LinkedCustomerRow = { id: string };

function safeId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

async function signupStripeCustomerIds(id: string) {
  const attempts = await serviceRoleDatabaseRequest<CheckoutStripeRow[]>(
    `stripe_checkout_attempts?signup_lead_id=eq.${encodeURIComponent(id)}&select=stripe_customer_id`,
  );
  return [...new Set(
    attempts
      .map((attempt) => attempt.stripe_customer_id)
      .filter((value): value is string => Boolean(value)),
  )];
}

async function resolveEraseTarget(kind: EraseKind, id: string): Promise<{ kind: EraseKind; id: string }> {
  if (kind === "customer") return { kind, id };

  const leads = await serviceRoleDatabaseRequest<SignupLeadRow[]>(
    `signup_leads?id=eq.${encodeURIComponent(id)}&select=id,auth_user_id&limit=1`,
  );
  const lead = leads[0];
  if (!lead) throw new Error("Signup was not found");

  const linkedCustomerIds = new Set<string>();
  if (lead.auth_user_id) {
    const linked = await serviceRoleDatabaseRequest<LinkedCustomerRow[]>(
      `customers?user_id=eq.${encodeURIComponent(lead.auth_user_id)}&select=id`,
    );
    linked.forEach((customer) => linkedCustomerIds.add(customer.id));
  }

  for (const stripeCustomerId of await signupStripeCustomerIds(id)) {
    const linked = await serviceRoleDatabaseRequest<LinkedCustomerRow[]>(
      `customers?stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}&select=id`,
    );
    linked.forEach((customer) => linkedCustomerIds.add(customer.id));
  }

  if (linkedCustomerIds.size > 1) {
    throw new Error("Signup is linked to more than one customer and requires review");
  }
  const linkedCustomerId = [...linkedCustomerIds][0];
  return linkedCustomerId
    ? { kind: "customer", id: linkedCustomerId }
    : { kind: "signup", id };
}

async function stripeCustomersForErase(kind: EraseKind, id: string) {
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
  if (!leads[0]) throw new Error("Signup was not found");
  return signupStripeCustomerIds(id);
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Administrator authorization is required." }, { status: 403 });
  }

  const form = await request.formData();
  const id = safeId(form.get("id"));
  const requestedKind = form.get("kind");
  const confirm = form.get("confirm");

  if (!id || (requestedKind !== "customer" && requestedKind !== "signup") || confirm !== "ERASE") {
    return NextResponse.json({ ok: false, error: "Permanent erase confirmation is invalid." }, { status: 400 });
  }

  const detailPath = requestedKind === "customer"
    ? `/bin-cleaning/crm/customers/${id}`
    : `/bin-cleaning/crm/signups/${id}`;

  try {
    // An old signup can already have become a customer even if its intake status
    // still looks unpaid. In that case, follow the relationship and erase the
    // complete customer graph instead of dead-ending with "already linked".
    const target = await resolveEraseTarget(requestedKind, id);

    // Billing cleanup deliberately happens first. Stripe customer deletion in TEST
    // mode immediately cancels active subscriptions. If this step fails, no ADS
    // customer/signup data is erased, preventing an invisible recurring charge.
    const stripeCustomerIds = await stripeCustomersForErase(target.kind, target.id);
    for (const stripeCustomerId of stripeCustomerIds) {
      await stripeDeleteTestCustomer(stripeCustomerId);
    }

    const rpc = target.kind === "customer"
      ? "rpc/admin_hard_delete_customer"
      : "rpc/admin_hard_delete_signup_lead";
    const body = target.kind === "customer"
      ? { p_customer_id: target.id, p_actor_id: session.id }
      : { p_signup_lead_id: target.id, p_actor_id: session.id };

    await serviceRoleDatabaseRequest(rpc, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.redirect(
      new URL(`/bin-cleaning/crm?erased=${target.kind}`, request.url),
      303,
    );
  } catch {
    return NextResponse.redirect(new URL(`${detailPath}?erase_error=1`, request.url), 303);
  }
}
