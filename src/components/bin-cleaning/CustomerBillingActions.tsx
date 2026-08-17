import { currentSession, databaseRequest } from "@/lib/supabase/server";

type Customer = { id: string };
type Subscription = {
  stripe_subscription_id: string | null;
  subscription_status: string;
  service_status: string;
  cancel_at_period_end: boolean;
  ended_at: string | null;
};

export async function CustomerBillingActions() {
  const session = await currentSession();
  if (!session || session.role !== "customer") return null;

  const customers = await databaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer) return null;

  const subscriptions = await databaseRequest<Subscription[]>(
    `subscriptions?customer_id=eq.${customer.id}&select=stripe_subscription_id,subscription_status,service_status,cancel_at_period_end,ended_at&order=started_at.desc.nullslast&limit=1`,
  ).catch(() => []);
  const subscription = subscriptions[0];
  const recurring = Boolean(subscription?.stripe_subscription_id?.startsWith("sub_"));
  const canceled = Boolean(
    recurring &&
      (subscription?.ended_at ||
        subscription?.subscription_status === "canceled" ||
        subscription?.service_status === "canceled"),
  );
  const cancellationScheduled = Boolean(
    recurring && subscription?.cancel_at_period_end && !subscription?.ended_at,
  );

  return (
    <>
      <form action="/api/bin-cleaning/billing-portal" method="post">
        <input type="hidden" name="action" value="payment_method" />
        <button
          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 font-black text-brand-800"
          type="submit"
        >
          Update payment method
        </button>
      </form>

      {recurring && !canceled && !cancellationScheduled && (
        <form action="/api/bin-cleaning/billing-portal" method="post">
          <input type="hidden" name="action" value="cancel" />
          <button
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 font-black text-red-800"
            type="submit"
          >
            Cancel service
          </button>
        </form>
      )}

      {recurring && (canceled || cancellationScheduled) && (
        <form action="/api/bin-cleaning/resume-service" method="post">
          <button
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 font-black text-emerald-800"
            type="submit"
          >
            Resume service
          </button>
        </form>
      )}
    </>
  );
}
