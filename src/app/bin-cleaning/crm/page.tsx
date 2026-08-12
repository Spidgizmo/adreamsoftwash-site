import Link from "next/link";
import { AppShell, Stat } from "@/components/bin-cleaning/AppShell";
import { ReferralNotifications } from "@/components/bin-cleaning/ReferralNotifications";
import { crmCustomers } from "@/lib/bin-cleaning/queries";
import { crmSignupLeads } from "@/lib/bin-cleaning/signup-queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";
import { databaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type PendingChange = {
  id: string;
  customer_id: string;
  request_type: string;
  requested_value: Record<string, unknown> | null;
  status: string;
  created_at: string;
  customers: { full_name: string } | null;
};

type RecentBinChange = {
  id: string;
  customer_id: string;
  old_trash_bin_count: number;
  old_recycling_bin_count: number;
  new_trash_bin_count: number;
  new_recycling_bin_count: number;
  old_recurring_price_cents: number | null;
  new_recurring_price_cents: number | null;
  billing_effective_policy: string;
  requested_at: string;
  status: string;
  customers: { full_name: string } | null;
};

function displayDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}
function signupDiscount(lead: Awaited<ReturnType<typeof crmSignupLeads>>["leads"][number]) {
  if (lead.referral_code) return `Referral ${lead.referral_code}`;
  if (lead.promo_code) return `Promo ${lead.promo_code}`;
  return "None";
}
function requestedText(value: Record<string, unknown> | null) {
  if (!value) return "No details supplied";
  if (typeof value.value === "string") return value.value;
  return Object.entries(value).map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`).join(" · ");
}
function customerEstimate(customer: Awaited<ReturnType<typeof crmCustomers>>[number], binCount: number) {
  const version = customer.subscriptions[0]?.service_plan_versions;
  if (!version || version.base_price_cents == null) return "Pending";
  const included = Math.max(0, version.bins_included ?? 1);
  const extra = Math.max(0, binCount - included);
  return `${formatCurrency(version.base_price_cents + extra * Math.max(0, version.additional_bin_price_cents ?? 0))} before tax`;
}
function binSummary(trash: number, recycling: number) {
  return `${trash} trash + ${recycling} recycling`;
}

export default async function CRM({ searchParams }: { searchParams: { q?: string; plan?: string; status?: string; municipality?: string; pickup?: string } }) {
  const [customers, signupResult, pendingChanges, recentBinChanges] = await Promise.all([
    crmCustomers(searchParams),
    crmSignupLeads(),
    databaseRequest<PendingChange[]>("customer_change_requests?status=eq.pending_staff_review&select=id,customer_id,request_type,requested_value,status,created_at,customers(full_name)&order=created_at.desc&limit=25").catch(() => []),
    databaseRequest<RecentBinChange[]>("customer_bin_change_requests?select=id,customer_id,old_trash_bin_count,old_recycling_bin_count,new_trash_bin_count,new_recycling_bin_count,old_recurring_price_cents,new_recurring_price_cents,billing_effective_policy,requested_at,status,customers(full_name)&order=requested_at.desc&limit=10").catch(() => []),
  ]);
  const signupLeads = signupResult.leads;
  const referralNotifications = signupLeads.filter((lead) => lead.status === "submitted_unpaid" && Boolean(lead.referral_code)).map((lead) => ({ id: lead.id, customerName: lead.full_name || "Incomplete name", referralCode: lead.referral_code || "Referral", submittedAt: lead.submitted_at || lead.last_activity_at }));

  return (
    <AppShell area="Internal CRM">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Customer intake, account activity, routing basics, and unpaid staging signups.</p>
        <Link href="/bin-cleaning/crm/customers/new" className="rounded-xl bg-brand-700 px-4 py-2 font-black text-white hover:bg-brand-800 hover:text-white">+ Add customer manually</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Matching test customers" value={customers.length} />
        <Stat label="Unverified pickup" value={customers.filter((customer) => customer.service_addresses.some((address) => address.trash_pickup_schedules.some((pickup) => pickup.weekday == null))).length} />
        <Stat label="Submitted unpaid" value={signupLeads.filter((lead) => lead.status === "submitted_unpaid").length} />
        <Stat label="Open signup drafts" value={signupLeads.filter((lead) => lead.status !== "submitted_unpaid").length} />
        <Stat label="Pending customer requests" value={pendingChanges.length} alert={pendingChanges.length > 0} />
      </div>

      {pendingChanges.length > 0 && (
        <section className="card mt-6 overflow-hidden border-amber-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div><h2 className="text-xl font-black">Customer requests needing attention</h2><p className="mt-1 text-sm text-zinc-600">These stay in the permanent activity log even after they are reviewed.</p></div>
            <Link href="/bin-cleaning/crm/activity" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-black text-white">Open messages & notes</Link>
          </div>
          <div className="divide-y">
            {pendingChanges.slice(0, 5).map((change) => (
              <div className="grid gap-1 p-4 md:grid-cols-[1.2fr_1fr_2fr_auto] md:items-center" key={change.id}>
                <Link className="font-black text-brand-700" href={`/bin-cleaning/crm/customers/${change.customer_id}`}>{change.customers?.full_name ?? "Customer"}</Link>
                <span className="text-sm font-semibold capitalize">{change.request_type.replaceAll("_", " ")}</span>
                <span className="text-sm">Requested: <strong>{requestedText(change.requested_value)}</strong></span>
                <span className="text-xs text-zinc-500">{displayDate(change.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentBinChanges.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-xl font-black">Recent automatic account changes</h2>
              <p className="mt-1 text-sm text-zinc-600">Bin additions and removals do not need approval, but ADS is notified here and the full history is kept permanently.</p>
            </div>
            <Link href="/bin-cleaning/crm/activity" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-black text-white">Open full history</Link>
          </div>
          <div className="divide-y">
            {recentBinChanges.slice(0, 5).map((change) => (
              <div className="grid gap-1 p-4 md:grid-cols-[1.2fr_2fr_1fr_auto] md:items-center" key={change.id}>
                <Link className="font-black text-brand-700" href={`/bin-cleaning/crm/customers/${change.customer_id}`}>{change.customers?.full_name ?? "Customer"}</Link>
                <span className="text-sm"><strong>{binSummary(change.old_trash_bin_count, change.old_recycling_bin_count)}</strong> → <strong>{binSummary(change.new_trash_bin_count, change.new_recycling_bin_count)}</strong></span>
                <span className="text-sm font-semibold">{change.old_recurring_price_cents == null || change.new_recurring_price_cents == null ? "Price history saved" : `${formatCurrency(change.old_recurring_price_cents)} → ${formatCurrency(change.new_recurring_price_cents)}`}<span className="block text-xs font-normal text-zinc-500">Billing: {change.billing_effective_policy.replaceAll("_", " ")}</span></span>
                <span className="text-xs text-zinc-500">{displayDate(change.requested_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ReferralNotifications referrals={referralNotifications} />

      <section className="card mt-6 overflow-hidden">
        <div className="border-b p-5"><h2 className="text-xl font-black">Fictional signup pipeline</h2><p className="mt-1 text-sm text-zinc-600">Compact intake list. Click a customer name to open every saved signup field. No signup shown here is paid or active.</p></div>
        {!signupResult.available ? <div className="m-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">The Step 4 signup table is not available in this hosted staging database yet.</div> : signupLeads.length === 0 ? <p className="p-5 text-sm text-zinc-600">No fictional signup drafts have been saved yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr>{["Customer", "Status", "Plan", "Bins", "Pickup", "Discount", "Estimate", "Last activity"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{signupLeads.map((lead) => <tr key={lead.id} className="border-t align-middle hover:bg-zinc-50"><td className="p-3"><Link className="font-black text-brand-700 underline-offset-2 hover:underline" href={`/bin-cleaning/crm/signups/${lead.id}`}>{lead.full_name || "Incomplete name"}</Link><p className="mt-1 text-xs text-zinc-500">{lead.email || "No email yet"}</p></td><td className="p-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-black uppercase tracking-wide ${lead.status === "submitted_unpaid" ? "bg-emerald-100 text-emerald-900" : lead.status === "abandoned" ? "bg-amber-100 text-amber-950" : "bg-blue-100 text-blue-900"}`}>{lead.status.replaceAll("_", " ")}</span></td><td className="p-3 capitalize">{lead.plan_id || "—"}</td><td className="p-3"><strong>{lead.bin_count}</strong><span className="ml-1 text-xs text-zinc-500">({lead.bin_streams?.trash ?? 0}T/{lead.bin_streams?.recycling ?? 0}R)</span></td><td className="p-3">{lead.trash_weekday == null ? "—" : days[lead.trash_weekday]}</td><td className="p-3">{signupDiscount(lead)}</td><td className="p-3 font-bold">{lead.estimated_first_charge_cents == null ? "Pending" : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}</td><td className="p-3">{displayDate(lead.last_activity_at)}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b p-5"><h2 className="text-xl font-black">Customers</h2><p className="mt-1 text-sm text-zinc-600">Uses the same quick-scan columns as signup intake. Last activity is portal activity, not an admin view.</p></div>
        <form className="grid gap-2 border-b p-5 sm:grid-cols-3 lg:grid-cols-6">
          <input aria-label="Search customers" name="q" defaultValue={searchParams.q} placeholder="Search name" className="rounded-lg border p-2" />
          <select name="plan" defaultValue={searchParams.plan}><option value="">All plans</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select>
          <select name="status" defaultValue={searchParams.status}><option value="">All statuses</option><option>active</option><option>pending_review</option></select>
          <input name="municipality" defaultValue={searchParams.municipality} placeholder="Municipality" className="rounded-lg border p-2" />
          <select name="pickup" defaultValue={searchParams.pickup}><option value="">All pickup days</option>{days.map((day, index) => <option value={index} key={day}>{day}</option>)}</select>
          <button className="rounded-lg bg-brand-700 p-2 font-bold text-white">Filter</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr>{["Customer", "Status", "Plan", "Bins", "Pickup", "Discount", "Estimate", "Last activity"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{customers.map((customer) => { const address = customer.service_addresses[0]; const pickup = address?.trash_pickup_schedules[0]; const activeBins = (address?.bins ?? []).filter((bin) => bin.active); const trash = activeBins.filter((bin) => bin.collection_stream === "trash").length; const recycling = activeBins.filter((bin) => bin.collection_stream === "recycling").length; const plan = customer.subscriptions[0]?.service_plan_versions.service_plans.display_name ?? "—"; return <tr key={customer.id} className="border-t align-middle hover:bg-zinc-50"><td className="p-3"><Link className="font-black text-brand-700" href={`/bin-cleaning/crm/customers/${customer.id}`}>{customer.full_name}</Link><p className="mt-1 text-xs text-zinc-500">{customer.email}</p></td><td className="p-3"><span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-emerald-900">{customer.account_status.replaceAll("_", " ")}</span></td><td className="p-3">{plan}</td><td className="p-3"><strong>{activeBins.length}</strong><span className="ml-1 text-xs text-zinc-500">({trash}T/{recycling}R)</span></td><td className="p-3">{pickup?.weekday == null ? "Unverified" : days[pickup.weekday]}</td><td className="p-3">See account</td><td className="p-3 font-bold">{customerEstimate(customer, activeBins.length)}</td><td className="p-3"><strong>{displayDate(customer.last_portal_activity_at)}</strong>{customer.last_portal_login_at && <span className="block text-xs text-zinc-500">Last login {displayDate(customer.last_portal_login_at)}</span>}</td></tr>; })}</tbody></table></div>
      </section>
    </AppShell>
  );
}
