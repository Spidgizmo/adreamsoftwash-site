"use client";

import { useState } from "react";

export function ResumePaymentButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resumePayment() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bin-cleaning/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ resumePendingPayment: true }),
      });
      const result = await response.json() as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.ok || !result.checkoutUrl) {
        setError(result.error || "Secure Stripe TEST checkout could not be resumed.");
        setBusy(false);
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch {
      setError("Secure Stripe TEST checkout could not be reached. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void resumePayment()}
        className="w-full rounded-xl bg-brand-700 px-5 py-3 font-black text-white disabled:bg-zinc-400 sm:w-auto"
      >
        {busy ? "Opening Stripe TEST checkout…" : "Continue to secure payment"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
