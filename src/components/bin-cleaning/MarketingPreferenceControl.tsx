import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type Customer = { id: string };
type Preference = {
  marketing_allowed: boolean;
  marketing_updated_at: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return "Not changed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not changed yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
}

export async function MarketingPreferenceControl() {
  const session = await currentSession();
  if (!session || session.role !== "customer") return null;

  const customers = await serviceRoleDatabaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer) return null;

  const preferences = await serviceRoleDatabaseRequest<Preference[]>(
    `customer_contact_preferences?customer_id=eq.${customer.id}&select=marketing_allowed,marketing_updated_at&limit=1`,
  ).catch(() => []);
  const preference = preferences[0];
  if (!preference) return null;

  const allowed = preference.marketing_allowed;
  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black">Optional marketing offers</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                allowed
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-zinc-200 text-zinc-800"
              }`}
            >
              {allowed ? "ON" : "OFF"}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
            Control promotional emails, texts, and special offers from ADS. Turning marketing off does not stop required account, billing, scheduling, safety, or service-completion notices.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last preference change: {dateLabel(preference.marketing_updated_at)}
          </p>
        </div>
        <form action="/api/bin-cleaning/marketing-preference" method="post">
          <input type="hidden" name="action" value={allowed ? "disable" : "enable"} />
          <button
            type="submit"
            className={`rounded-xl px-4 py-3 font-black ${
              allowed
                ? "border border-zinc-300 bg-white text-zinc-900"
                : "bg-brand-700 text-white"
            }`}
          >
            {allowed ? "Turn marketing offers off" : "Turn marketing offers on"}
          </button>
        </form>
      </div>
    </section>
  );
}
