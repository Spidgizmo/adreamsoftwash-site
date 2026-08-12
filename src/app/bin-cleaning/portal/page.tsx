import {
  AppShell,
  Definition,
  Stat,
} from "@/components/bin-cleaning/AppShell";
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
  searchParams: { saved?: string };
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
    `bins?service_address_id=eq.${address.id}&select=id,identifier,description,collection_stream,dirty_this_visit`,
  );

  const accountSummary = await customerAccountSummary(customer, bins.length);

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

  return (
    <AppShell area="Customer portal">
      {searchParams.saved && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3">
          Your test changes were saved; route-affecting requests await staff
          review.
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
        <Stat label="Bins" value={bins.length} />
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

        {bins.some((bin) => bin.collection_stream === "recycling") && (
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
          <label>
            Bin-count request
            <input
              type="number"
              min="1"
              max="20"
              name="bin_count"
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
              Submit all three fields only when the recorded recycling schedule
              is missing or wrong. The date identifies which alternating week is
              your recycling week. Staff must verify the request before it
              changes routing.
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
              Check each bin that will be available and needs cleaning. This
              does not change the number of bins on your paid plan.
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
