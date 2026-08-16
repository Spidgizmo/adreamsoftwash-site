import { currentSession, databaseRequest } from "@/lib/supabase/server";

type Customer = { id: string };
type Subscription = {
  subscription_status: string;
  service_status: string;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  ended_at: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return "the end of the current paid period";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the end of the current paid period";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function SubscriptionStatusNotice() {
  const session = await currentSession();
  if (!session || session.role !== "customer") return null;

  const customers = await databaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer) return null;

  const subscriptions = await databaseRequest<Subscription[]>(
    `subscriptions?customer_id=eq.${customer.id}&select=subscription_status,service_status,cancel_at_period_end,cancel_at,ended_at&order=started_at.desc.nullslast&limit=1`,
  ).catch(() => []);
  const subscription = subscriptions[0];
  if (!subscription) return null;

  if (subscription.cancel_at_period_end && !subscription.ended_at) {
    return (
      <section role="status" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <p className="font-black">Cancellation scheduled</p>
        <p className="mt-1 text-sm leading-6">
          Your recurring subscription is scheduled to end on {dateLabel(subscription.cancel_at)}. Service remains active through the paid period. Use <strong>Billing &amp; cancel</strong> above if you need to review the subscription in Stripe TEST billing.
        </p>
      </section>
    );
  }

  if (subscription.subscription_status === "canceled" || subscription.service_status === "canceled") {
    return (
      <section role="status" className="mb-6 rounded-2xl border border-zinc-300 bg-zinc-100 p-5 text-zinc-900">
        <p className="font-black">Subscription canceled</p>
        <p className="mt-1 text-sm leading-6">Recurring billing and future recurring service are no longer active for this subscription.</p>
      </section>
    );
  }

  return null;
}
