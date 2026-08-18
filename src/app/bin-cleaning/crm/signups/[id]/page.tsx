import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/bin-cleaning/AppShell";
import { ManualSetupLinkPanel } from "@/components/bin-cleaning/ManualSetupLinkPanel";
import { PermanentErasePanel } from "@/components/bin-cleaning/PermanentErasePanel";
import { crmSignupLead } from "@/lib/bin-cleaning/signup-queries";
import { formatCurrency } from "@/lib/bin-cleaning-plans";

export const dynamic = "force-dynamic";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "—";
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function Item({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return <div><dt className="font-bold">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>;
}

function Card({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      <dl className="mt-4 space-y-3 text-sm">{children}</dl>
    </section>
  );
}

export default async function SignupDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erase_error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const lead = await crmSignupLead(id).catch(() => null);
  if (!lead) notFound();
  const isManualIntake = lead.form_data?.manual_intake === true;

  return (
    <AppShell area="Internal CRM">
      <div className="mb-5">
        <Link href="/bin-cleaning/crm" className="text-sm font-bold text-brand-700 hover:underline">← Back to CRM</Link>
      </div>

      {query.erase_error && <p className="mb-5 rounded-xl bg-red-50 p-4 font-bold text-red-900">This signup could not be erased. If it has already become a customer, erase it from the customer record instead.</p>}

      <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-black uppercase text-emerald-900">{lead.status.replaceAll("_", " ")}</span>
              <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-black uppercase text-zinc-600">Fictional test record</span>
              {isManualIntake && <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-black uppercase text-blue-800">Manual staff intake</span>}
            </div>
            <h1 className="mt-3 text-3xl font-black">{lead.full_name || "Incomplete name"}</h1>
            <p className="mt-1 text-zinc-600">{lead.email || "No email"} · {lead.phone || "No phone"}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xl font-black">{lead.estimated_first_charge_cents == null ? "Estimate pending" : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`}</p>
            <p className="mt-1 text-xs text-zinc-500">Unpaid signup record</p>
          </div>
        </div>
      </header>

      {isManualIntake && lead.status === "incomplete" && (
        <ManualSetupLinkPanel leadId={lead.id} email={lead.email} phone={lead.phone} />
      )}
      {isManualIntake && lead.status === "submitted_unpaid" && (
        <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950 shadow-sm">
          <h2 className="text-lg font-black">Customer setup finished — payment pending</h2>
          <p className="mt-2">The customer created the portal identity and accepted the required terms. This submitted signup is locked. Service remains inactive until a verified Stripe TEST webhook confirms payment.</p>
        </section>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Customer & service address">
          <Item label="Name" value={valueOrDash(lead.full_name)} />
          <Item label="Email" value={valueOrDash(lead.email)} />
          <Item label="Phone" value={valueOrDash(lead.phone)} />
          <Item label="Street" value={valueOrDash(lead.line1)} />
          <Item label="Unit" value={valueOrDash(lead.line2)} />
          <Item label="City / State / ZIP" value={[lead.city, lead.region, lead.postal_code].filter(Boolean).join(", ") || "—"} />
        </Card>

        <Card title="Plan & bins">
          <Item label="Plan" value={valueOrDash(lead.plan_id)} />
          <Item label="Total bins" value={lead.bin_count} />
          <Item label="Trash bins" value={lead.bin_streams?.trash ?? 0} />
          <Item label="Recycling bins" value={lead.bin_streams?.recycling ?? 0} />
        </Card>

        <Card title="Collection schedule">
          <Item label="Trash pickup" value={lead.trash_weekday == null ? "—" : days[lead.trash_weekday]} />
          <Item label="Recycling pickup" value={lead.recycling_weekday == null ? "—" : days[lead.recycling_weekday]} />
          <Item label="Recycling frequency" value={lead.recycling_frequency_weeks ? `Every ${lead.recycling_frequency_weeks} week${lead.recycling_frequency_weeks === 1 ? "" : "s"}` : "—"} />
          <Item label="Recycling anchor" value={valueOrDash(lead.recycling_anchor_collection_date)} />
        </Card>

        <Card title="Promo / referral & estimate">
          <Item label="Promo code" value={valueOrDash(lead.promo_code)} />
          <Item label="Referral code" value={valueOrDash(lead.referral_code)} />
          <Item label="Signup discount" value={lead.referral_code ? "New referred Monthly customer — 50% off first eligible base cleaning" : valueOrDash(lead.discount_kind)} />
          <Item label="Referral reward status" value={lead.referral_code ? "Pending until this referral qualifies after payment; referrer reward is calculated separately" : "—"} />
          <Item label="Discount status" value={valueOrDash(lead.discount_status)} />
          <Item label="Regular subtotal" value={lead.estimated_subtotal_cents == null ? "—" : formatCurrency(lead.estimated_subtotal_cents)} />
          <Item label="Discount" value={formatCurrency(lead.estimated_discount_cents)} />
          <Item label="Estimated first charge" value={lead.estimated_first_charge_cents == null ? "—" : `${formatCurrency(lead.estimated_first_charge_cents)} before tax`} />
        </Card>

        <Card title="Return, access & safety">
          <Item label="Return location" value={valueOrDash(lead.preferred_return_location)} />
          <Item label="Access instructions" value={<span className="whitespace-pre-wrap">{valueOrDash(lead.access_instructions)}</span>} />
          <Item label="Gate information" value={<span className="whitespace-pre-wrap">{valueOrDash(lead.gate_information)}</span>} />
          <Item label="Animal warning" value={<span className="whitespace-pre-wrap">{valueOrDash(lead.animal_warning)}</span>} />
          <Item label="Safety notes" value={<span className="whitespace-pre-wrap">{valueOrDash(lead.safety_notes)}</span>} />
        </Card>

        <Card title="Contact permissions & tracking">
          <Item label="Email allowed" value={yesNo(lead.email_allowed)} />
          <Item label="SMS allowed" value={yesNo(lead.sms_allowed)} />
          <Item label="Phone allowed" value={yesNo(lead.phone_allowed)} />
          <Item label="Terms accepted" value={yesNo(lead.terms_accepted)} />
          <Item label="Source" value={valueOrDash(lead.source_path)} />
          <Item label="Created" value={displayDate(lead.created_at)} />
          <Item label="Updated" value={displayDate(lead.updated_at)} />
          <Item label="Submitted" value={displayDate(lead.submitted_at)} />
          <Item label="Payment" value="No completed customer activation" />
        </Card>
      </div>

      <PermanentErasePanel kind="signup" id={lead.id} name={lead.full_name || lead.email || "this signup"} />
    </AppShell>
  );
}
