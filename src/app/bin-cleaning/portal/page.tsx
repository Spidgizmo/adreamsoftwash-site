import {
  AppShell,
  Definition,
  Stat,
} from "@/components/bin-cleaning/AppShell";
import { ManageBinsForm } from "@/components/bin-cleaning/ManageBinsForm";
import { ReferralShare } from "@/components/bin-cleaning/ReferralShare";
import { customerAccountSummary } from "@/lib/bin-cleaning/customer-account-summary";
import { portalCustomer } from "@/lib/bin-cleaning/queries";
import { databaseRequest } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/bin-cleaning-plans";
import { RECYCLING_ALIGNMENT_EXPLANATION } from "@/lib/bin-cleaning/scheduling";

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

function cadenceLabel(frequencyWeeks: number) {
  return frequencyWeeks === 1
    ? "every week"
    : frequencyWeeks === 2
      ? "every other week"
      : `every ${frequencyWeeks} weeks`;
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { saved?: string; bins?: string };
}) {
  const customer = await portalCustomer();
  const address = customer.service_addresses[0];
  const trashSchedule = address?.trash_pickup_schedules[0];
  const recyclingSchedule = address?.recycling_pickup_schedules[0];
  const subscription = customer.subscriptions[0];

  const bins = await databaseRequest<
    {
      id: string;
      identifier: string | null;
      description: string | null;
      collection_stream: "trash" | "recycling" | "other";
      dirty_this_visit: boolean;
    }[]
  >(
    `bins?service_address_id=eq.${address.id}&active=eq.true&select=id,identifier,description,collection_stream,dirty_this_visit`,
  );

  const currentBinConfiguration = (
    await databaseRequest<
      {
        id: string;
        trash_bin_count: number;
        recycling_bin_count: number;
        recurring_price_cents: number | null;
        effective_service_at: string;
      }[]
    >(
      `customer_bin_configurations?customer_id=eq.${customer.id}&service_address_id=eq.${address.id}&effective_service_at=lte.${encodeURIComponent(new Date().toISOString())}&select=id,trash_bin_count,recycling_bin_count,recurring_price_cents,effective_service_at&order=effective_service_at.desc,created_at.desc&limit=1`,
    ).catch(() => [])
  )[0];
  const currentTrashBins =
    currentBinConfiguration?.trash_bin_count ??
    bins.filter((bin) => bin.collection_stream !== "recycling").length;
  const currentRecyclingBins =
    currentBinConfiguration?.recycling_bin_count ??
    bins.filter((bin) => bin.collection_stream === "recycling").length;
  const currentTotalBins = currentTrashBins + currentRecyclingBins;

  const binChanges = await databaseRequest<
    {
      id: string;
      old_trash_bin_count: number;
      old_recycling_bin_count: number;
      new_trash_bin_count: number;
      new_recycling_bin_count: number;
      old_recurring_price_cents: number | null;
      new_recurring_price_cents: number | null;
      requested_at: string;
      service_effective_at: string;
      billing_effective_policy: string;
      locked_visit_id: string | null;
      status: string;
    }[]
  >(
    `customer_bin_change_requests?customer_id=eq.${customer.id}&select=id,old_trash_bin_count,old_recycling_bin_count,new_trash_bin_count,new_recycling_bin_count,old_recurring_price_cents,new_recurring_price_cents,requested_at,service_effective_at,billing_effective_policy,locked_visit_id,status&order=requested_at.desc&limit=12`,
  ).catch(() => []);

  const accountSummary = await customerAccountSummary(
    customer,
    currentTotalBins,
  );

  const preferences = (
    await databaseRequest<
      {
        email_allowed: boolean;
        sms_allowed: boolean;
        phone_allowed: boolean;
      }[]
    >(
      `customer_contact_preferences?customer_id=eq.${customer.id}&select=email_allowed,sms_allowed,phone_allowed`,
    )
  )[0];

  const visits = await databaseRequest<
    {
      id: string;
      status: string;
      scheduled_for: string | null;
      visit_photographs: { kind: string; storage_path: string }[];
    }[]
  >(
    `service_visits?customer_id=eq.${customer.id}&select=id,status,scheduled_for,visit_photographs(kind,storage_path)&order=scheduled_for.desc.nullslast`,
  );
  const actionableVisits = await databaseRequest<
    { id: string; status: string; scheduled_for: string | null }[]
  >(
    `service_visits?customer_id=eq.${customer.id}&select=id,status,scheduled_for&status=not.in.(completed,skipped,refused)&order=scheduled_for.asc.nullslast`,
  );
  const nextVisit = actionableVisits[0];
  const nextChargeValue =
    accountSummary.nextChargeCents == null
      ? "No recurring charge"
      : `${formatCurrency(accountSummary.nextChargeCents)}*`;

  const planVersion = subscription?.service_plan_versions;
  const canManageBinPricing = Boolean(
    planVersion &&
      planVersion.base_price_cents != null &&
      planVersion.additional_bin_price_cents != null,
  );

  return (
    <AppShell area="Customer portal">
      {searchParams.saved && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3">
          Your test changes were saved; route-affecting requests await staff
          review.
        </p>
      )}
      {searchParams.bins === "changed" && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 font-semibold text-green-900">
          Your bin change was recorded. Future unlocked service uses the new bin configuration. Your next billing renewal will use the new recurring price once payment integration is connected. Any already-locked visit keeps the configuration recorded for that visit.
        </p>
      )}
      {searchParams.bins === "unchanged" && (
        <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-blue-950">
          No bin-count change was needed.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Account" value={customer.account_status} />
        <Stat
          label="Current plan"
          value={
            subscription?.service_plan_versions.service_plans.display_name ??
            "None"
          }
        />
        <Stat label="Bins" value={currentTotalBins} />
        <Stat label={accountSummary.nextChargeLabel} value={nextChargeValue} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        *Staging estimate before tax. Qualified referral credit is included when available; pending referrals are not deducted yet.
      </p>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-black">Hello, {customer.full_name}</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Definition label="Service address">
            {address.line1}, {address.city}, {address.region} {address.postal_code}
          </Definition>
          <Definition label="Trash pickup">
            {trashSchedule?.weekday == null
              ? "Unverified"
              : days[trashSchedule.weekday]}{" "}
            · {trashSchedule?.source}
          </Definition>
          <Definition label="Recycling pickup">
            {recyclingSchedule
              ? `${days[recyclingSchedule.weekday]} · ${cadenceLabel(recyclingSchedule.frequency_weeks)} · reference pickup ${recyclingSchedule.anchor_collection_date}`
              : "Not recorded"}
          </Definition>
          <Definition label="Service alignment">
            {subscription?.service_alignment === "recycling_collection"
              ? "After an eligible recycling collection"
              : subscription?.service_alignment === "staff_review_required"
                ? "Staff review required"
                : "After an eligible trash collection"}
          </Definition>
          <Definition label="Normal cleaning">
            {trashSchedule?.cleaning_day_assignments[0]
              ? days[trashSchedule.cleaning_day_assignments[0].normal_weekday]
              : "Pending"}
          </Definition>
          <Definition label="Next service">
            {nextVisit?.scheduled_for ?? "Not scheduled"}
          </Definition>
          <Definition label="Return location">
            {address.preferred_return_location ?? "Not provided"}
          </Definition>
          <Definition label="Access">
            {address.access_instructions ?? "None"}
          </Definition>
        </dl>

        {currentRecyclingBins > 0 && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            <strong>Why your service may not be on the next trash week:</strong>{" "}
            {RECYCLING_ALIGNMENT_EXPLANATION}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl font-black">Service history</h2>
          {visits.map((visit) => (
            <div className="mt-3 rounded-xl bg-zinc-50 p-4" key={visit.id}>
              <strong>{visit.status}</strong>
              <p className="text-sm">
                {visit.scheduled_for ?? "Unscheduled"} ·{" "}
                {visit.visit_photographs.map((photo) => photo.kind).join(" / ") ||
                  "No photo records"}
              </p>
            </div>
          ))}
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-black">Your referrals</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Share your permanent referral code or link with friends. A new eligible Monthly customer can receive 50% off their first eligible base cleaning. Your first qualified referral earns 50% off one eligible Monthly base cleaning; later qualified referrals earn 25% off one.
          </p>
          <ReferralShare
            code={accountSummary.referralCode ?? undefined}
            senderName={customer.full_name}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Submitted referrals" value={accountSummary.submittedReferrals} />
            <Stat label="Qualified referrals" value={accountSummary.qualifiedReferrals} />
            <Stat
              label="Available credit"
              value={formatCurrency(accountSummary.availableCreditCents)}
            />
          </div>
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <strong>{accountSummary.nextChargeLabel}:</strong>{" "}
            {accountSummary.nextChargeCents == null
              ? "No recurring charge"
              : `${formatCurrency(accountSummary.nextChargeCents)} before tax`}
            {accountSummary.nextAppliedCreditCents > 0 && (
              <span className="block text-emerald-800">
                Includes {formatCurrency(accountSummary.nextAppliedCreditCents)} of qualified referral credit.
              </span>
            )}
            {accountSummary.submittedReferrals > accountSummary.qualifiedReferrals && (
              <span className="block text-zinc-600">
                Pending referrals do not reduce this estimate until they qualify.
              </span>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-black">Manage your bins</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Add or remove trash and recycling bins here. Every change is time-stamped and kept in account history. A route-locked visit keeps its own immutable bin snapshot, so later changes cannot rewrite what ADS was scheduled to clean.
        </p>
        {canManageBinPricing && planVersion ? (
          <ManageBinsForm
            customerId={customer.id}
            currentTrashBins={currentTrashBins}
            currentRecyclingBins={currentRecyclingBins}
            basePriceCents={planVersion.base_price_cents ?? 0}
            includedBins={planVersion.bins_included ?? 1}
            additionalBinPriceCents={planVersion.additional_bin_price_cents ?? 0}
            currentRecyclingWeekday={recyclingSchedule?.weekday}
            currentRecyclingFrequencyWeeks={recyclingSchedule?.frequency_weeks}
            currentRecyclingAnchor={recyclingSchedule?.anchor_collection_date}
          />
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Bin changes need staff help for this plan.
          </p>
        )}

        {binChanges.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="font-black">Bin change history</h3>
            <div className="mt-3 space-y-3">
              {binChanges.map((change) => (
                <div key={change.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <strong>{new Date(change.requested_at).toLocaleString()}</strong>
                  <p className="mt-1">
                    {change.old_trash_bin_count} trash + {change.old_recycling_bin_count} recycling → {change.new_trash_bin_count} trash + {change.new_recycling_bin_count} recycling
                  </p>
                  <p className="text-zinc-600">
                    {change.old_recurring_price_cents == null ? "Prior price unavailable" : formatCurrency(change.old_recurring_price_cents)} → {change.new_recurring_price_cents == null ? "new price unavailable" : formatCurrency(change.new_recurring_price_cents)} · billing: next renewal
                  </p>
                  {change.locked_visit_id && (
                    <p className="mt-1 font-semibold text-blue-900">
                      An already-locked visit keeps its earlier bin snapshot; this change applies to future unlocked service.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-black">
          Update account / request route changes
        </h2>
        <form
          action="/api/bin-cleaning/portal"
          method="post"
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="customer_id" value={customer.id} />
          <label>
            Phone
            <input
              required
              pattern="[+()\- .0-9]{7,24}"
              name="phone"
              className="mt-1 w-full rounded-lg border p-3"
              defaultValue={customer.phone ?? ""}
            />
          </label>
          <fieldset>
            <legend>Contact preferences</legend>
            <input type="hidden" name="preferences_present" value="1" />
            {(["email", "sms", "phone"] as const).map((channel) => (
              <label className="mr-3" key={channel}>
                <input
                  type="checkbox"
                  name={`${channel}_allowed`}
                  defaultChecked={
                    preferences?.[`${channel}_allowed`] ?? false
                  }
                />{" "}
                {channel}
              </label>
            ))}
          </fieldset>
          <label>
            Return location request
            <input
              name="return_location"
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <label>
            Gate information request
            <input
              name="gate_information"
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <label>
            Animal warning request
            <input
              name="animal_warning"
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <label className="sm:col-span-2">
            Access instructions request
            <textarea
              name="access_instructions"
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>

          <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:col-span-2">
            <legend className="px-2 font-black text-blue-950">
              Recycling schedule correction
            </legend>
            <p className="mb-4 text-sm text-blue-950">
              Use this only to correct an existing recycling schedule without changing your number of bins. Use Manage your bins above when adding or removing a recycling bin.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="font-semibold">
                Recycling weekday
                <select
                  name="recycling_weekday"
                  defaultValue={recyclingSchedule?.weekday ?? ""}
                  className="mt-1 w-full rounded-lg border bg-white p-3"
                >
                  <option value="">Select day</option>
                  {days.map((day, index) => (
                    <option value={index} key={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">
                Pickup frequency
                <select
                  name="recycling_frequency_weeks"
                  defaultValue={recyclingSchedule?.frequency_weeks ?? ""}
                  className="mt-1 w-full rounded-lg border bg-white p-3"
                >
                  <option value="">Select frequency</option>
                  <option value="1">Every week</option>
                  <option value="2">Every other week</option>
                </select>
              </label>
              <label className="font-semibold">
                Next scheduled recycling pickup
                <input
                  type="date"
                  name="recycling_next_collection_date"
                  className="mt-1 w-full rounded-lg border bg-white p-3"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border p-4 sm:col-span-2">
            <legend className="px-2 font-black">
              Which bins need cleaning on your next visit?
            </legend>
            <p className="mb-3 text-sm text-zinc-600">
              Check each active bin that will be available and needs cleaning. This does not add or remove a bin from your plan.
            </p>
            {bins.map((bin) => (
              <label
                className="mr-4 inline-flex items-center gap-2"
                key={bin.id}
              >
                <input
                  type="checkbox"
                  name="dirty_bin"
                  value={bin.id}
                  defaultChecked={bin.dirty_this_visit}
                />
                {bin.identifier ?? bin.description} ({bin.collection_stream})
              </label>
            ))}
          </fieldset>
          <button className="rounded-lg bg-brand-700 p-3 font-bold text-white sm:col-span-2">
            Save test changes
          </button>
        </form>
      </section>
    </AppShell>
  );
}
