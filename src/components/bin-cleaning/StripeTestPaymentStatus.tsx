"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/bin-cleaning-plans";

type Props = Readonly<{ sessionId: string }>;
type StatusResponse = {
  ok?: boolean;
  status?: string;
  paid?: boolean;
  planId?: string;
  binCount?: number;
  firstChargeCents?: number;
  error?: string;
};

export function StripeTestPaymentStatus({ sessionId }: Props) {
  const [result, setResult] = useState<StatusResponse>({ status: "checking" });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let checks = 0;
    const check = async () => {
      checks += 1;
      try {
        const response = await fetch(`/api/bin-cleaning/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = await response.json() as StatusResponse;
        if (stopped) return;
        setResult(payload);
        if (!payload.paid && response.ok && checks < 10) timer = setTimeout(check, 1500);
      } catch {
        if (!stopped) setResult({ error: "Payment confirmation could not be checked yet." });
      }
    };
    void check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!result.paid) return;
    const timer = window.setTimeout(() => {
      window.location.assign("/bin-cleaning/portal?payment=confirmed");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [result.paid]);

  if (result.paid) {
    return (
      <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
        <h2 className="text-2xl font-black">Stripe TEST payment confirmed</h2>
        <p className="mt-3 leading-relaxed">
          Payment is verified. Taking you directly to your customer portal…
        </p>
        <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="font-bold">Plan</dt><dd>{result.planId}</dd></div>
          <div><dt className="font-bold">Bins</dt><dd>{result.binCount}</dd></div>
          <div><dt className="font-bold">First charge</dt><dd>{typeof result.firstChargeCents === "number" ? formatCurrency(result.firstChargeCents) : "—"}</dd></div>
        </dl>
        <a
          href="/bin-cleaning/portal?payment=confirmed"
          className="mt-5 inline-block rounded-xl bg-brand-700 px-5 py-3 font-black text-white"
        >
          Open customer portal now
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <h2 className="text-2xl font-black">Waiting for verified payment confirmation</h2>
      <p className="mt-3 leading-relaxed">Returning from Stripe is not enough to activate service. ADS waits for the signed Stripe webhook and an idempotent database update. Current status: <strong>{result.status || "checking"}</strong>.</p>
      {result.error ? <p className="mt-3 font-bold text-red-800">{result.error}</p> : null}
      <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 font-black text-white">Check again</button>
    </div>
  );
}
