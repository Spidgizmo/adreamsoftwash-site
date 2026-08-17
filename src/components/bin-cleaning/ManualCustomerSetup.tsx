"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/bin-cleaning-plans";
import {
  PORTAL_PASSWORD_REQUIREMENTS,
  portalPasswordErrors,
} from "@/lib/bin-cleaning/password-policy";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type SetupIdentity = Readonly<{ leadId: string; editToken: string }>;
type SetupLead = Readonly<{
  id: string;
  status: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  planId: string | null;
  binCount: number;
  binStreams: { trash?: number; recycling?: number; other?: number };
  trashWeekday: number | null;
  recyclingWeekday: number | null;
  recyclingFrequencyWeeks: number | null;
  recyclingAnchorCollectionDate: string | null;
  preferredReturnLocation: string | null;
  accessInstructions: string | null;
  gateInformation: string | null;
  animalWarning: string | null;
  safetyNotes: string | null;
  emailAllowed: boolean;
  smsAllowed: boolean;
  phoneAllowed: boolean;
  termsAccepted: boolean;
  estimatedSubtotalCents: number | null;
  estimatedFirstChargeCents: number | null;
  portalIdentityPrepared: boolean;
}>;
type SetupState = "pending_customer_setup" | "submitted_unpaid" | "converted";
type BootstrapResult = Readonly<{
  ok?: boolean;
  error?: string;
  setupState?: SetupState;
  lead?: SetupLead;
}>;

type StepState = "loading" | "ready" | "saving" | "checkout" | "error";

function value(value: string | null | undefined) {
  return value?.trim() || "—";
}
function planName(planId: string | null) {
  if (planId === "monthly") return "Monthly";
  if (planId === "quarterly") return "Quarterly";
  if (planId === "twice-yearly") return "Twice-Yearly";
  if (planId === "one-time") return "One-Time";
  return value(planId);
}
function weekday(value: number | null) {
  return value === null || value < 0 || value > 6 ? "—" : DAYS[value];
}
function cleanDay(value: number | null) {
  return value === null || value < 0 || value > 6 ? "Pending" : DAYS[(value + 1) % 7];
}
function SummaryItem({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div><dt className="text-xs font-black uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 font-semibold text-zinc-950">{children}</dd></div>;
}

export function ManualCustomerSetup() {
  const started = useRef(false);
  const [identity, setIdentity] = useState<SetupIdentity | null>(null);
  const [lead, setLead] = useState<SetupLead | null>(null);
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [stepState, setStepState] = useState<StepState>("loading");
  const [message, setMessage] = useState("Verifying your secure ADS setup link…");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailAllowed, setEmailAllowed] = useState(false);
  const [smsAllowed, setSmsAllowed] = useState(false);
  const [phoneAllowed, setPhoneAllowed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const leadId = fragment.get("lead")?.trim() || "";
    const editToken = fragment.get("token")?.trim() || "";

    // Remove the credential from the visible URL immediately. The original link
    // can be reopened from the customer's message if the page is refreshed.
    window.history.replaceState(null, "", window.location.pathname);

    if (!/^[0-9a-f-]{36}$/i.test(leadId) || editToken.length < 32) {
      setStepState("error");
      setMessage("This setup link is incomplete. Reopen the original secure link that ADS sent you.");
      return;
    }
    const nextIdentity = { leadId, editToken };
    setIdentity(nextIdentity);

    void (async () => {
      try {
        const response = await fetch("/api/bin-cleaning/manual-setup/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(nextIdentity),
        });
        const result = await response.json() as BootstrapResult;
        if (!response.ok || !result.ok || !result.lead || !result.setupState) {
          setStepState("error");
          setMessage(result.error || "This setup link could not be verified.");
          return;
        }
        setLead(result.lead);
        setSetupState(result.setupState);
        setEmailAllowed(result.lead.emailAllowed);
        setSmsAllowed(result.lead.smsAllowed);
        setPhoneAllowed(result.lead.phoneAllowed);
        setTermsAccepted(result.lead.termsAccepted);
        setStepState("ready");
        setMessage(result.setupState === "submitted_unpaid"
          ? "Your account setup is complete. Continue to secure Stripe TEST checkout."
          : result.setupState === "converted"
            ? "This setup has already been paid and converted to a customer account."
            : "Review the information ADS entered, create your portal password, accept the terms, and continue to Stripe TEST checkout.");
      } catch {
        setStepState("error");
        setMessage("The secure setup service could not be reached. Reopen this link and try again.");
      }
    })();
  }, []);

  async function startCheckout() {
    if (!identity) return;
    setStepState("checkout");
    setMessage("Opening secure Stripe TEST checkout…");
    try {
      const response = await fetch("/api/bin-cleaning/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ leadId: identity.leadId, editToken: identity.editToken }),
      });
      const result = await response.json() as { ok?: boolean; checkoutUrl?: string; error?: string };
      if (!response.ok || !result.ok || !result.checkoutUrl) {
        setStepState("error");
        setMessage(result.error || "Stripe TEST checkout could not be started.");
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch {
      setStepState("error");
      setMessage("Stripe TEST checkout could not be reached.");
    }
  }

  async function completeSetup() {
    if (!identity || !lead) return;
    const passwordIssues = portalPasswordErrors(password);
    if (passwordIssues.length) {
      setStepState("error");
      setMessage(PORTAL_PASSWORD_REQUIREMENTS);
      return;
    }
    if (password !== confirmPassword) {
      setStepState("error");
      setMessage("The password confirmation does not match.");
      return;
    }
    if (!emailAllowed || !smsAllowed || !phoneAllowed) {
      setStepState("error");
      setMessage("Confirm all required service communication permissions before continuing.");
      return;
    }
    if (!termsAccepted) {
      setStepState("error");
      setMessage("Accept the ADS Bin Cleaning service and payment terms before continuing.");
      return;
    }

    setStepState("saving");
    setMessage("Preparing your customer portal sign-in…");
    try {
      const accountResponse = await fetch("/api/bin-cleaning/signup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ leadId: identity.leadId, editToken: identity.editToken, password }),
      });
      const accountResult = await accountResponse.json() as { ok?: boolean; error?: string; errors?: string[] };
      if (!accountResponse.ok || !accountResult.ok) {
        setStepState("error");
        setMessage(accountResult.error || accountResult.errors?.join(" ") || "Your portal sign-in could not be prepared.");
        return;
      }

      setMessage("Saving your confirmations and locking the signup for payment…");
      const finalizeResponse = await fetch("/api/bin-cleaning/manual-setup/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          leadId: identity.leadId,
          editToken: identity.editToken,
          emailAllowed,
          smsAllowed,
          phoneAllowed,
          termsAccepted,
        }),
      });
      const finalizeResult = await finalizeResponse.json() as { ok?: boolean; error?: string };
      if (!finalizeResponse.ok || !finalizeResult.ok) {
        setStepState("error");
        setMessage(finalizeResult.error || "Your completed setup could not be saved.");
        return;
      }

      setSetupState("submitted_unpaid");
      await startCheckout();
    } catch {
      setStepState("error");
      setMessage("The account setup service could not be reached. Your card has not been collected by ADS.");
    }
  }

  if (stepState === "loading") {
    return <section className="rounded-2xl border bg-white p-6 shadow-sm"><p className="font-black">{message}</p></section>;
  }
  if (!lead || !setupState) {
    return <section className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-950 shadow-sm"><h2 className="text-xl font-black">Setup link problem</h2><p className="mt-2">{message}</p></section>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-brand-800">ADS Bin Cleaning customer setup</p>
        <h1 className="mt-2 text-3xl font-black">Review the information staff entered</h1>
        <p className="mt-3 text-zinc-700">ADS staff entered this information from your phone signup. No card information is stored here. Your card is entered only on Stripe&apos;s secure TEST checkout after you finish this page.</p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Customer">{value(lead.fullName)}<br/><span className="font-normal">{value(lead.email)} · {value(lead.phone)}</span></SummaryItem>
          <SummaryItem label="Service address">{[lead.line1, lead.line2, lead.city, lead.region, lead.postalCode].filter(Boolean).join(", ") || "—"}</SummaryItem>
          <SummaryItem label="Plan">{planName(lead.planId)} · {lead.binCount} {lead.binCount === 1 ? "bin" : "bins"}</SummaryItem>
          <SummaryItem label="Bins">{lead.binStreams.trash ?? 0} trash · {lead.binStreams.recycling ?? 0} recycling</SummaryItem>
          <SummaryItem label="Pickup / clean day">{weekday(lead.trashWeekday)} pickup → {cleanDay(lead.trashWeekday)} ADS clean day</SummaryItem>
          <SummaryItem label="Return location">{value(lead.preferredReturnLocation)}</SummaryItem>
          <SummaryItem label="Access">{value(lead.accessInstructions)}</SummaryItem>
          <SummaryItem label="Gate / animals">{value(lead.gateInformation)} · {value(lead.animalWarning)}</SummaryItem>
          <SummaryItem label="Estimated first charge">{lead.estimatedFirstChargeCents == null ? "Pending" : `${formatCurrency(lead.estimatedFirstChargeCents)} before tax`}</SummaryItem>
        </dl>
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950">If the service address, plan, bin count, or pickup day above is wrong, contact ADS before paying so staff can correct the intake.</p>
      </section>

      {setupState === "converted" ? (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
          <h2 className="text-2xl font-black">Payment already confirmed</h2>
          <p className="mt-2">This manual signup has already been converted to a customer account from verified Stripe payment.</p>
          <a href="/bin-cleaning/portal" className="mt-4 inline-flex rounded-xl bg-brand-700 px-5 py-3 font-black text-white">Open customer portal</a>
        </section>
      ) : setupState === "submitted_unpaid" ? (
        <section className="rounded-2xl border border-blue-300 bg-blue-50 p-6 text-blue-950 shadow-sm">
          <h2 className="text-2xl font-black">Account setup complete — payment still required</h2>
          <p className="mt-2">Your portal identity and required confirmations are already prepared. Service is not active until a verified Stripe TEST webhook confirms payment.</p>
          <button type="button" onClick={() => void startCheckout()} disabled={stepState === "checkout"} className="mt-4 rounded-xl bg-brand-700 px-5 py-3 font-black text-white disabled:bg-zinc-400">{stepState === "checkout" ? "Opening Stripe TEST checkout…" : "Continue to secure Stripe TEST checkout"}</button>
        </section>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Finish your account</h2>
          <p className="mt-2 text-sm text-zinc-700">Create the password for your customer portal. ADS staff never sees or stores this password.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-bold">Create portal password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border p-3"/><span className="mt-1 block text-xs font-normal text-zinc-500">{PORTAL_PASSWORD_REQUIREMENTS}</span></label>
            <label className="font-bold">Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border p-3"/></label>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl bg-zinc-50 p-4">
            <p className="font-black">Required service communications</p>
            <label className="flex items-start gap-3"><input type="checkbox" checked={emailAllowed} onChange={(event) => setEmailAllowed(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-700"/><span><strong>Email service updates</strong><span className="block text-sm text-zinc-600">Account, scheduling, billing, and service information.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" checked={smsAllowed} onChange={(event) => setSmsAllowed(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-700"/><span><strong>Text-message service updates and completion photos</strong><span className="block text-sm text-zinc-600">Important route notices and before/after completion photos.</span></span></label>
            <label className="flex items-start gap-3"><input type="checkbox" checked={phoneAllowed} onChange={(event) => setPhoneAllowed(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-700"/><span><strong>Phone calls when needed</strong><span className="block text-sm text-zinc-600">Time-sensitive service or access issues.</span></span></label>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-brand-200 bg-brand-50 p-4"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-5 w-5 accent-blue-700"/><span><strong>I accept the ADS Bin Cleaning service and payment terms.</strong><span className="mt-1 block text-sm text-zinc-700">I reviewed the service information above and agree to the service preparation, billing/payment, cancellation, contamination/extra-charge, and applicable promotion/referral terms for this account.</span></span></label>

          <button type="button" onClick={() => void completeSetup()} disabled={stepState === "saving" || stepState === "checkout"} className="mt-6 w-full rounded-xl bg-brand-700 px-5 py-4 font-black text-white disabled:bg-zinc-400">{stepState === "saving" ? "Preparing account…" : stepState === "checkout" ? "Opening Stripe TEST checkout…" : "Create portal account & continue to Stripe TEST checkout"}</button>
        </section>
      )}

      <div role={stepState === "error" ? "alert" : "status"} className={`rounded-xl p-4 text-sm font-bold ${stepState === "error" ? "bg-red-50 text-red-950" : "bg-blue-50 text-blue-950"}`}>{message}</div>
      <p className="text-xs leading-relaxed text-zinc-500">Payment security: returning from Stripe does not activate service by itself. ADS activates the account only after the backend verifies Stripe&apos;s signed TEST webhook and the trusted database records the payment.</p>
    </div>
  );
}
