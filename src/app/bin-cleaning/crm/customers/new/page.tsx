import { AppShell } from "@/components/bin-cleaning/AppShell";

export const dynamic = "force-dynamic";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function NewCustomer({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  return (
    <AppShell area="Internal CRM">
      <div className="max-w-4xl">
        <h2 className="text-3xl font-black">Add customer manually</h2>
        <p className="mt-2 text-zinc-600">Use this when somebody calls, texts, or signs up with you directly instead of completing the public form. In staging this creates a separate submitted-unpaid CRM intake record and stops before payment.</p>
        {searchParams.saved && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Manual customer intake saved to the CRM. No payment was collected.</p>}
        {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-900">The customer could not be saved. Check the required fictional test fields.</p>}

        <form action="/api/bin-cleaning/crm/manual-customer" method="post" className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
          <label className="font-semibold">Full name<input required name="full_name" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Email<input required type="email" name="email" placeholder="customer@example.test" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Phone<input required name="phone" placeholder="1-555-123-4567" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Plan<select required name="plan_id" defaultValue="monthly" className="mt-1 w-full rounded-lg border p-3"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select></label>
          <label className="font-semibold sm:col-span-2">Street address<input required name="line1" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Unit / Apt<input name="line2" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">City<input required name="city" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">State<input required name="region" defaultValue="OH" maxLength={2} className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">ZIP<input required name="postal_code" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Trash bins<input required type="number" min="0" max="20" name="trash_bins" defaultValue="1" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Recycling bins<input required type="number" min="0" max="20" name="recycling_bins" defaultValue="1" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Trash pickup day<select required name="trash_weekday" defaultValue="1" className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling pickup day<select name="recycling_weekday" defaultValue="1" className="mt-1 w-full rounded-lg border p-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="font-semibold">Recycling frequency<select name="recycling_frequency_weeks" defaultValue="2" className="mt-1 w-full rounded-lg border p-3"><option value="1">Every week</option><option value="2">Every other week</option></select></label>
          <label className="font-semibold">Next recycling pickup<input type="date" name="recycling_anchor_collection_date" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold sm:col-span-2">Return location<input required name="preferred_return_location" placeholder="Behind side gate / garage / etc." className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold sm:col-span-2">Access instructions<textarea name="access_instructions" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Gate information<input name="gate_information" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold">Animal warning<input name="animal_warning" className="mt-1 w-full rounded-lg border p-3" /></label>
          <label className="font-semibold sm:col-span-2">Staff note<textarea name="staff_note" placeholder="Anything you learned on the phone that staff should know." className="mt-1 w-full rounded-lg border p-3" /></label>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:col-span-2"><strong>Payment:</strong> Not collected. Stripe remains disabled in staging. This record is saved as submitted unpaid so it can be followed up once the payment step is enabled and approved.</div>
          <button className="rounded-xl bg-brand-700 p-3 font-black text-white sm:col-span-2">Save manual customer intake</button>
        </form>
      </div>
    </AppShell>
  );
}
