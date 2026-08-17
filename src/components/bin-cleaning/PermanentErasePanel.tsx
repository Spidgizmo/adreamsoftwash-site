type PermanentErasePanelProps = Readonly<{
  kind: "customer" | "signup";
  id: string;
  name: string;
}>;

export function PermanentErasePanel({ kind, id, name }: PermanentErasePanelProps) {
  const noun = kind === "customer" ? "customer" : "signup";
  return (
    <details className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
      <summary className="cursor-pointer font-black text-red-950">
        Danger zone — permanently erase this {noun}
      </summary>
      <div className="mt-4 border-t border-red-200 pt-4 text-sm text-red-950">
        <p className="font-bold">This cannot be undone.</p>
        <p className="mt-2">
          Erasing <strong>{name}</strong> removes the ADS/Supabase record and related
          signup, portal-auth, service, billing-reference, referral, and history data
          that belongs to this record. This is not the same as deactivating an account.
        </p>
        {kind === "signup" && (
          <p className="mt-2 font-semibold">
            If this signup has already become a customer, the erase automatically follows
            that link and permanently erases the complete customer account instead of leaving
            the customer or portal login behind.
          </p>
        )}
        <p className="mt-2 font-semibold">
          If this record has a Stripe TEST customer, Stripe billing is stopped first.
          If Stripe cleanup fails, ADS data is not erased.
        </p>
        <form action="/api/bin-cleaning/crm/permanent-delete" method="post" className="mt-4 max-w-md space-y-3">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <label className="block font-bold">
            Type ERASE to confirm
            <input
              required
              name="confirm"
              autoComplete="off"
              pattern="ERASE"
              placeholder="ERASE"
              className="mt-1 w-full rounded-lg border border-red-300 bg-white p-3"
            />
          </label>
          <button type="submit" className="rounded-xl bg-red-700 px-4 py-3 font-black text-white">
            Permanently erase {noun}
          </button>
        </form>
      </div>
    </details>
  );
}
