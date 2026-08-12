import Link from "next/link";
import { crmSignupLeads } from "@/lib/bin-cleaning/signup-queries";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type AddressCustomerRow = Readonly<{
  id: string;
  customer_id: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal_code: string;
  is_current: boolean;
  customers: {
    id: string;
    full_name: string;
    account_status: string;
    cancellation_reason: string | null;
    move_out_date: string | null;
    service_through_date: string | null;
  } | null;
}>;

type DuplicateEntry = Readonly<{
  id: string;
  kind: "customer" | "signup";
  name: string;
  address: string;
  status: string;
  moved: boolean;
  moveOutDate: string | null;
  href: string;
}>;

function addressPart(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addressKey(
  line1: string | null | undefined,
  line2: string | null | undefined,
  city: string | null | undefined,
  region: string | null | undefined,
  postalCode: string | null | undefined,
) {
  return [line1, line2, city, region, postalCode].map(addressPart).join("|");
}

function displayAddress(
  line1: string | null | undefined,
  line2: string | null | undefined,
  city: string | null | undefined,
  region: string | null | undefined,
  postalCode: string | null | undefined,
) {
  const street = [line1, line2].filter(Boolean).join(" ");
  return `${street}, ${city ?? ""}, ${region ?? ""} ${postalCode ?? ""}`.replace(/\s+/g, " ").trim();
}

function displayMoveDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export async function AddressDuplicateAlerts() {
  const [addresses, signupResult] = await Promise.all([
    serviceRoleDatabaseRequest<AddressCustomerRow[]>(
      "service_addresses?is_current=eq.true&select=id,customer_id,line1,line2,city,region,postal_code,is_current,customers(id,full_name,account_status,cancellation_reason,move_out_date,service_through_date)&order=created_at.desc",
    ).catch(() => []),
    crmSignupLeads(),
  ]);

  const groups = new Map<string, DuplicateEntry[]>();
  const push = (key: string, entry: DuplicateEntry) => {
    if (!key.replaceAll("|", "")) return;
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
  };

  for (const address of addresses) {
    if (!address.customers) continue;
    const key = addressKey(address.line1, address.line2, address.city, address.region, address.postal_code);
    push(key, {
      id: address.customers.id,
      kind: "customer",
      name: address.customers.full_name,
      address: displayAddress(address.line1, address.line2, address.city, address.region, address.postal_code),
      status: address.customers.account_status,
      moved: address.customers.cancellation_reason === "moved",
      moveOutDate: address.customers.move_out_date,
      href: `/bin-cleaning/crm/customers/${address.customers.id}`,
    });
  }

  for (const lead of signupResult.leads) {
    if (lead.status !== "submitted_unpaid") continue;
    const key = addressKey(lead.line1, lead.line2, lead.city, lead.region, lead.postal_code);
    push(key, {
      id: lead.id,
      kind: "signup",
      name: lead.full_name || "Submitted signup",
      address: displayAddress(lead.line1, lead.line2, lead.city, lead.region, lead.postal_code),
      status: lead.status,
      moved: false,
      moveOutDate: null,
      href: `/bin-cleaning/crm/signups/${lead.id}`,
    });
  }

  const duplicates = [...groups.values()]
    .filter((entries) => new Set(entries.map((entry) => `${entry.kind}:${entry.id}`)).size > 1)
    .map((entries) => {
      const unique = [...new Map(entries.map((entry) => [`${entry.kind}:${entry.id}`, entry])).values()];
      return unique;
    });

  if (duplicates.length === 0) return null;

  return (
    <section className="card mt-6 overflow-hidden border-amber-300">
      <div className="border-b border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-black text-amber-950">Possible duplicate service addresses</h2>
        <p className="mt-1 text-sm text-amber-900">
          Address matches are warnings, not automatic blocks. Review the prior customer before deciding whether a new-customer offer belongs to the same household or a new occupant.
        </p>
      </div>
      <div className="divide-y">
        {duplicates.slice(0, 10).map((entries, index) => (
          <div className="p-4" key={`${entries[0]?.address ?? "duplicate"}-${index}`}>
            <p className="font-black text-zinc-950">Duplicate address: {entries[0]?.address}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {entries.map((entry) => (
                <div className="rounded-xl border border-zinc-200 bg-white p-3" key={`${entry.kind}:${entry.id}`}>
                  <Link href={entry.href} className="font-black text-brand-700 underline">
                    {entry.name}
                  </Link>
                  <p className="mt-1 text-sm capitalize text-zinc-700">
                    {entry.kind === "signup" ? "New signup" : "Customer"} · {entry.status.replaceAll("_", " ")}
                  </p>
                  {entry.moved ? (
                    <p className="mt-1 text-sm font-bold text-emerald-800">
                      Prior customer marked moved{entry.moveOutDate ? ` · move-out ${displayMoveDate(entry.moveOutDate)}` : ""}. This may be a legitimate new occupant.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
