import { AppShell } from "@/components/bin-cleaning/AppShell";
import { ManualCustomerForm } from "./ManualCustomerForm";

export const dynamic = "force-dynamic";

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  return (
    <AppShell area="Internal CRM">
      <div className="max-w-4xl">
        <h2 className="text-3xl font-black">Add customer manually</h2>
        <p className="mt-2 text-zinc-600">Use this when somebody calls, texts, or signs up with you directly instead of completing the public form. During testing this creates a separate submitted-unpaid CRM intake record and stops before payment.</p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Testing note:</strong> use made-up customer information. The manual form no longer forces special .test email addresses, reserved phone-number formats, or other artificial staging formats.
        </div>
        {query.saved && <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Manual customer intake saved to the CRM. No payment was collected.</p>}
        {query.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-900">The server could not save the customer after the form passed local validation. Try again and we will trace the save failure if it repeats.</p>}
        <ManualCustomerForm />
      </div>
    </AppShell>
  );
}
