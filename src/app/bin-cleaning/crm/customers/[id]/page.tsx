import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, Definition } from "@/components/bin-cleaning/AppShell";
import { customerAccountSummary } from "@/lib/bin-cleaning/customer-account-summary";
import { crmCustomer } from "@/lib/bin-cleaning/queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";
import { databaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function displayDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}
function requestedText(value: Record<string, unknown> | null) {
  if (!value) return "No details supplied";
  if (typeof value.value === "string") return value.value;
  return Object.entries(value).map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`).join(" · ");
}

export default async function Customer({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; error?: string; reviewed?: string } }) {
  const customer = await crmCustomer(params.id);
  if (!customer) notFound();
  const address = customer.service_addresses[0];
  const [notes, audit, changes, bins] = await Promise.all([
    databaseRequest<{ id: string; body: string; created_at: string }[]>(`customer_notes?customer_id=eq.${customer.id}&select=id,body,created_at&order=created_at.desc`),
    databaseRequest<{ id: string; action: string; entity_table: string; created_at: string }[]>(`audit_events?entity_id=eq.${customer.id}&select=id,action,entity_table,created_at&order=created_at.desc&limit=50`),
    databaseRequest<{ id: string; request_type: string; requested_value: Record<string, unknown> | null; status: string; created_at: string }[]>(`customer_change_requests?customer_id=eq.${customer.id}&select=id,request_type,requested_value,status,created_at&order=created_at.desc`),
    address ? databaseRequest<{ id: string; collection_stream: "trash" | "recycling" | "other" }[]>(`bins?service_address_id=eq.${address.id}&active=eq.true&select=id,collection_stream`) : Promise.resolve([]),
  ]);
  const summary = await customerAccountSummary(customer, bins.length);
  const nextCharge = summary.nextChargeCents == null ? "No recurring charge" : `${formatCurrency(summary.nextChargeCents)} before tax`;
  const trashCount = bins.filter((bin) => bin.collection_stream === "trash").length;
  const recyclingCount = bins.filter((bin) => bin.collection_stream === "recycling").length;
  const trashSchedule = address?.trash_pickup_schedules[0];
  const recyclingSchedule = address?.recycling_pickup_schedules[0];
  const subscription = customer.subscriptions[0];
  const pendingChanges = changes.filter((change) => change.status === "pending_staff_review");

  return (
    <AppShell area="Internal CRM">
      <h2 className="text-3xl font-black">{customer.full_name}</h2>
      {searchParams.saved && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Customer record updated.</p>}
      {searchParams.reviewed && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Customer request {searchParams.reviewed} and retained in activity history.</p>}
      {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-900">Customer update needs correction.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Definition label="Contact">{customer.email}<br />{customer.phone}</Definition>
            <Definition label="Account status">{customer.account_status}</Definition>
            <Definition label="Service address">{address?.line1}, {address?.city}, {address?.region} {address?.postal_code}</Definition>
            <Definition label="Plan">{subscription?.service_plan_versions.service_plans.display_name ?? "None"}</Definition>
            <Definition label="Return/access">{address?.preferred_return_location} · {address?.access_instructions}</Definition>
            <Definition label="Safety">{address?.animal_warning ?? "None recorded"}</Definition>
            <Definition label="Last portal activity">{displayDate(customer.last_portal_activity_at)}</Definition>
            <Definition label="Last portal login">{displayDate(customer.last_portal_login_at)}</Definition>
          </dl>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-black">Pending staff review</h3><Link href="/bin-cleaning/crm/activity" className="text-xs font-bold text-brand-700 underline">History</Link></div>
          {pendingChanges.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No pending requests.</p> : pendingChanges.map((change) => (
            <div className="mt-4 border-t pt-4" key={change.id}>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{change.request_type.replaceAll("_", " ")}</p>
              <p className="mt-1 text-sm"><strong>Requested:</strong> {requestedText(change.requested_value)}</p>
              <p className="mt-1 text-xs text-zinc-500">{displayDate(change.created_at)}</p>
              <form action="/api/bin-cleaning/crm/change-request-review" method="post" className="mt-3 flex gap-2">
                <input type="hidden" name="request_id" value={change.id} />
                <input type="hidden" name="customer_id" value={customer.id} />
                <button name="action" value="approve" className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Approve</button>
                <button name="action" value="reject" className="rounded-lg border border-red-300 px-3 py-2 text-xs font-black text-red-800">Reject</button>
              </form>
            </div>
          ))}
        </section>
      </div>

      <section className="card mt-5 p-5">
        <h3 className="text-xl font-black">Referral & billing snapshot</h3>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Referral code">{summary.referralCode ?? "Not assigned"}</Definition>
          <Definition label="Submitted referrals">{summary.submittedReferrals}</Definition>
          <Definition label="Qualified referrals">{summary.qualifiedReferrals}</Definition>
          <Definition label="Available referral credit">{formatCurrency(summary.availableCreditCents)}</Definition>
          <Definition label={summary.nextChargeLabel}>{nextCharge}</Definition>
          <Definition label="Regular charge estimate">{summary.regularChargeCents == null ? "Not available" : `${formatCurrency(summary.regularChargeCents)} before tax`}</Definition>
          <Definition label="Credit expected on next invoice">{formatCurrency(summary.nextAppliedCreditCents)}</Definition>
          <Definition label="Bins on account">{bins.length}</Definition>
        </dl>
      </section>

      <section className="card mt-5 p-5">
        <h3 className="text-xl font-black">Admin edit customer</h3>
        <p className="mt-1 text-sm text-zinc-600">Staff can correct customer details, plan, bin counts, pickup information, return/access instructions, and add internal notes. This staging form never collects payment.</p>
        <form action="/api/bin-cleaning/crm/customer-update" method="post" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="customer_id" value={customer.id} />
          <input type="hidden" name="address_id" value={address?.id ?? ""} />
          <input type="hidden" name="subscription_id" value={subscription?.id ?? ""} />
          <label className="font-semibold">Name<input required name="full_name" defaultValue={customer.full_name} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Email<input required type="email" name="email" defaultValue={customer.email} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Phone<input name="phone" defaultValue={customer.phone ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Account status<select name="account_status" defaultValue={customer.account_status} className="mt-1 w-full rounded-lg border p-3"><option value="active">Active</option><option value="test_pending">Pending</option><option value="inactive">Inactive</option><option value="deactivated">Deactivated</option></select></label>
          <label className="font-semibold">Plan<select name="plan_id" defaultValue={subscription?.service_plan_versions.service_plans.id ?? "monthly"} className="mt-1 w-full rounded-lg border p-3"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select></label>
          <label className="font-semibold">Street<input required name="line1" defaultValue={address?.line1 ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Unit<input name="line2" defaultValue={address?.line2 ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">City<input required name="city" defaultValue={address?.city ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">State<input required name="region" maxLength={2} defaultValue={address?.region ?? "OH"} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">ZIP<input required name="postal_code" defaultValue={address?.postal_code ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Trash bins<input type="number" min="0" max="20" name="trash_bins" defaultValue={trashCount} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Recycling bins<input type="number" min="0" max="20" name="recycling_bins" defaultValue={recyclingCount} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Trash pickup<select name="trash_weekday" defaultValue={trashSchedule?.weekday ?? 0} className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling pickup<select name="recycling_weekday" defaultValue={recyclingSchedule?.weekday ?? 0} className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling frequency<select name="recycling_frequency_weeks" defaultValue={recyclingSchedule?.frequency_weeks ?? 2} className="mt-1 w-full rounded-lg border p-3"><option value="1">Every week</option><option value="2">Every other week</option></select></label>
          <label className="font-semibold">Recycling anchor<input type="date" name="recycling_anchor_collection_date" defaultValue={recyclingSchedule?.anchor_collection_date ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold lg:col-span-2">Return location<input name="preferred_return_location" defaultValue={address?.preferred_return_location ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold lg:col-span-3">Access instructions<textarea name="access_instructions" defaultValue={address?.access_instructions ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Gate information<input name="gate_information" defaultValue={address?.gate_information ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Animal warning<input name="animal_warning" defaultValue={address?.animal_warning ?? ""} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold lg:col-span-3">Add staff-only note<textarea name="staff_note" placeholder="Add a new internal note; existing notes are preserved below." className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm lg:col-span-3"><strong>Payment controls are intentionally unavailable here.</strong> Stripe is still disabled in staging; payment activation remains a later approved launch step.</div>
          <button className="rounded-xl bg-brand-700 p-3 font-black text-white lg:col-span-3">Save admin changes</button>
        </form>
      </section>

      <section className="card mt-5 p-5"><h3 className="text-xl font-black">Staff notes</h3>{notes.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No notes.</p> : notes.map((note) => <div key={note.id} className="mt-3 border-t pt-3"><p>{note.body}</p><p className="text-xs text-zinc-500">{displayDate(note.created_at)}</p></div>)}</section>
      <section className="card mt-5 p-5"><h3 className="text-xl font-black">Customer request history</h3>{changes.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No customer requests.</p> : changes.map((change) => <div key={change.id} className="mt-3 border-t pt-3"><p className="font-bold capitalize">{change.request_type.replaceAll("_", " ")} · {change.status.replaceAll("_", " ")}</p><p className="text-sm">{requestedText(change.requested_value)}</p><p className="text-xs text-zinc-500">{displayDate(change.created_at)}</p></div>)}</section>
      <section className="card mt-5 p-5"><h3 className="text-xl font-black">Audit history</h3>{audit.map((entry) => <p key={entry.id}>{entry.action} {entry.entity_table} · {displayDate(entry.created_at)}</p>)}</section>
    </AppShell>
  );
}
