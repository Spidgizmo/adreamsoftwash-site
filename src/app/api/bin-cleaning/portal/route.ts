import { NextRequest, NextResponse } from "next/server";
import {
  currentSession,
  databaseRequest,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";

const phone = /^[+()\- .0-9]{7,24}$/;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const lockedVisitStatuses = [
  "assigned",
  "en_route",
  "arrived",
  "before_photo_complete",
  "cleaning_in_progress",
  "after_photo_complete",
  "bins_returned",
] as const;

function dateWeekday(value: string): number | null {
  if (!dateOnly.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.getUTCDay();
}

function recurringPrice(
  basePriceCents: number,
  includedBins: number,
  additionalBinPriceCents: number,
  binCount: number,
) {
  return (
    basePriceCents +
    Math.max(0, binCount - includedBins) * additionalBinPriceCents
  );
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || session.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const customerId = String(form.get("customer_id") ?? "");
  const customer = (
    await databaseRequest<
      { id: string; service_addresses: { id: string; is_current: boolean }[] }[]
    >(
      `customers?id=eq.${customerId}&select=id,service_addresses(id,is_current)&service_addresses.is_current=eq.true`,
    )
  )[0];
  if (!customer) {
    return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
  }

  const addressId = customer.service_addresses.find(
    (address) => address.is_current,
  )?.id;
  if (!addressId) {
    return NextResponse.json(
      { error: "No current service address" },
      { status: 409 },
    );
  }

  if (form.get("bin_change_present") === "1") {
    const newTrashCount = Number(form.get("trash_bin_count"));
    const newRecyclingCount = Number(form.get("recycling_bin_count"));
    if (
      !Number.isInteger(newTrashCount) ||
      !Number.isInteger(newRecyclingCount) ||
      newTrashCount < 0 ||
      newRecyclingCount < 0 ||
      newTrashCount > 20 ||
      newRecyclingCount > 20 ||
      newTrashCount + newRecyclingCount < 1
    ) {
      return NextResponse.json(
        { error: "Choose between 1 and 20 total trash/recycling bins." },
        { status: 400 },
      );
    }

    const existingConfig = (
      await databaseRequest<
        {
          id: string;
          trash_bin_count: number;
          recycling_bin_count: number;
          recurring_price_cents: number | null;
        }[]
      >(
        `customer_bin_configurations?customer_id=eq.${customer.id}&service_address_id=eq.${addressId}&effective_service_at=lte.${encodeURIComponent(new Date().toISOString())}&select=id,trash_bin_count,recycling_bin_count,recurring_price_cents&order=effective_service_at.desc,created_at.desc&limit=1`,
      ).catch(() => [])
    )[0];

    const activeBins = await databaseRequest<
      { id: string; collection_stream: "trash" | "recycling" | "other" }[]
    >(
      `bins?service_address_id=eq.${addressId}&active=eq.true&select=id,collection_stream&order=id`,
    );
    const oldTrashCount =
      existingConfig?.trash_bin_count ??
      activeBins.filter((bin) => bin.collection_stream !== "recycling").length;
    const oldRecyclingCount =
      existingConfig?.recycling_bin_count ??
      activeBins.filter((bin) => bin.collection_stream === "recycling").length;

    if (
      oldTrashCount === newTrashCount &&
      oldRecyclingCount === newRecyclingCount
    ) {
      return NextResponse.redirect(
        new URL("/bin-cleaning/portal?bins=unchanged", request.url),
        303,
      );
    }

    const subscription = (
      await databaseRequest<
        {
          id: string;
          service_plan_version_id: string;
          service_plan_versions: {
            base_price_cents: number | null;
            bins_included: number | null;
            additional_bin_price_cents: number | null;
          };
        }[]
      >(
        `subscriptions?customer_id=eq.${customer.id}&ended_at=is.null&select=id,service_plan_version_id,service_plan_versions(base_price_cents,bins_included,additional_bin_price_cents)&order=started_at.desc.nullslast&limit=1`,
      )
    )[0];
    if (!subscription) {
      return NextResponse.json(
        { error: "No current service plan is available for this change." },
        { status: 409 },
      );
    }

    const version = subscription.service_plan_versions;
    const basePriceCents = version.base_price_cents ?? 0;
    const includedBins = Math.max(0, version.bins_included ?? 1);
    const additionalBinPriceCents = Math.max(
      0,
      version.additional_bin_price_cents ?? 0,
    );
    const oldRecurringPriceCents = recurringPrice(
      basePriceCents,
      includedBins,
      additionalBinPriceCents,
      oldTrashCount + oldRecyclingCount,
    );
    const newRecurringPriceCents = recurringPrice(
      basePriceCents,
      includedBins,
      additionalBinPriceCents,
      newTrashCount + newRecyclingCount,
    );

    let recyclingWeekday: number | null = null;
    let recyclingFrequencyWeeks: number | null = null;
    let recyclingAnchor: string | null = null;
    if (newRecyclingCount > 0) {
      recyclingWeekday = Number(form.get("bin_recycling_weekday"));
      recyclingFrequencyWeeks = Number(
        form.get("bin_recycling_frequency_weeks"),
      );
      recyclingAnchor = String(form.get("bin_recycling_anchor") ?? "").trim();
      const anchorWeekday = dateWeekday(recyclingAnchor);
      if (
        !Number.isInteger(recyclingWeekday) ||
        recyclingWeekday < 0 ||
        recyclingWeekday > 6 ||
        !Number.isInteger(recyclingFrequencyWeeks) ||
        ![1, 2].includes(recyclingFrequencyWeeks) ||
        anchorWeekday === null ||
        anchorWeekday !== recyclingWeekday
      ) {
        return NextResponse.json(
          {
            error:
              "Adding recycling requires a valid pickup day, frequency, and a pickup date that falls on that weekday.",
          },
          { status: 400 },
        );
      }
    }

    const lockedVisit = (
      await databaseRequest<{ id: string; scheduled_for: string | null }[]>(
        `service_visits?customer_id=eq.${customer.id}&status=in.(${lockedVisitStatuses.join(",")})&select=id,scheduled_for&order=scheduled_for.asc.nullslast&limit=1`,
      ).catch(() => [])
    )[0];
    const requestedAt = new Date().toISOString();

    const requestRows = await serviceRoleDatabaseRequest<
      { id: string }[]
    >("customer_bin_change_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        customer_id: customer.id,
        service_address_id: addressId,
        requested_by: session.id,
        old_trash_bin_count: oldTrashCount,
        old_recycling_bin_count: oldRecyclingCount,
        new_trash_bin_count: newTrashCount,
        new_recycling_bin_count: newRecyclingCount,
        old_recurring_price_cents: oldRecurringPriceCents,
        new_recurring_price_cents: newRecurringPriceCents,
        recycling_weekday: recyclingWeekday,
        recycling_frequency_weeks: recyclingFrequencyWeeks,
        recycling_anchor_collection_date: recyclingAnchor,
        requested_at: requestedAt,
        service_effective_at: requestedAt,
        billing_effective_policy: "next_renewal",
        locked_visit_id: lockedVisit?.id ?? null,
        status: "scheduled",
        is_test: true,
      }),
    });
    const changeRequestId = requestRows[0]?.id;
    if (!changeRequestId) {
      return NextResponse.json(
        { error: "The bin change could not be recorded." },
        { status: 500 },
      );
    }

    await serviceRoleDatabaseRequest("customer_bin_configurations", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customer.id,
        service_address_id: addressId,
        trash_bin_count: newTrashCount,
        recycling_bin_count: newRecyclingCount,
        recurring_price_cents: newRecurringPriceCents,
        effective_service_at: requestedAt,
        billing_effective_policy: "next_renewal",
        source: "customer_portal",
        source_change_request_id: changeRequestId,
        changed_by: session.id,
        is_test: true,
      }),
    });

    const activeTrash = activeBins.filter(
      (bin) => bin.collection_stream !== "recycling",
    );
    const activeRecycling = activeBins.filter(
      (bin) => bin.collection_stream === "recycling",
    );
    const reconcileBins = async (
      stream: "trash" | "recycling",
      existing: { id: string }[],
      desired: number,
    ) => {
      if (existing.length > desired) {
        const deactivate = existing.slice(desired).map((bin) => bin.id);
        await serviceRoleDatabaseRequest(`bins?id=in.(${deactivate.join(",")})`, {
          method: "PATCH",
          body: JSON.stringify({ active: false, dirty_this_visit: false }),
        });
      }
      if (existing.length < desired) {
        await serviceRoleDatabaseRequest("bins", {
          method: "POST",
          body: JSON.stringify(
            Array.from({ length: desired - existing.length }, () => ({
              service_address_id: addressId,
              description:
                stream === "recycling"
                  ? "Customer recycling bin"
                  : "Customer trash bin",
              collection_stream: stream,
              active: true,
              dirty_this_visit: true,
            })),
          ),
        });
      }
    };
    await reconcileBins("trash", activeTrash, newTrashCount);
    await reconcileBins("recycling", activeRecycling, newRecyclingCount);

    if (newRecyclingCount > 0) {
      await serviceRoleDatabaseRequest(
        `recycling_pickup_schedules?service_address_id=eq.${addressId}&is_current=eq.true`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_current: false }),
        },
      );
      await serviceRoleDatabaseRequest("recycling_pickup_schedules", {
        method: "POST",
        body: JSON.stringify({
          service_address_id: addressId,
          weekday: recyclingWeekday,
          frequency_weeks: recyclingFrequencyWeeks,
          anchor_collection_date: recyclingAnchor,
          source: "customer_confirmed",
          verification_status: "customer_confirmed",
          effective_from: requestedAt.slice(0, 10),
          is_current: true,
        }),
      });
      await serviceRoleDatabaseRequest(`subscriptions?id=eq.${subscription.id}`, {
        method: "PATCH",
        body: JSON.stringify({ service_alignment: "recycling_collection" }),
      });
    } else {
      await serviceRoleDatabaseRequest(
        `recycling_pickup_schedules?service_address_id=eq.${addressId}&is_current=eq.true`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_current: false }),
        },
      );
      await serviceRoleDatabaseRequest(`subscriptions?id=eq.${subscription.id}`, {
        method: "PATCH",
        body: JSON.stringify({ service_alignment: "trash_collection" }),
      });
    }

    return NextResponse.redirect(
      new URL("/bin-cleaning/portal?bins=changed", request.url),
      303,
    );
  }

  const newPhone = String(form.get("phone") ?? "");
  if (!phone.test(newPhone)) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  await databaseRequest(`customers?id=eq.${customer.id}`, {
    method: "PATCH",
    body: JSON.stringify({ phone: newPhone }),
  });

  if (form.get("preferences_present") === "1") {
    await databaseRequest(
      "customer_contact_preferences?on_conflict=customer_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          customer_id: customer.id,
          email_allowed: form.get("email_allowed") === "on",
          sms_allowed: form.get("sms_allowed") === "on",
          phone_allowed: form.get("phone_allowed") === "on",
        }),
      },
    );
  }

  for (const type of [
    "return_location",
    "access_instructions",
    "gate_information",
    "animal_warning",
  ]) {
    const value = form.get(type);
    if (value !== null && String(value).trim()) {
      await databaseRequest("customer_change_requests", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customer.id,
          service_address_id: addressId,
          request_type: type,
          requested_value: { value: String(value).trim() },
          requested_by: session.id,
        }),
      });
    }
  }

  const recyclingDate = String(
    form.get("recycling_next_collection_date") ?? "",
  ).trim();
  if (recyclingDate) {
    const recyclingWeekday = Number(form.get("recycling_weekday"));
    const frequencyWeeks = Number(form.get("recycling_frequency_weeks"));
    const actualWeekday = dateWeekday(recyclingDate);

    if (
      !Number.isInteger(recyclingWeekday) ||
      recyclingWeekday < 0 ||
      recyclingWeekday > 6 ||
      !Number.isInteger(frequencyWeeks) ||
      frequencyWeeks < 1 ||
      frequencyWeeks > 4 ||
      actualWeekday === null ||
      actualWeekday !== recyclingWeekday
    ) {
      return NextResponse.json(
        {
          error:
            "Recycling schedule requires a valid weekday, frequency, and matching next collection date.",
        },
        { status: 400 },
      );
    }

    await databaseRequest("customer_change_requests", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customer.id,
        service_address_id: addressId,
        request_type: "recycling_schedule",
        requested_value: {
          weekday: recyclingWeekday,
          frequency_weeks: frequencyWeeks,
          next_collection_date: recyclingDate,
        },
        requested_by: session.id,
      }),
    });
  }

  const dirty = form
    .getAll("dirty_bin")
    .map(String)
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));

  await databaseRequest(`bins?service_address_id=eq.${addressId}`, {
    method: "PATCH",
    body: JSON.stringify({ dirty_this_visit: false }),
  });
  if (dirty.length) {
    await databaseRequest(
      `bins?service_address_id=eq.${addressId}&id=in.(${dirty.join(",")})`,
      {
        method: "PATCH",
        body: JSON.stringify({ dirty_this_visit: true }),
      },
    );
  }

  return NextResponse.redirect(
    new URL("/bin-cleaning/portal?saved=1", request.url),
    303,
  );
}
