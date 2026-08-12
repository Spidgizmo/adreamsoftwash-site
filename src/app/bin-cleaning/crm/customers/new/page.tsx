import { AppShell } from "@/components/bin-cleaning/AppShell";

export const dynamic = "force-dynamic";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function NewCustomer({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  return (
    <AppShell area="Internal CRM">
      <div className="max-w-4xl">
        <h2 className="text-3xl font-black">Add customer manually</h2>
        <p className="mt-2 text-zinc-600">Use this when somebody calls, texts, or signs up with you directly instead of completing the public form. During testing this creates a separate submitted-unpaid CRM intake record and stops before payment.</p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Test-data rules:</strong> use a fictional email ending in <code>.test</code> and a reserved phone number in the <code>1-555-XXX-XXXX</code> range. No real customer information belongs in staging.
        </div>
        {searchParams.saved && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Manual customer intake saved to the CRM. No payment was collected.</p>}
        {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-900">The customer could not be saved. Check every required field, use a .test email, use a 1-555 test phone number, and make sure at least one bin is selected. Fields marked * are required.</p>}

        <form action="/api/bin-cleaning/crm/manual-customer" method="post" className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
          <label className="font-semibold">Full name *<input required name="full_name" minLength={2} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Email *<input required type="email" name="email" pattern=".+@.+\\.test" title="Use a fictional .test email, for example manual.customer@example.test" placeholder="manual.customer@example.test" className="mt-1 w-full rounded-lg border p-3" /><span className="mt-1 block text-xs font-normal text-zinc-500">Testing only: must end in .test</span></label>
          <label className="font-semibold">Phone *<input required name="phone" pattern="1[- ]?555[- ]?\\d{3}[- ]?\\d{4}" title="Use a reserved test number such as 1-555-123-4567" placeholder="1-555-123-4567" className="mt-1 w-full rounded-lg border p-3" /><span className="mt-1 block text-xs font-normal text-zinc-500">Testing only: use the reserved 1-555 range</span></label>
          <label className="font-semibold">Plan *<select required name="plan_id" defaultValue="monthly" className="mt-1 w-full rounded-lg border p-3"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select></label>
          <label className="font-semibold sm:col-span-2">Street address *<input required name="line1" minLength={2} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Unit / Apt<input name="line2" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">City *<input required name="city" minLength={2} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">State *<input required name="region" defaultValue="OH" maxLength={2} minLength={2} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">ZIP *<input required name="postal_code" minLength={5} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Trash bins *<input required type="number" min="0" max="20" name="trash_bins" defaultValue="1" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Recycling bins *<input required type="number" min="0" max="20" name="recycling_bins" defaultValue="1" className="mt-1 w-full rounded-lg border p-3" /></label>
          <p className="-mt-2 text-xs text-zinc-500 sm:col-span-2">At least one total bin is required; maximum 20 total bins in staging.</p>
          <label className="font-semibold">Trash pickup day *<select required name="trash_weekday" defaultValue="1" className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling pickup day<select name="recycling_weekday" defaultValue="1" className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling frequency<select name="recycling_frequency_weeks" defaultValue="2" className="mt-1 w-full rounded-lg border p-3"><option value="1">Every week</option><option value="2">Every other week</option></select></label>
          <label className="font-semibold">Next recycling pickup<input type="date" name="recycling_anchor_collection_date" className="mt-1 w-full rounded-lg border p-3" /><span className="mt-1 block text-xs font-normal text-zinc-500">Use the actual fictional next pickup date when testing every-other-week recycling.</span></label>
          <label className="font-semibold sm:col-span-2">Return location *<input required name="preferred_return_location" minLength={2} placeholder="Behind side gate / garage / etc." className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold sm:col-span-2">Access instructions<textarea name="access_instructions" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Gate information<input name="gate_information" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Animal warning<input name="animal_warning" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold sm:col-span-2">Staff note<textarea name="staff_note" placeholder="Anything you learned on the phone that staff should know." className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:col-span-2"><strong>Payment:</strong> Not collected yet. Stripe remains disabled while we finish non-payment testing. This record is saved as submitted unpaid so we can verify the complete manual-intake path before payment testing begins.</div>
          <button className="rounded-xl bg-brand-700 p-3 font-black text-white sm:col-span-2">Save manual customer intake</button>
        </form>
      </div>
    </AppShell>
  );
}
