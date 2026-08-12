import { notFound } from "next/navigation";
import { AppShell, Definition } from "@/components/bin-cleaning/AppShell";
import { customerAccountSummary } from "@/lib/bin-cleaning/customer-account-summary";
import { crmCustomer } from "@/lib/bin-cleaning/queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";
import { databaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Customer({ params }: { params: { id: string } }) {
  const customer = await crmCustomer(params.id);
  if (!customer) notFound();

  const address = customer.service_addresses[0];
  const [notes, audit, changes, bins] = await Promise.all([
    databaseRequest<{ id: string; body: string; created_at: string }[]>(
      `customer_notes?customer_id=eq.${customer.id}&select=id,body,created_at`,
    ),
    databaseRequest<
      { id: string; action: string; entity_table: string; created_at: string }[]
    >(
      `audit_events?entity_id=eq.${customer.id}&select=id,action,entity_table,created_at&order=created_at.desc`,
    ),
    databaseRequest<
      { id: string; request_type: string; status: string; created_at: string }[]
    >(
      `customer_change_requests?customer_id=eq.${customer.id}&select=id,request_type,status,created_at`,
    ),
    address
      ? databaseRequest<{ id: string }[]>(
          `bins?service_address_id=eq.${address.id}&active=eq.true&select=id`,
        )
      : Promise.resolve([]),
  ]);

  const summary = await customerAccountSummary(customer, bins.length);
  const nextCharge =
    summary.nextChargeCents == null
      ? "No recurring charge"
      : `${formatCurrency(summary.nextChargeCents)} before tax`;

  return (
    <AppShell area="Internal CRM">
      <h2 className="text-3xl font-black">{customer.full_name}</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Definition label="Contact">
              {customer.email}
              <br />
              {customer.phone}
            </Definition>
            <Definition label="Account status">{customer.account_status}</Definition>
            <Definition label="Service address">
              {address?.line1}, {address?.city}, {address?.region} {address?.postal_code}
            </Definition>
            <Definition label="Plan">
              {customer.subscriptions[0]?.service_plan_versions.service_plans.display_name ?? "None"}
            </Definition>
            <Definition label="Return/access">
              {address?.preferred_return_location} · {address?.access_instructions}
            </Definition>
            <Definition label="Safety">{address?.animal_warning ?? "None recorded"}</Definition>
          </dl>
        </section>

        <section className="card p-5">
          <h3 className="font-black">Pending staff review</h3>
          {changes.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No pending requests.</p>
          ) : (
            changes.map((change) => (
              <p className="mt-2 text-sm" key={change.id}>
                {change.request_type} · {change.status}
              </p>
            ))
          )}
        </section>
      </div>

      <section className="card mt-5 p-5">
        <h3 className="text-xl font-black">Referral & billing snapshot</h3>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Referral code">{summary.referralCode ?? "Not assigned"}</Definition>
          <Definition label="Submitted referrals">{summary.submittedReferrals}</Definition>
          <Definition label="Qualified referrals">{summary.qualifiedReferrals}</Definition>
          <Definition label="Available referral credit">
            {formatCurrency(summary.availableCreditCents)}
          </Definition>
          <Definition label={summary.nextChargeLabel}>{nextCharge}</Definition>
          <Definition label="Regular charge estimate">
            {summary.regularChargeCents == null
              ? "Not available"
              : `${formatCurrency(summary.regularChargeCents)} before tax`}
          </Definition>
          <Definition label="Credit expected on next invoice">
            {formatCurrency(summary.nextAppliedCreditCents)}
          </Definition>
          <Definition label="Bins on account">{bins.length}</Definition>
        </dl>
        <p className="mt-4 text-xs text-zinc-500">
          Submitted referrals are tracked immediately. Referral rewards do not reduce the next invoice until they qualify; only one reward may apply per invoice.
        </p>
      </section>

      <section className="card mt-5 p-5">
        <h3 className="text-xl font-black">Notes</h3>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No notes.</p>
        ) : (
          notes.map((note) => <p key={note.id}>{note.body}</p>)
        )}
      </section>

      <section className="card mt-5 p-5">
        <h3 className="text-xl font-black">Audit history</h3>
        {audit.map((entry) => (
          <p key={entry.id}>
            {entry.action} {entry.entity_table} · {entry.created_at}
          </p>
        ))}
      </section>
    </AppShell>
  );
}
