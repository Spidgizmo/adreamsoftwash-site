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

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "—";
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
            Every field collected by the Step 4 signup is shown below so the
            staging intake can be verified end to end. No row represents a paid
            or active customer.
          </p>
        </div>

        {!signupResult.available ? (
          <div className="m-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">
            The Step 4 signup table is not available in this hosted staging
            database yet.
          </div>
        ) : signupLeads.length === 0 ? (
          <p className="p-5 text-sm text-zinc-600">
            No fictional signup drafts have been saved yet.
          </p>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {signupLeads.map((lead) => (
              <details
                key={lead.id}
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
                open={signupLeads.length === 1}
              >
                <summary className="cursor-pointer list-none p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
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
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                          {lead.is_test ? "Fictional test record" : "Unexpected non-test record"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-black">
                        {lead.full_name || "Incomplete name"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {lead.plan_id || "Plan incomplete"} · {lead.bin_count} total bin{lead.bin_count === 1 ? "" : "s"} · {valueOrDash(lead.email)} · {valueOrDash(lead.phone)}
                      </p>
                    </div>
                    <div className="text-sm lg:text-right">
                      <p className="font-black">
                        {lead.estimated_first_charge_cents == null
                          ? "Estimate pending"
                          : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Last activity {displayDate(lead.last_activity_at)}
                      </p>
                    </div>
                  </div>
                </summary>

                <div className="grid gap-4 border-t bg-zinc-50 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Customer & service address</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Name</dt><dd>{valueOrDash(lead.full_name)}</dd></div>
                      <div><dt className="font-bold">Email</dt><dd>{valueOrDash(lead.email)}</dd></div>
                      <div><dt className="font-bold">Phone</dt><dd>{valueOrDash(lead.phone)}</dd></div>
                      <div><dt className="font-bold">Street</dt><dd>{valueOrDash(lead.line1)}</dd></div>
                      <div><dt className="font-bold">Unit</dt><dd>{valueOrDash(lead.line2)}</dd></div>
                      <div><dt className="font-bold">City / State / ZIP</dt><dd>{[lead.city, lead.region, lead.postal_code].filter(Boolean).join(", ") || "—"}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Plan & bins</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Plan</dt><dd>{valueOrDash(lead.plan_id)}</dd></div>
                      <div><dt className="font-bold">Total bins</dt><dd>{lead.bin_count}</dd></div>
                      <div><dt className="font-bold">Trash bins</dt><dd>{lead.bin_streams?.trash ?? 0}</dd></div>
                      <div><dt className="font-bold">Recycling bins</dt><dd>{lead.bin_streams?.recycling ?? 0}</dd></div>
                      <div><dt className="font-bold">Other carts</dt><dd>{lead.bin_streams?.other ?? 0}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Collection schedule</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Trash pickup</dt><dd>{lead.trash_weekday == null ? "—" : days[lead.trash_weekday]}</dd></div>
                      <div><dt className="font-bold">Recycling pickup</dt><dd>{lead.recycling_weekday == null ? "—" : days[lead.recycling_weekday]}</dd></div>
                      <div><dt className="font-bold">Recycling frequency</dt><dd>{lead.recycling_frequency_weeks ? `Every ${lead.recycling_frequency_weeks} week${lead.recycling_frequency_weeks === 1 ? "" : "s"}` : "—"}</dd></div>
                      <div><dt className="font-bold">Recycling anchor</dt><dd>{valueOrDash(lead.recycling_anchor_collection_date)}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Promo / referral & estimate</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Promo code</dt><dd>{valueOrDash(lead.promo_code)}</dd></div>
                      <div><dt className="font-bold">Referral code</dt><dd>{valueOrDash(lead.referral_code)}</dd></div>
                      <div><dt className="font-bold">Discount kind</dt><dd>{valueOrDash(lead.discount_kind)}</dd></div>
                      <div><dt className="font-bold">Discount status</dt><dd>{valueOrDash(lead.discount_status)}</dd></div>
                      <div><dt className="font-bold">Regular subtotal</dt><dd>{lead.estimated_subtotal_cents == null ? "—" : formatCurrency(lead.estimated_subtotal_cents)}</dd></div>
                      <div><dt className="font-bold">Discount</dt><dd>{formatCurrency(lead.estimated_discount_cents)}</dd></div>
                      <div><dt className="font-bold">Estimated first charge</dt><dd>{lead.estimated_first_charge_cents == null ? "—" : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Return, access & safety</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Return location</dt><dd>{valueOrDash(lead.preferred_return_location)}</dd></div>
                      <div><dt className="font-bold">Access instructions</dt><dd className="whitespace-pre-wrap">{valueOrDash(lead.access_instructions)}</dd></div>
                      <div><dt className="font-bold">Gate information</dt><dd className="whitespace-pre-wrap">{valueOrDash(lead.gate_information)}</dd></div>
                      <div><dt className="font-bold">Animal warning</dt><dd className="whitespace-pre-wrap">{valueOrDash(lead.animal_warning)}</dd></div>
                      <div><dt className="font-bold">Safety notes</dt><dd className="whitespace-pre-wrap">{valueOrDash(lead.safety_notes)}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <h4 className="font-black">Contact permissions & tracking</h4>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div><dt className="font-bold">Email allowed</dt><dd>{yesNo(lead.email_allowed)}</dd></div>
                      <div><dt className="font-bold">SMS allowed</dt><dd>{yesNo(lead.sms_allowed)}</dd></div>
                      <div><dt className="font-bold">Phone allowed</dt><dd>{yesNo(lead.phone_allowed)}</dd></div>
                      <div><dt className="font-bold">Terms accepted</dt><dd>{yesNo(lead.terms_accepted)}</dd></div>
                      <div><dt className="font-bold">Source</dt><dd className="break-all">{valueOrDash(lead.source_path)}</dd></div>
                      <div><dt className="font-bold">Created</dt><dd>{displayDate(lead.created_at)}</dd></div>
                      <div><dt className="font-bold">Updated</dt><dd>{displayDate(lead.updated_at)}</dd></div>
                      <div><dt className="font-bold">Submitted</dt><dd>{displayDate(lead.submitted_at)}</dd></div>
                      <div><dt className="font-bold">Payment</dt><dd>Unpaid — Stripe disabled</dd></div>
                    </dl>
                  </div>
                </div>
              </details>
            ))}
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
