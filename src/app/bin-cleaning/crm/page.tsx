import Link from "next/link";
import { AppShell, Stat } from "@/components/bin-cleaning/AppShell";
import { ReferralNotifications } from "@/components/bin-cleaning/ReferralNotifications";
import { crmCustomers } from "@/lib/bin-cleaning/queries";
import { crmSignupLeads } from "@/lib/bin-cleaning/signup-queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";

export const dynamic = "force-dynamic";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function displayDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}
function signupDiscount(lead: Awaited<ReturnType<typeof crmSignupLeads>>["leads"][number]) {
  if (lead.referral_code) return `Referral ${lead.referral_code}`;
  if (lead.promo_code) return `Promo ${lead.promo_code}`;
  return "None";
}

export default async function CRM({ searchParams }: { searchParams: { q?: string; plan?: string; status?: string; municipality?: string; pickup?: string } }) {
  const [customers, signupResult] = await Promise.all([crmCustomers(searchParams), crmSignupLeads()]);
  const signupLeads = signupResult.leads;
  const referralNotifications = signupLeads.filter((lead) => lead.status === "submitted_unpaid" && Boolean(lead.referral_code)).map((lead) => ({ id: lead.id, customerName: lead.full_name || "Incomplete name", referralCode: lead.referral_code || "Referral", submittedAt: lead.submitted_at || lead.last_activity_at }));

  return (
    <AppShell area="Internal CRM">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Customer intake, account activity, routing basics, and unpaid staging signups.</p>
        <Link href="/bin-cleaning/crm/customers/new" className="rounded-xl bg-brand-700 px-4 py-2 font-black text-white hover:bg-brand-800 hover:text-white">+ Add customer manually</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Matching test customers" value={customers.length} />
        <Stat label="Unverified pickup" value={customers.filter((customer) => customer.service_addresses.some((address) => address.trash_pickup_schedules.some((pickup) => pickup.weekday == null))).length} />
        <Stat label="Submitted unpaid" value={signupLeads.filter((lead) => lead.status === "submitted_unpaid").length} />
        <Stat label="Open signup drafts" value={signupLeads.filter((lead) => lead.status !== "submitted_unpaid").length} />
      </div>

      <ReferralNotifications referrals={referralNotifications} />

      <section className="card mt-6 overflow-hidden">
        <div className="border-b p-5"><h2 className="text-xl font-black">Fictional signup pipeline</h2><p className="mt-1 text-sm text-zinc-600">Compact intake list. Click a customer name to open every saved signup field. No signup shown here is paid or active.</p></div>
        {!signupResult.available ? <div className="m-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">The Step 4 signup table is not available in this hosted staging database yet.</div> : signupLeads.length === 0 ? <p className="p-5 text-sm text-zinc-600">No fictional signup drafts have been saved yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr>{["Customer", "Status", "Plan", "Bins", "Pickup", "Discount", "Estimate", "Last activity"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{signupLeads.map((lead) => <tr key={lead.id} className="border-t align-middle hover:bg-zinc-50"><td className="p-3"><Link className="font-black text-brand-700 underline-offset-2 hover:underline" href={`/bin-cleaning/crm/signups/${lead.id}`}>{lead.full_name || "Incomplete name"}</Link><p className="mt-1 text-xs text-zinc-500">{lead.email || "No email yet"}</p></td><td className="p-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-black uppercase tracking-wide ${lead.status === "submitted_unpaid" ? "bg-emerald-100 text-emerald-900" : lead.status === "abandoned" ? "bg-amber-100 text-amber-950" : "bg-blue-100 text-blue-900"}`}>{lead.status.replaceAll("_", " ")}</span></td><td className="p-3 capitalize">{lead.plan_id || "—"}</td><td className="p-3"><strong>{lead.bin_count}</strong><span className="ml-1 text-xs text-zinc-500">({lead.bin_streams?.trash ?? 0}T/{lead.bin_streams?.recycling ?? 0}R)</span></td><td className="p-3">{lead.trash_weekday == null ? "—" : days[lead.trash_weekday]}</td><td className="p-3">{signupDiscount(lead)}</td><td className="p-3 font-bold">{lead.estimated_first_charge_cents == null ? "Pending" : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}</td><td className="p-3">{displayDate(lead.last_activity_at)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b p-5"><h2 className="text-xl font-black">Customers</h2><p className="mt-1 text-sm text-zinc-600">Last portal activity shows whether the customer is actually signing in and using the portal.</p></div>
        <form className="grid gap-2 border-b p-5 sm:grid-cols-3 lg:grid-cols-6">
          <input aria-label="Search customers" name="q" defaultValue={searchParams.q} placeholder="Search name" className="rounded-lg border p-2" />
          <select name="plan" defaultValue={searchParams.plan}><option value="">All plans</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select>
          <select name="status" defaultValue={searchParams.status}><option value="">All statuses</option><option>active</option><option>pending_review</option></select>
          <input name="municipality" defaultValue={searchParams.municipality} placeholder="Municipality" className="rounded-lg border p-2" />
          <select name="pickup" defaultValue={searchParams.pickup}><option value="">All pickup days</option>{days.map((day, index) => <option value={index} key={day}>{day}</option>)}</select>
          <button className="rounded-lg bg-brand-700 p-2 font-bold text-white">Filter</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr>{["Customer", "Status", "Plan", "Municipality", "Pickup", "Cleaning", "Last portal activity"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{customers.map((customer) => { const address = customer.service_addresses[0]; const pickup = address?.trash_pickup_schedules[0]; return <tr key={customer.id} className="border-t"><td className="p-3"><Link className="font-bold" href={`/bin-cleaning/crm/customers/${customer.id}`}>{customer.full_name}</Link></td><td>{customer.account_status}</td><td>{customer.subscriptions[0]?.service_plan_versions.service_plans.display_name}</td><td>{address?.municipalities?.name}</td><td>{pickup?.weekday == null ? "Unverified" : days[pickup.weekday]}</td><td>{pickup?.cleaning_day_assignments[0] ? days[pickup.cleaning_day_assignments[0].normal_weekday] : "Pending"}</td><td className="p-3"><strong>{displayDate(customer.last_portal_activity_at)}</strong>{customer.last_portal_login_at && <span className="block text-xs text-zinc-500">Last login {displayDate(customer.last_portal_login_at)}</span>}</td></tr>; })}</tbody></table></div>
      </section>
    </AppShell>
  );
}
