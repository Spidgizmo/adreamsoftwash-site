"use client";

import { useState } from "react";

type SetupLinkResult = Readonly<{
  ok?: boolean;
  error?: string;
  setupUrl?: string;
  email?: string | null;
  phone?: string | null;
}>;

export function ManualSetupLinkPanel({
  leadId,
  email,
  phone,
}: Readonly<{
  leadId: string;
  email: string | null;
  phone: string | null;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(email || "");
  const [recipientPhone, setRecipientPhone] = useState(phone || "");
  const [copyMessage, setCopyMessage] = useState("");

  async function issueLink() {
    setBusy(true);
    setError("");
    setCopyMessage("");
    try {
      const response = await fetch("/api/bin-cleaning/crm/manual-customer/setup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ leadId }),
      });
      const result = await response.json() as SetupLinkResult;
      if (!response.ok || !result.ok || !result.setupUrl) {
        setError(result.error || "The secure setup link could not be issued.");
        return;
      }
      setSetupUrl(result.setupUrl);
      setRecipientEmail(result.email || email || "");
      setRecipientPhone(result.phone || phone || "");
    } catch {
      setError("The secure setup-link service could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!setupUrl) return;
    try {
      await navigator.clipboard.writeText(setupUrl);
      setCopyMessage("Secure setup/payment link copied.");
    } catch {
      setCopyMessage("Copy failed on this device. Open the link and use the browser share/copy control instead.");
    }
  }

  const subject = "Finish your ADS Bin Cleaning setup";
  const message = setupUrl
    ? `ADS Bin Cleaning entered your service information. Review it, create your portal password, accept the service/payment terms, and enter your card securely in Stripe TEST here: ${setupUrl}`
    : "";
  const emailHref = setupUrl && recipientEmail
    ? `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    : "#";
  const smsHref = setupUrl && recipientPhone
    ? `sms:${recipientPhone}?&body=${encodeURIComponent(message)}`
    : "#";

  return (
    <section className="mt-5 rounded-2xl border-2 border-blue-300 bg-blue-50 p-5 text-blue-950 shadow-sm">
      <h2 className="text-lg font-black">Manual customer setup/payment link</h2>
      <p className="mt-2 text-sm leading-relaxed">This staff-created customer has not finished account setup yet. Issue a secure link when you need to send or resend it. Reissuing rotates the credential, so any earlier setup link stops working.</p>

      {!setupUrl ? (
        <button type="button" onClick={() => void issueLink()} disabled={busy} className="mt-4 rounded-xl bg-brand-700 px-4 py-3 font-black text-white disabled:bg-zinc-400">
          {busy ? "Issuing secure link…" : "Issue / reissue secure setup link"}
        </button>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <a href={emailHref} aria-disabled={!recipientEmail} className="rounded-xl bg-brand-700 px-4 py-3 text-center font-black text-white">Send setup/payment link by EMAIL</a>
          <a href={smsHref} aria-disabled={!recipientPhone} className="rounded-xl bg-brand-700 px-4 py-3 text-center font-black text-white">Send setup/payment link by TEXT</a>
          <button type="button" onClick={() => void copyLink()} className="rounded-xl border-2 border-brand-700 bg-white px-4 py-3 font-black text-brand-800">Copy setup/payment link</button>
          <a href={setupUrl} target="_blank" rel="noreferrer" className="rounded-xl border-2 border-zinc-700 bg-white px-4 py-3 text-center font-black text-zinc-900">Open customer setup link</a>
          <button type="button" onClick={() => void issueLink()} disabled={busy} className="rounded-xl border border-blue-400 bg-blue-100 px-4 py-3 font-black text-blue-950 md:col-span-2">{busy ? "Reissuing…" : "Invalidate this link and issue a new one"}</button>
        </div>
      )}

      {copyMessage && <p className="mt-3 text-sm font-bold">{copyMessage}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-950">{error}</p>}
      <p className="mt-3 text-xs leading-relaxed text-blue-900">TEST environment: ADS does not deliver real email or SMS here. Email/Text open this device&apos;s composer for the fictional .test / reserved 555 recipient; Copy/Open are the reliable staging test controls.</p>
    </section>
  );
}
