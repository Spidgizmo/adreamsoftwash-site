"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  MAX_BIN_COUNT,
  PUBLIC_BIN_CLEANING_PLANS,
  calculateBinCleaningPrice,
  evaluateBinCleaningPromotion,
  formatCurrency,
  isPlausibleBinCleaningReferralCode,
  normalizeBinCleaningPromoCode,
  normalizeBinCleaningReferralCode,
  type PlanId,
} from "@/lib/bin-cleaning-plans";

// v2 intentionally ignores old browser state that could point at an already-submitted
// signup. Each completed signup must remain its own CRM record.
const STORAGE_KEY = "ads-bin-cleaning-fictional-signup-v2";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const inputClass = "mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";
const areaClass = "mt-2 min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";

type LeadIdentity = Readonly<{ id: string; editToken: string }>;
type SaveStatus = "incomplete" | "abandoned" | "submitted_unpaid";
type SaveState = "idle" | "saving" | "saved" | "error" | "submitted";
type FormState = {
  fictionalDataConfirmed: boolean;
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  planId: PlanId;
  trashBins: number;
  recyclingBins: number;
  otherBins: number;
  trashWeekday: string;
  recyclingWeekday: string;
  recyclingFrequencyWeeks: "" | "1" | "2";
  recyclingAnchorCollectionDate: string;
  promoCode: string;
  referralCode: string;
  preferredReturnLocation: string;
  accessInstructions: string;
  gateInformation: string;
  animalWarning: string;
  safetyNotes: string;
  emailAllowed: boolean;
  smsAllowed: boolean;
  phoneAllowed: boolean;
  termsAccepted: boolean;
};
type TextKey = Exclude<keyof FormState, "fictionalDataConfirmed" | "planId" | "trashBins" | "recyclingBins" | "otherBins" | "emailAllowed" | "smsAllowed" | "phoneAllowed" | "termsAccepted">;
type BooleanKey = "fictionalDataConfirmed" | "emailAllowed" | "smsAllowed" | "phoneAllowed" | "termsAccepted";
type CountKey = "trashBins" | "recyclingBins" | "otherBins";
type SignupFormProps = Readonly<{ initialPlanId: PlanId; initialBinCount: number; initialPromoCode: string; initialReferralCode: string }>;
type SavedState = Readonly<{ form?: Partial<FormState>; lead?: LeadIdentity }>;

function Field({ label, hint, children }: Readonly<{ label: string; hint?: string; children: ReactNode }>) {
  return (
    <label className="block text-sm font-bold text-zinc-900">
      {label}{children}
      {hint ? <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-600">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children, className = "" }: Readonly<{ title: string; children: ReactNode; className?: string }>) {
  return (
    <section className={`rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 ${className}`}>
      <h2 className="text-2xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function initialForm(props: SignupFormProps): FormState {
  const promo = normalizeBinCleaningPromoCode(props.initialPromoCode);
  const referral = normalizeBinCleaningReferralCode(props.initialReferralCode);
  return {
    fictionalDataConfirmed: false,
    fullName: "", email: "", phone: "", line1: "", line2: "", city: "Toledo", region: "OH", postalCode: "",
    planId: props.initialPlanId,
    trashBins: props.initialBinCount, recyclingBins: 0, otherBins: 0,
    trashWeekday: "", recyclingWeekday: "", recyclingFrequencyWeeks: "", recyclingAnchorCollectionDate: "",
    promoCode: referral ? "" : promo, referralCode: referral,
    preferredReturnLocation: "", accessInstructions: "", gateInformation: "", animalWarning: "", safetyNotes: "",
    emailAllowed: false, smsAllowed: false, phoneAllowed: false, termsAccepted: false,
  };
}

function boundedCount(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(MAX_BIN_COUNT, Math.max(0, parsed)) : 0;
}

function buildPayload(form: FormState) {
  return {
    fictionalDataConfirmed: form.fictionalDataConfirmed,
    fullName: form.fullName, email: form.email, phone: form.phone,
    line1: form.line1, line2: form.line2, city: form.city, region: form.region, postalCode: form.postalCode,
    planId: form.planId,
    binStreams: { trash: form.trashBins, recycling: form.recyclingBins, other: form.otherBins },
    trashWeekday: form.trashWeekday === "" ? null : Number(form.trashWeekday),
    recyclingWeekday: form.recyclingBins === 0 || form.recyclingWeekday === "" ? null : Number(form.recyclingWeekday),
    recyclingFrequencyWeeks: form.recyclingBins === 0 || form.recyclingFrequencyWeeks === "" ? null : Number(form.recyclingFrequencyWeeks),
    recyclingAnchorCollectionDate: form.recyclingBins === 0 ? "" : form.recyclingAnchorCollectionDate,
    promoCode: normalizeBinCleaningPromoCode(form.promoCode),
    referralCode: normalizeBinCleaningReferralCode(form.referralCode),
    preferredReturnLocation: form.preferredReturnLocation,
    accessInstructions: form.accessInstructions,
    gateInformation: form.gateInformation,
    animalWarning: form.animalWarning,
    safetyNotes: form.safetyNotes,
    emailAllowed: form.emailAllowed, smsAllowed: form.smsAllowed, phoneAllowed: form.phoneAllowed,
    termsAccepted: form.termsAccepted,
    sourcePath: window.location.pathname + window.location.search,
  };
}

export function BinCleaningSignupForm(props: SignupFormProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(props));
  const [lead, setLead] = useState<LeadIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const formRef = useRef(form);
  const leadRef = useRef<LeadIdentity | null>(null);
  const submittedRef = useRef(false);
  const savingRef = useRef(false);
  const lastSavedFingerprint = useRef("");
  const abandonmentSent = useRef(false);

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { leadRef.current = lead; }, [lead]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        if (saved.form) {
          setForm((current) => ({
            ...current,
            ...saved.form,
            planId: props.initialPlanId,
            promoCode: props.initialReferralCode ? "" : props.initialPromoCode || saved.form?.promoCode || "",
            referralCode: props.initialReferralCode || saved.form?.referralCode || "",
          }));
        }
        if (saved.lead?.id && saved.lead.editToken) {
          leadRef.current = saved.lead;
          setLead(saved.lead);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [props.initialPlanId, props.initialPromoCode, props.initialReferralCode]);

  useEffect(() => {
    if (!hydrated || submittedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, lead: lead ?? undefined }));
  }, [form, hydrated, lead]);

  const binCount = form.trashBins + form.recyclingBins + form.otherBins;
  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === form.planId) ?? PUBLIC_BIN_CLEANING_PLANS[0];
  const price = useMemo(() => plan && binCount > 0 && binCount <= MAX_BIN_COUNT ? calculateBinCleaningPrice(plan, binCount) : null, [binCount, plan]);
  const normalizedPromo = normalizeBinCleaningPromoCode(form.promoCode);
  const normalizedReferral = normalizeBinCleaningReferralCode(form.referralCode);
  const promotion = plan && price ? evaluateBinCleaningPromotion(normalizedPromo, plan, price.subtotalCents, binCount) : null;
  const referralFormatValid = !normalizedReferral || isPlausibleBinCleaningReferralCode(normalizedReferral);
  const referralEligible = Boolean(normalizedReferral && referralFormatValid && plan?.referralEligible);
  const referralDiscountCents = referralEligible && price ? Math.round(price.subtotalCents * 0.5) : 0;
  const estimatedFirstCharge = price ? promotion?.status === "applied" ? promotion.firstChargeSubtotalCents : price.subtotalCents - referralDiscountCents : null;

  const saveDraft = useCallback(async (status: SaveStatus, keepalive = false) => {
    const currentForm = formRef.current;
    if (!currentForm.fictionalDataConfirmed || savingRef.current) return false;
    const payload = buildPayload(currentForm);
    const fingerprint = JSON.stringify(payload);
    if (status === "incomplete" && leadRef.current && fingerprint === lastSavedFingerprint.current) return true;

    savingRef.current = true;
    if (status !== "abandoned") setSaveState("saving");
    try {
      const response = await fetch("/api/bin-cleaning/signup-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        keepalive,
        body: JSON.stringify({ leadId: leadRef.current?.id ?? null, editToken: leadRef.current?.editToken ?? null, status, payload }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; errors?: string[]; lead?: LeadIdentity };
      if (!response.ok || !result.ok || !result.lead) {
        if (status !== "abandoned") {
          setSaveState("error");
          setMessage(result.error || "The fictional signup could not be saved.");
          setErrors(result.errors ?? []);
        }
        return false;
      }

      setErrors([]);
      if (status === "submitted_unpaid") {
        // The submitted row is now permanent. Never retain its edit token in the
        // browser, otherwise the next customer could overwrite this record.
        submittedRef.current = true;
        leadRef.current = null;
        setLead(null);
        lastSavedFingerprint.current = "";
        window.localStorage.removeItem(STORAGE_KEY);
        setSubmitted(true);
        setSaveState("submitted");
        setMessage("Fictional signup submitted to the staging CRM as a separate record. No payment was collected and Stripe Checkout did not start.");
      } else {
        const identity = result.lead;
        leadRef.current = identity;
        setLead(identity);
        lastSavedFingerprint.current = fingerprint;
        if (status !== "abandoned") {
          setSaveState("saved");
          setMessage("Fictional draft saved to the staging CRM.");
        }
      }
      return true;
    } catch {
      if (status !== "abandoned") {
        setSaveState("error");
        setMessage("The staging CRM could not be reached. Your browser copy remains saved.");
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !form.fictionalDataConfirmed || submitted) return;
    const timer = window.setTimeout(() => void saveDraft("incomplete"), 900);
    return () => window.clearTimeout(timer);
  }, [form, hydrated, saveDraft, submitted]);

  useEffect(() => {
    const sendAbandoned = () => {
      if (!formRef.current.fictionalDataConfirmed || submittedRef.current || abandonmentSent.current || !leadRef.current) return;
      abandonmentSent.current = true;
      void saveDraft("abandoned", true);
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") sendAbandoned();
      if (document.visibilityState === "visible") abandonmentSent.current = false;
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", sendAbandoned);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", sendAbandoned);
    };
  }, [saveDraft]);

  const setText = (key: TextKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setChecked = (key: BooleanKey) => (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.checked }));
  const setCount = (key: CountKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = boundedCount(event.target.value);
    setForm((current) => key === "recyclingBins" && next === 0 ? {
      ...current,
      recyclingBins: 0,
      recyclingWeekday: "",
      recyclingFrequencyWeeks: "",
      recyclingAnchorCollectionDate: "",
    } : { ...current, [key]: next });
  };

  const startAnother = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const fresh = initialForm(props);
    formRef.current = fresh;
    leadRef.current = null;
    submittedRef.current = false;
    lastSavedFingerprint.current = "";
    abandonmentSent.current = false;
    setForm(fresh);
    setLead(null);
    setSubmitted(false);
    setSaveState("idle");
    setMessage("");
    setErrors([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const weekdayOptions = WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>);

  return (
    <form className="space-y-8" onSubmit={(event) => { event.preventDefault(); void saveDraft("submitted_unpaid"); }}>
      <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-amber-950">Fictional staging data only</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-950">Use invented names, an email ending in <strong>.test</strong>, a reserved 555 phone number, and an invented address. Stripe is disabled and no payment can be accepted here.</p>
        <label className="mt-4 flex items-start gap-3 font-bold text-amber-950">
          <input type="checkbox" checked={form.fictionalDataConfirmed} onChange={setChecked("fictionalDataConfirmed")} className="mt-1 h-5 w-5 accent-blue-700" />
          I confirm every value I enter is fictional test data.
        </label>
      </section>

      {submitted ? (
        <section className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-black text-emerald-950">Signup saved as its own CRM record</h2>
          <p className="mt-2 text-sm text-emerald-950">This submitted signup is locked. Starting another signup will create a new record instead of changing this customer.</p>
          <button type="button" onClick={startAnother} className="mt-5 rounded-xl bg-brand-700 px-5 py-3 font-black text-white">Start another fictional signup</button>
        </section>
      ) : null}

      <fieldset disabled={!form.fictionalDataConfirmed || submitted} className="space-y-8 disabled:opacity-60">
        <Section title="1. Contact and service address">
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Full name"><input value={form.fullName} onChange={setText("fullName")} className={inputClass} autoComplete="off" /></Field>
            <Field label="Email address" hint="Use a fictional address such as avery@example.test."><input type="email" value={form.email} onChange={setText("email")} className={inputClass} autoComplete="off" /></Field>
            <Field label="Mobile number" hint="Use a reserved number such as +1 (555) 010-0123."><input type="tel" value={form.phone} onChange={setText("phone")} className={inputClass} autoComplete="off" /></Field>
            <Field label="Street address"><input value={form.line1} onChange={setText("line1")} className={inputClass} autoComplete="off" /></Field>
            <Field label="Apartment or unit"><input value={form.line2} onChange={setText("line2")} className={inputClass} autoComplete="off" /></Field>
            <Field label="City"><input value={form.city} onChange={setText("city")} className={inputClass} autoComplete="off" /></Field>
            <Field label="State"><input value={form.region} onChange={setText("region")} className={inputClass} maxLength={2} autoComplete="off" /></Field>
            <Field label="ZIP code"><input value={form.postalCode} onChange={setText("postalCode")} className={inputClass} inputMode="numeric" autoComplete="off" /></Field>
          </div>
        </Section>

        <Section title="2. Plan and bins">
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {PUBLIC_BIN_CLEANING_PLANS.map((item) => (
              <label key={item.id} className={`rounded-2xl border p-4 ${form.planId === item.id ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200" : "border-zinc-200"} ${item.status === "future" ? "opacity-60" : "cursor-pointer"}`}>
                <input type="radio" name="plan" disabled={item.status === "future"} checked={form.planId === item.id} onChange={() => setForm((current) => ({ ...current, planId: item.id }))} className="mr-2 accent-blue-700" />
                <strong>{item.name}</strong>
                <span className="mt-2 block text-sm text-zinc-700">{item.priceLines.join(" · ")}</span>
                {item.status === "future" ? <span className="mt-2 block text-xs font-bold uppercase">Coming later</span> : null}
              </label>
            ))}
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            <Field label="Trash bins"><input type="number" min={0} max={MAX_BIN_COUNT} value={form.trashBins} onChange={setCount("trashBins")} className={inputClass} /></Field>
            <Field label="Recycling bins"><input type="number" min={0} max={MAX_BIN_COUNT} value={form.recyclingBins} onChange={setCount("recyclingBins")} className={inputClass} /></Field>
            <Field label="Other carts"><input type="number" min={0} max={MAX_BIN_COUNT} value={form.otherBins} onChange={setCount("otherBins")} className={inputClass} /></Field>
          </div>
          <p className={`mt-3 text-sm font-bold ${binCount > MAX_BIN_COUNT || binCount < 1 ? "text-red-700" : "text-zinc-700"}`}>Total: {binCount} {binCount === 1 ? "bin" : "bins"}. The staging maximum is {MAX_BIN_COUNT}.</p>
        </Section>

        <Section title="3. Trash and recycling schedule" className="border-blue-200 bg-blue-50">
          <p className="mt-2 text-sm leading-relaxed text-blue-950">ADS cleaning is normally the calendar day after collection. When a recycling bin is included, the first service aligns to a recycling pickup so both carts should be empty. Every-other-week service needs an exact next pickup date as its anchor.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Trash pickup day"><select value={form.trashWeekday} onChange={setText("trashWeekday")} className={inputClass}><option value="">Select a day</option>{weekdayOptions}</select></Field>
            {form.recyclingBins > 0 ? <>
              <Field label="Recycling pickup day"><select value={form.recyclingWeekday} onChange={setText("recyclingWeekday")} className={inputClass}><option value="">Select a day</option>{weekdayOptions}</select></Field>
              <Field label="Recycling frequency"><select value={form.recyclingFrequencyWeeks} onChange={setText("recyclingFrequencyWeeks")} className={inputClass}><option value="">Select frequency</option><option value="1">Every week</option><option value="2">Every other week</option></select></Field>
              <Field label="Next scheduled recycling pickup date" hint="The date must fall on the selected recycling weekday."><input type="date" value={form.recyclingAnchorCollectionDate} onChange={setText("recyclingAnchorCollectionDate")} className={inputClass} /></Field>
            </> : null}
          </div>
          {form.recyclingBins > 0 && form.trashWeekday && form.recyclingWeekday && form.trashWeekday !== form.recyclingWeekday ? <p className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-950">Trash and recycling are on different weekdays. This signup will be saved for staff scheduling review instead of automatic assignment.</p> : null}
        </Section>

        <Section title="4. Promo or referral code">
          <p className="mt-2 text-sm text-zinc-700">Use one or the other. They never stack.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Promo code"><input value={form.promoCode} disabled={Boolean(normalizedReferral)} onChange={(event) => setForm((current) => ({ ...current, promoCode: event.target.value, referralCode: event.target.value ? "" : current.referralCode }))} className={inputClass} autoCapitalize="characters" autoComplete="off" /></Field>
            <Field label="Referral code" hint="Short /r/ADS-XXXX-XXXX links automatically place the code here."><input value={form.referralCode} disabled={Boolean(normalizedPromo)} onChange={(event) => setForm((current) => ({ ...current, referralCode: event.target.value, promoCode: event.target.value ? "" : current.promoCode }))} className={inputClass} autoCapitalize="characters" autoComplete="off" /></Field>
          </div>
          {normalizedReferral && !referralFormatValid ? <p className="mt-3 text-sm font-bold text-red-700">Referral code format is not valid.</p> : null}
          {normalizedReferral && plan && !plan.referralEligible ? <p className="mt-3 text-sm font-bold text-amber-800">Referral discounts apply only to an eligible new Monthly signup.</p> : null}
          {referralEligible ? <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-950">The referred new Monthly customer receives 50% off the first eligible Monthly base cleaning. The referrer reward is separate: 50% for their first qualified lifetime referral, then 25% for later qualified referrals. This signup is not qualified until payment occurs.</p> : null}
          {promotion && promotion.status !== "empty" && promotion.status !== "applied" ? <p className="mt-3 text-sm font-bold text-amber-800">That promo is not recognized or is not eligible for this plan and bin count.</p> : null}
        </Section>

        <Section title="5. Return, access, and safety details">
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Designated bin-return location" hint="Standard service includes returning cleaned bins to this chosen location."><input value={form.preferredReturnLocation} onChange={setText("preferredReturnLocation")} className={inputClass} /></Field>
            <Field label="Gate information"><input value={form.gateInformation} onChange={setText("gateInformation")} className={inputClass} /></Field>
            <Field label="Access instructions"><textarea value={form.accessInstructions} onChange={setText("accessInstructions")} className={areaClass} /></Field>
            <Field label="Animals or pets"><textarea value={form.animalWarning} onChange={setText("animalWarning")} className={areaClass} /></Field>
            <div className="md:col-span-2"><Field label="Other safety or accessibility details"><textarea value={form.safetyNotes} onChange={setText("safetyNotes")} className={areaClass} /></Field></div>
          </div>
        </Section>

        <Section title="6. Contact permissions and confirmation">
          <div className="mt-5 space-y-3">
            {([ ["emailAllowed", "Email updates"], ["smsAllowed", "Text-message updates"], ["phoneAllowed", "Phone calls when needed"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={form[key]} onChange={setChecked(key)} className="h-5 w-5 accent-blue-700" />{label}</label>)}
          </div>
          <label className="mt-6 flex items-start gap-3 rounded-xl bg-zinc-100 p-4 font-bold"><input type="checkbox" checked={form.termsAccepted} onChange={setChecked("termsAccepted")} className="mt-1 h-5 w-5 accent-blue-700" />I confirm this fictional staging signup may be saved as submitted but unpaid. No account becomes active and no service is scheduled until later launch steps are completed and approved.</label>
        </Section>

        <aside className="rounded-3xl bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-300">Fictional estimate</p>
          <h2 className="mt-2 text-2xl font-black text-white">{plan?.name ?? "Select a plan"}</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Bins</dt><dd>{binCount}</dd></div>
            <div className="flex justify-between gap-4"><dt>Regular subtotal</dt><dd>{price ? formatCurrency(price.subtotalCents) : "Pending"}</dd></div>
            {promotion?.status === "applied" ? <div className="flex justify-between gap-4 text-emerald-300"><dt>Promo discount</dt><dd>−{formatCurrency(promotion.discountCents)}</dd></div> : null}
            {referralEligible ? <div className="flex justify-between gap-4 text-emerald-300"><dt>New-customer referral discount (always 50% when eligible)</dt><dd>−{formatCurrency(referralDiscountCents)}</dd></div> : null}
            <div className="flex justify-between gap-4 border-t border-zinc-700 pt-3 text-lg font-black"><dt>Estimated first charge before tax</dt><dd>{estimatedFirstCharge === null ? "Pending" : formatCurrency(estimatedFirstCharge)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-zinc-300">Tax remains a staff-review simulation. Stripe is explicitly disabled. The submit button only saves a submitted-but-unpaid CRM record.</p>
        </aside>

        {message ? <div role={saveState === "error" ? "alert" : "status"} className={`rounded-2xl p-4 text-sm font-bold ${saveState === "error" ? "bg-red-100 text-red-900" : saveState === "submitted" ? "bg-emerald-100 text-emerald-950" : "bg-blue-100 text-blue-950"}`}><p>{message}</p>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}</div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={saveState === "saving" || submitted} className="rounded-xl bg-brand-700 px-6 py-4 text-base font-black text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-zinc-400">{saveState === "saving" ? "Saving fictional signup…" : submitted ? "Submitted — no payment collected" : "Submit fictional signup — stop before payment"}</button>
          <span className="text-sm font-semibold text-zinc-600">{saveState === "saved" ? "Draft saved" : lead ? "CRM draft created" : "Draft saves after fictional-data confirmation"}</span>
        </div>
      </fieldset>
    </form>
  );
}
