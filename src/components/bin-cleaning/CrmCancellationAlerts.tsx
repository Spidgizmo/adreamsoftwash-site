import Link from "next/link";
import { databaseRequest } from "@/lib/supabase/server";

type Subscription = {
  id: string;
  customer_id: string;
  subscription_status: string;
  service_status: string;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  ended_at: string | null;
  started_at: string;
  customers: { full_name: string; email: string } | null;
};

function dateLabel(value: string | null) {
  if (!value) return "end of current paid period";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "end of current paid period";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export async function CrmCancellationAlerts() {
  const subscriptions = await databaseRequest<Subscription[]>(
    "subscriptions?select=id,customer_id,subscription_status,service_status,cancel_at_period_end,cancel_at,ended_at,started_at,customers(full_name,email)&order=started_at.desc&limit=200",
  ).catch(() => []);

  const latest = new Map<string, Subscription>();
  for (const subscription of subscriptions) {
    if (!latest.has(subscription.customer_id)) latest.set(subscription.customer_id, subscription);
  }
  const affected = [...latest.values()].filter(
    (subscription) =>
      subscription.cancel_at_period_end ||
      Boolean(subscription.ended_at) ||
      subscription.subscription_status === "canceled" ||
      subscription.service_status === "canceled",
  );
  if (affected.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black">Customer cancellations</p>
          <p className="text-sm">Customers below have scheduled or completed a service cancellation.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black">{affected.length}</span>
      </div>
      <div className="mt-4 space-y-2">
        {affected.map((subscription) => {
          const scheduled = subscription.cancel_at_period_end && !subscription.ended_at;
          return (
            <div key={subscription.id} className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link className="font-black text-brand-700 underline" href={`/bin-cleaning/crm/customers/${subscription.customer_id}`}>
                  {subscription.customers?.full_name ?? "Customer"}
                </Link>
                <span className="ml-2 text-sm text-zinc-600">{subscription.customers?.email ?? ""}</span>
              </div>
              <div className="text-sm font-bold">
                {scheduled ? `Cancellation scheduled · through ${dateLabel(subscription.cancel_at)}` : "Canceled"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
