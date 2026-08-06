import Link from "next/link";
import { AppShell, Stat } from "@/components/bin-cleaning/AppShell";
import { crmCustomers } from "@/lib/bin-cleaning/queries";
import { crmSignupLeads } from "@/lib/bin-cleaning/signup-queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";

export const dynamic = "force-dynamic";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function CRM({
  searchParams,
}: {
  searchParams: {
    q?: string;
    plan?: string;
    status?: string;
    municipality?: string;
    pickup?: string;
  };
}) {
  const [customers, signupResult] = await Promise.all([
    crmCustomers(searchParams),
    crmSignupLeads(),
  ]);
  const signupLeads = signupResult.leads;

  return (
    <AppShell area="Internal CRM">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Matching test customers" value={customers.length} />
        <Stat
          label="Unverified pickup"
          value={customers.filter((customer) =>
            customer.service_addresses.some((address) =>
              address.trash_pickup_schedules.some(
                (pickup) => pickup.weekday == null,
              ),
            ),
          ).length}
        />
        <Stat
          label="Submitted unpaid"
          value={signupLeads.filter((lead) => lead.status === "submitted_unpaid").length}
        />
        <Stat
          label="Open signup drafts"
          value={signupLeads.filter((lead) => lead.status !== "submitted_unpaid").length}
        />
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-xl font-black">Fictional signup pipeline</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Step 4 records incomplete, abandoned, and submitted-but-unpaid
            signups here. No row represents a paid or active customer.
          </p>
        </div>

        {!signupResult.available ? (
          <div className="m-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">
            The Step 4 signup table is not available in this hosted staging
            database yet. Existing CRM functions remain available while the
            fictional signup migration is pending.
          </div>
        ) : signupLeads.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">
            No fictional signup drafts have been saved yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Status",
                    "Fictional customer",
                    "Plan / bins",
                    "Collection",
                    "Discount",
                    "Return / safety",
                    "Estimate",
                    "Last activity",
                  ].map((heading) => (
                    <th className="p-3" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signupLeads.map((lead) => (
                  <tr key={lead.id} className="border-t align-top">
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-black uppercase tracking-wide ${
                          lead.status === "submitted_unpaid"
                            ? "bg-emerald-100 text-emerald-900"
                            : lead.status === "abandoned"
                              ? "bg-amber-100 text-amber-950"
                              : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {lead.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-black">{lead.full_name || "Incomplete name"}</p>
                      <p className="mt-1 text-xs text-zinc-600">{lead.email || "No email"}</p>
                      <p className="text-xs text-zinc-600">{lead.phone || "No phone"}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {[lead.line1, lead.city, lead.region, lead.postal_code]
                          .filter(Boolean)
                          .join(", ") || "Address incomplete"}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-bold">{lead.plan_id || "Plan incomplete"}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {lead.bin_count} total · {lead.bin_streams?.trash ?? 0} trash · {lead.bin_streams?.recycling ?? 0} recycling · {lead.bin_streams?.other ?? 0} other
                      </p>
                    </td>
                    <td className="p-3">
                      <p>Trash: {lead.trash_weekday == null ? "—" : days[lead.trash_weekday]}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Recycling: {lead.recycling_weekday == null ? "—" : days[lead.recycling_weekday]}
                        {lead.recycling_frequency_weeks ? ` · every ${lead.recycling_frequency_weeks} week${lead.recycling_frequency_weeks === 1 ? "" : "s"}` : ""}
                      </p>
                      <p className="text-xs text-zinc-600">
                        Anchor: {lead.recycling_anchor_collection_date || "—"}
                      </p>
                    </td>
                    <td className="p-3">
                      <p>{lead.promo_code ? `Promo ${lead.promo_code}` : lead.referral_code ? `Referral ${lead.referral_code}` : "None"}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {lead.discount_kind} · {lead.discount_status}
                      </p>
                    </td>
                    <td className="max-w-64 p-3">
                      <p className="font-semibold">{lead.preferred_return_location || "Return location incomplete"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600">
                        {[lead.access_instructions, lead.gate_information, lead.animal_warning, lead.safety_notes]
                          .filter(Boolean)
                          .join(" · ") || "No access or safety details yet"}
                      </p>
                    </td>
                    <td className="p-3 font-bold">
                      {lead.estimated_first_charge_cents == null
                        ? "Pending"
                        : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}
                      <p className="mt-1 text-xs font-normal text-zinc-600">Unpaid</p>
                    </td>
                    <td className="p-3">
                      {displayDate(lead.last_activity_at)}
                      <p className="mt-1 text-xs text-zinc-600">
                        Submitted: {displayDate(lead.submitted_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mt-6 overflow-hidden">
        <form className="grid gap-2 border-b p-5 sm:grid-cols-3 lg:grid-cols-6">
          <input
            aria-label="Search customers"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search name"
            className="rounded-lg border p-2"
          />
          <select name="plan" defaultValue={searchParams.plan}>
            <option value="">All plans</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="twice-yearly">Twice a Year</option>
            <option value="one-time">One-Time</option>
          </select>
          <select name="status" defaultValue={searchParams.status}>
            <option value="">All statuses</option>
            <option>active</option>
            <option>pending_review</option>
          </select>
          <input
            name="municipality"
            defaultValue={searchParams.municipality}
            placeholder="Municipality"
            className="rounded-lg border p-2"
          />
          <select name="pickup" defaultValue={searchParams.pickup}>
            <option value="">All pickup days</option>
            {days.map((day, index) => (
              <option value={index} key={day}>
                {day}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-brand-700 p-2 font-bold text-white">
            Filter
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr>
                {["Customer", "Status", "Plan", "Municipality", "Pickup", "Cleaning"].map(
                  (heading) => (
                    <th className="p-3" key={heading}>
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const address = customer.service_addresses[0];
                const pickup = address?.trash_pickup_schedules[0];
                return (
                  <tr key={customer.id} className="border-t">
                    <td className="p-3">
                      <Link href={`/bin-cleaning/crm/customers/${customer.id}`}>
                        {customer.full_name}
                      </Link>
                    </td>
                    <td>{customer.account_status}</td>
                    <td>
                      {customer.subscriptions[0]?.service_plan_versions.service_plans.display_name}
                    </td>
                    <td>{address?.municipalities?.name}</td>
                    <td>
                      {pickup?.weekday == null ? "Unverified" : days[pickup.weekday]}
                    </td>
                    <td>
                      {pickup?.cleaning_day_assignments[0]
                        ? days[pickup.cleaning_day_assignments[0].normal_weekday]
                        : "Pending"}
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
