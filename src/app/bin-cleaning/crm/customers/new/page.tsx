import { AppShell } from "@/components/bin-cleaning/AppShell";
import { ManualCustomerForm } from "./ManualCustomerForm";

export const dynamic = "force-dynamic";

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
        {searchParams.error && <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-900">The server could not save the customer after local validation passed. Review the test data and try again.</p>}
        <ManualCustomerForm />
      </div>
    </AppShell>
  );
}
