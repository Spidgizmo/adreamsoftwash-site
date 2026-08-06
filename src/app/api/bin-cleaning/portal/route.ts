import { NextRequest, NextResponse } from "next/server";
import { currentSession, databaseRequest } from "@/lib/supabase/server";

const phone = /^[+()\- .0-9]{7,24}$/;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function dateWeekday(value: string): number | null {
  if (!dateOnly.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.getUTCDay();
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

  const addressId = customer.service_addresses.find(
    (address) => address.is_current,
  )?.id;
  if (!addressId) {
    return NextResponse.json(
      { error: "No current service address" },
      { status: 409 },
    );
  }

  for (const type of [
    "return_location",
    "access_instructions",
    "gate_information",
    "animal_warning",
    "bin_count",
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
