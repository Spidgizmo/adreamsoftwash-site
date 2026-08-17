import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/bin-cleaning/AppShell";
import { currentSession, databaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  account_status: string;
  customer_contact_preferences: {
    marketing_allowed: boolean;
    marketing_updated_at: string | null;
  } | null;
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

export default async function MarketingPreferencesPage() {
  const session = await currentSession();
  if (!session || session.role !== "administrator") notFound();

  const customers = await databaseRequest<Customer[]>(
    "customers?select=id,full_name,email,account_status,customer_contact_preferences(marketing_allowed,marketing_updated_at)&order=full_name",
  ).catch(() => []);

  const onCount = customers.filter(
    (customer) => customer.customer_contact_preferences?.marketing_allowed,
  ).length;
  const offCount = customers.length - onCount;

  return (
    <AppShell area="Internal CRM">
      <section className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Marketing preferences</h2>
            <p className="mt-1 text-sm text-zinc-600">
              This is optional promotional consent only. Required account, billing, scheduling, safety, and service notices are separate.
            </p>
          </div>
          <div className="flex gap-2 text-sm font-black">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">ON {onCount}</span>
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-zinc-800">OFF {offCount}</span>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Customer</th>
                <th className="p-3">Account</th>
                <th className="p-3">Marketing offers</th>
                <th className="p-3">Last changed</th>
                <th className="p-3">CRM record</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const allowed = Boolean(customer.customer_contact_preferences?.marketing_allowed);
                return (
                  <tr key={customer.id} className="border-b last:border-b-0">
                    <td className="p-3">
                      <strong>{customer.full_name}</strong>
                      <span className="block text-xs text-zinc-500">{customer.email}</span>
                    </td>
                    <td className="p-3">{customer.account_status.replaceAll("_", " ")}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          allowed
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-zinc-200 text-zinc-800"
                        }`}
                      >
                        {allowed ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="p-3">{dateLabel(customer.customer_contact_preferences?.marketing_updated_at ?? null)}</td>
                    <td className="p-3">
                      <Link className="font-black text-brand-700 underline" href={`/bin-cleaning/crm/customers/${customer.id}`}>
                        Open customer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
