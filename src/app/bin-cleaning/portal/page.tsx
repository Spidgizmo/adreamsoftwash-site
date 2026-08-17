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
const standardPickupDays = days
  .map((day, index) => ({ day, index }))
  .filter(({ index }) => index >= 1 && index <= 5);

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
  searchParams: Promise<{
    saved?: string;
    bins?: string;
    marketing?: string;
    move?: string;
    payment?: string;
  }>;
}) {
  const query = await searchParams;
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
    }[]
  >(
    `bins?service_address_id=eq.${address.id}&active=eq.true&select=id,identifier,description,collection_stream`,
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
        marketing_allowed: boolean;
        marketing_updated_at: string;
      }[]
    >(
      `customer_contact_preferences?customer_id=eq.${customer.id}&select=email_allowed,sms_allowed,phone_allowed,marketing_allowed,marketing_updated_at`,
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
    `service_visits?customer_id=eq.${customer.id}&select=id,status,scheduled_for&status=not.in.(completed,skipped,refused,canceled)&order=scheduled_for.asc.nullslast`,
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
      {query.payment === "confirmed" && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 font-semibold text-green-900">
          Payment confirmed. Your customer account is active and you are signed in.
        </p>
      )}
      {query.saved && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3">
          Your account changes were saved; route-affecting requests await staff review.
        </p>
      )}
      {query.marketing && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 font-semibold text-green-900">
          Optional marketing offers are now {query.marketing === "on" ? "ON" : "OFF"}.
        </p>
      )}
      {query.move === "requested" && (
        <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 font-semibold text-blue-950">
          Your move was submitted. Your current address remains active until ADS confirms the new address is in the service area and updates routing.
        </p>
      )}
      {query.bins === "changed" && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 font-semibold text-green-900">
          Your bin change was recorded. Future unlocked service uses the new bin configuration. Your next billing renewal uses the new recurring price. Any already-locked visit keeps the configuration recorded for that visit.
        </p>
      )}
      {query.bins === "unchanged" && (
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
        *Staging estimate before tax. One qualified referral reward is included when available; additional earned rewards stay queued for later eligible Monthly bills.
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

      <section className="card mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Optional marketing offers</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Promotions and special offers are separate from required account, billing, scheduling, safety, and service-completion messages.
            </p>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-black ${preferences?.marketing_allowed ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-700"}`}>
            {preferences?.marketing_allowed ? "ON" : "OFF"}
          </span>
        </div>
        <form action="/api/bin-cleaning/marketing-preference" method="post" className="mt-4">
          <input type="hidden" name="action" value={preferences?.marketing_allowed ? "disable" : "enable"} />
          <button className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 font-black text-brand-800">
            {preferences?.marketing_allowed ? "Turn marketing offers off" : "Turn marketing offers on"}
          </button>
        </form>
        {preferences?.marketing_updated_at && (
          <p className="mt-3 text-xs text-zinc-500">
            Last changed {new Date(preferences.marketing_updated_at).toLocaleString()}.
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl font-black">Service history</h2>
          {visits.length === 0 && <p className="mt-3 text-sm text-zinc-500">No service history yet.</p>}
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
            Share your permanent referral code or link with friends. A new eligible Monthly customer receives 50% off their first eligible Monthly charge. Your first qualified referral earns 50% off your entire next eligible Monthly bin-cleaning charge; every later qualified referral earns 25% off an entire eligible Monthly charge. One reward is used per Monthly bill and additional rewards stay queued.
          </p>
          <ReferralShare
            code={accountSummary.referralCode ?? undefined}
            senderName={customer.full_name}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Submitted referrals" value={accountSummary.submittedReferrals} />
            <Stat label="Qualified referrals" value={accountSummary.qualifiedReferrals} />
            <Stat
              label="Available rewards"
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
                Includes {formatCurrency(accountSummary.nextAppliedCreditCents)} from one qualified referral reward.
              </span>
            )}
            {accountSummary.queuedReferralRewards > 1 && (
              <span className="block text-zinc-600">
                {accountSummary.queuedReferralRewards - 1} additional earned reward{accountSummary.queuedReferralRewards - 1 === 1 ? " is" : "s are"} queued for later Monthly bills.
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
        <h2 className="text-xl font-black">Update contact & service details</h2>
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
            <legend>Required service contact methods</legend>
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
                  {standardPickupDays.map(({ day, index }) => (
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

          <button className="rounded-lg bg-brand-700 p-3 font-bold text-white sm:col-span-2">
            Save account changes
          </button>
        </form>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-black">Moving? Update your service address</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Keep the same ADS account, plan, referral history, and billing relationship when you move. Submit the new address and pickup schedule here. Your current service address stays active until ADS confirms the new address is in our service area and updates the route, so submitting a move does not shut off your existing service.
        </p>
        <form action="/api/bin-cleaning/portal" method="post" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="customer_id" value={customer.id} />
          <input type="hidden" name="move_request_present" value="1" />
          <label className="font-semibold lg:col-span-2">
            New street address
            <input required name="move_line1" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            Unit / apartment
            <input name="move_line2" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            City
            <input required name="move_city" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            State
            <input required name="move_region" maxLength={2} defaultValue="OH" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            ZIP
            <input required name="move_postal_code" pattern="[0-9]{5}(-[0-9]{4})?" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            Date service should move
            <input required type="date" name="move_date" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            Trash pickup day at new address
            <select required name="move_trash_weekday" className="mt-1 w-full rounded-lg border p-3">
              <option value="">Select day</option>
              {standardPickupDays.map(({ day, index }) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label className="font-semibold">
            Bin return location at new address
            <input name="move_return_location" defaultValue={address.preferred_return_location ?? ""} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold lg:col-span-3">
            Access instructions at new address
            <textarea name="move_access_instructions" defaultValue={address.access_instructions ?? ""} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold">
            Gate information
            <input name="move_gate_information" defaultValue={address.gate_information ?? ""} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="font-semibold lg:col-span-2">
            Animal / safety warning
            <input name="move_animal_warning" defaultValue={address.animal_warning ?? ""} className="mt-1 w-full rounded-lg border p-3" />
          </label>

          {currentRecyclingBins > 0 && (
            <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:col-span-2 lg:col-span-3">
              <legend className="px-2 font-black text-blue-950">Recycling pickup at new address</legend>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="font-semibold">
                  Recycling weekday
                  <select required name="move_recycling_weekday" className="mt-1 w-full rounded-lg border bg-white p-3">
                    <option value="">Select day</option>
                    {standardPickupDays.map(({ day, index }) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </label>
                <label className="font-semibold">
                  Pickup frequency
                  <select required name="move_recycling_frequency_weeks" className="mt-1 w-full rounded-lg border bg-white p-3">
                    <option value="">Select frequency</option>
                    <option value="1">Every week</option>
                    <option value="2">Every other week</option>
                  </select>
                </label>
                <label className="font-semibold">
                  Next scheduled recycling pickup
                  <input required type="date" name="move_recycling_anchor" className="mt-1 w-full rounded-lg border bg-white p-3" />
                </label>
              </div>
            </fieldset>
          )}

          <button className="rounded-xl bg-brand-700 p-3 font-black text-white sm:col-span-2 lg:col-span-3">
            Submit new address for service-area & routing review
          </button>
        </form>
      </section>
    </AppShell>
  );
}
