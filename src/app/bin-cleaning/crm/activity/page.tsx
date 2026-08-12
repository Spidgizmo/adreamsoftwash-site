import Link from "next/link";
import { AppShell } from "@/components/bin-cleaning/AppShell";
import { databaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChangeRequest = {
  id: string;
  customer_id: string;
  request_type: string;
  requested_value: Record<string, unknown> | null;
  status: string;
  created_at: string;
  customers: { full_name: string } | null;
};
type Note = {
  id: string;
  customer_id: string;
  body: string;
  visibility: string;
  created_at: string;
  customers: { full_name: string } | null;
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value));
}
function requestedText(value: Record<string, unknown> | null) {
  if (!value) return "No details supplied";
  if (typeof value.value === "string") return value.value;
  return Object.entries(value).map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`).join(" · ");
}

export default async function Activity() {
  const [changes, notes] = await Promise.all([
    databaseRequest<ChangeRequest[]>("customer_change_requests?select=id,customer_id,request_type,requested_value,status,created_at,customers(full_name)&order=created_at.desc&limit=100").catch(() => []),
    databaseRequest<Note[]>("customer_notes?select=id,customer_id,body,visibility,created_at,customers(full_name)&order=created_at.desc&limit=100").catch(() => []),
  ]);
  const events = [
    ...changes.map((change) => ({ kind: "Customer request", id: `change-${change.id}`, customerId: change.customer_id, customerName: change.customers?.full_name ?? "Customer", title: change.request_type.replaceAll("_", " "), detail: requestedText(change.requested_value), status: change.status, createdAt: change.created_at })),
    ...notes.map((note) => ({ kind: "Note", id: `note-${note.id}`, customerId: note.customer_id, customerName: note.customers?.full_name ?? "Customer", title: note.visibility.replaceAll("_", " "), detail: note.body, status: "saved", createdAt: note.created_at })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <AppShell area="Internal CRM">
      <section className="card overflow-hidden">
        <div className="border-b p-5">
          <h2 className="text-2xl font-black">Messages & notes</h2>
          <p className="mt-1 text-sm text-zinc-600">Permanent customer requests and staff notes. Reviewing something does not erase it from this history.</p>
        </div>
        {events.length === 0 ? <p className="p-5 text-sm text-zinc-600">No customer requests or notes have been recorded yet.</p> : (
          <div className="divide-y">
            {events.map((event) => (
              <article className="grid gap-2 p-5 md:grid-cols-[180px_1fr_160px]" key={event.id}>
                <div><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{event.kind}</p><Link className="font-black text-brand-700" href={`/bin-cleaning/crm/customers/${event.customerId}`}>{event.customerName}</Link></div>
                <div><p className="font-black capitalize">{event.title}</p><p className="mt-1 text-sm">{event.detail}</p><p className="mt-2 inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold uppercase">{event.status.replaceAll("_", " ")}</p></div>
                <p className="text-sm text-zinc-500 md:text-right">{displayDate(event.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
