"use client";

import { useMemo, useState, type ReactNode } from "react";

type CustomerChange = Readonly<{
  id: string;
  requestType: string;
  requestedText: string;
  status: string;
  createdAt: string;
  displayDate: string;
}>;

type AuditEntry = Readonly<{
  id: string;
  action: string;
  entityTable: string;
  createdAt: string;
  displayDate: string;
}>;

type HistoryItem = Readonly<{
  id: string;
  createdAt: string;
  text: string;
  kind: "audit" | "request";
}>;

function highlight(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pieces = text.split(new RegExp(`(${escaped})`, "ig"));
  return pieces.map((piece, index) =>
    piece.toLowerCase() === needle.toLowerCase() ? (
      <mark key={`${piece}-${index}`} className="rounded bg-yellow-200 px-0.5 text-zinc-950">
        {piece}
      </mark>
    ) : (
      piece
    ),
  );
}

export function CustomerHistoryPanels({ changes, audit }: Readonly<{ changes: readonly CustomerChange[]; audit: readonly AuditEntry[] }>) {
  const [query, setQuery] = useState("");

  const combinedHistory = useMemo<HistoryItem[]>(() => {
    const auditItems: HistoryItem[] = audit.map((entry) => ({
      id: `audit-${entry.id}`,
      createdAt: entry.createdAt,
      kind: "audit",
      text: `${entry.action} ${entry.entityTable} · ${entry.displayDate}`,
    }));
    const requestItems: HistoryItem[] = changes.map((change) => ({
      id: `request-${change.id}`,
      createdAt: change.createdAt,
      kind: "request",
      text: `CUSTOMER REQUEST · ${change.requestType.replaceAll("_", " ")} · ${change.status.replaceAll("_", " ")} · ${change.requestedText} · ${change.displayDate}`,
    }));
    return [...auditItems, ...requestItems].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [audit, changes]);

  const matchCount = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? combinedHistory.filter((item) => item.text.toLowerCase().includes(needle)).length : 0;
  }, [combinedHistory, query]);

  return (
    <>
      <details className="card mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <h3 className="text-xl font-black">Customer request history</h3>
            <p className="mt-1 text-sm text-zinc-500">Every customer request remains in permanent history.</p>
          </div>
          <span className="rounded-lg border px-3 py-2 text-xs font-black text-zinc-700">Open / close</span>
        </summary>
        <div className="border-t px-5 pb-5">
          {changes.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No customer requests.</p>
          ) : (
            changes.map((change) => (
              <div key={change.id} className="mt-3 border-t pt-3 first:border-t-0">
                <p className="font-bold capitalize">{change.requestType.replaceAll("_", " ")} · {change.status.replaceAll("_", " ")}</p>
                <p className="text-sm">{change.requestedText}</p>
                <p className="text-xs text-zinc-500">{change.displayDate}</p>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="card mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <h3 className="text-xl font-black">Audit history</h3>
            <p className="mt-1 text-sm text-zinc-500">System activity and customer requests are shown together here.</p>
          </div>
          <span className="rounded-lg border px-3 py-2 text-xs font-black text-zinc-700">Open / close</span>
        </summary>
        <div className="border-t px-5 pb-5">
          <label className="mt-4 block text-sm font-bold text-zinc-900">
            Search and highlight audit history
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try return location, portal login, bins, marketing…"
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <p className="mt-2 text-xs text-zinc-500">
            Search never hides records; it only highlights matches.{query.trim() ? ` ${matchCount} matching ${matchCount === 1 ? "record" : "records"}.` : ""}
          </p>
          <div className="mt-4 max-h-[36rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3">
            {combinedHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No audit history yet.</p>
            ) : (
              combinedHistory.map((item) => (
                <p key={item.id} className={`border-b border-zinc-100 py-2 text-sm last:border-b-0 ${item.kind === "request" ? "font-semibold" : ""}`}>
                  {highlight(item.text, query)}
                </p>
              ))
            )}
          </div>
        </div>
      </details>
    </>
  );
}
