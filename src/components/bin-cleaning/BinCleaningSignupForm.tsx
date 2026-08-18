"use client";

import {
  useCallback,
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
import {
  PORTAL_PASSWORD_REQUIREMENTS,
  portalPasswordErrors,
} from "@/lib/bin-cleaning/password-policy";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const STANDARD_PICKUP_WEEKDAYS = [1, 2, 3, 4, 5] as const;
const baseInputClass = "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-base text-zinc-950 shadow-sm outline-none focus:ring-2";
const baseAreaClass = "mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none focus:ring-2";

type LeadIdentity = Readonly<{ id: string; editToken: string }>;
type SaveStatus = "incomplete" | "abandoned" | "submitted_unpaid";
type SaveState = "idle" | "saving" | "saved" | "error" | "submitted" | "checkout";
type FieldErrors = Record<string, string>;

type FormState = {
  fictionalDataConfirmed: boolean;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  planId: PlanId;
  trashBins: number;
  recyclingBins: number;
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
  marketingAllowed: boolean;
  termsAccepted: boolean;
};

type TextKey = Exclude<
  keyof FormState,
  | "fictionalDataConfirmed"
  | "planId"
  | "trashBins"
  | "recyclingBins"
  | "emailAllowed"
  | "smsAllowed"
  | "phoneAllowed"
  | "marketingAllowed"
  | "termsAccepted"
>;
type BooleanKey = "fictionalDataConfirmed" | "emailAllowed" | "smsAllowed" | "phoneAllowed" | "marketingAllowed" | "termsAccepted";
type CountKey = "trashBins" | "recyclingBins";
type SignupFormProps = Readonly<{ initialPlanId: PlanId; initialBinCount: number; initialPromoCode: string; initialReferralCode: string }>;

function inputClass(error?: string) {
  return `${baseInputClass} ${error ? "border-red-600 bg-red-50 focus:border-red-700 focus:ring-red-200" : "border-zinc-300 focus:border-brand-600 focus:ring-brand-200"}`;
}
function areaClass(error?: string) {
  return `${baseAreaClass} ${error ? "border-red-600 bg-red-50 focus:border-red-700 focus:ring-red-200" : "border-zinc-300 focus:border-brand-600 focus:ring-brand-200"}`;
}

function Field({ label, hint, error, fieldKey, children }: Readonly<{ label: string; hint?: string; error?: string; fieldKey?: string; children: ReactNode }>) {
  return (
    <label data-field={fieldKey} className="block text-sm font-bold text-zinc-900">
      {label}
      {children}
      {error ? <span className="mt-1 block text-xs font-black text-red-700">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-600">{hint}</span> : null}
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
    fictionalDataConfirmed: true,
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    line1: "",
    line2: "",
    city: "Toledo",
    region: "OH",
    postalCode: "",
    planId: props.initialPlanId,
    trashBins: props.initialBinCount,
    recyclingBins: 0,
    trashWeekday: "",
    recyclingWeekday: "",
    recyclingFrequencyWeeks: "",
    recyclingAnchorCollectionDate: "",
    promoCode: referral ? "" : promo,
    referralCode: referral,
    preferredReturnLocation: "",
    accessInstructions: "",
    gateInformation: "",
    animalWarning: "",
    safetyNotes: "",
    emailAllowed: false,
    smsAllowed: false,
    phoneAllowed: false,
    marketingAllowed: false,
    termsAccepted: false,
  };
}

function boundedCount(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(MAX_BIN_COUNT, Math.max(0, parsed)) : 0;
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function firstServiceEstimate(form: FormState): { collection: Date; cleaning: Date; deferred: boolean } | null {
  const today = startOfToday();
  if (form.recyclingBins > 0) {
    const anchor = parseDateOnly(form.recyclingAnchorCollectionDate);
    const frequencyWeeks = Number(form.recyclingFrequencyWeeks || 0);
    if (!anchor || !frequencyWeeks) return null;
    let collection = anchor;
    while (daysBetween(today, collection) <= 0) collection = addDays(collection, frequencyWeeks * 7);
    return { collection, cleaning: addDays(collection, 1), deferred: collection.getTime() !== anchor.getTime() };
  }
  if (form.trashWeekday === "") return null;
  const weekday = Number(form.trashWeekday);
  let delta = (weekday - today.getDay() + 7) % 7;
  const deferred = delta === 0;
  if (deferred) delta = 7;
  const collection = addDays(today, delta);
  return { collection, cleaning: addDays(collection, 1), deferred };
}

function dateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(value);
}

function buildPayload(form: FormState) {
  return {
    fictionalDataConfirmed: true,
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    line1: form.line1,
    line2: form.line2,
    city: form.city,
    region: form.region,
    postalCode: form.postalCode,
    planId: form.planId,
    binStreams: { trash: form.trashBins, recycling: form.recyclingBins, other: 0 },
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
    emailAllowed: form.emailAllowed,
    smsAllowed: form.smsAllowed,
    phoneAllowed: form.phoneAllowed,
    marketingAllowed: form.marketingAllowed,
    termsAccepted: form.termsAccepted,
    sourcePath: window.location.pathname + window.location.search,
  };
}

function validateForSubmit(form: FormState): FieldErrors {
  const result: FieldErrors = {};
  if (!form.fullName.trim()) result.fullName = "Full name is required.";
  if (!form.email.trim()) result.email = "Email is required.";
  if (!form.phone.trim()) result.phone = "Phone number is required.";
  const passwordIssues = portalPasswordErrors(form.password);
  if (passwordIssues.length) result.password = PORTAL_PASSWORD_REQUIREMENTS;
  if (!form.confirmPassword) result.confirmPassword = "Confirm your password.";
  else if (form.confirmPassword !== form.password) result.confirmPassword = "Passwords do not match.";
  if (!form.line1.trim()) result.line1 = "Service address is required.";
  if (!form.city.trim()) result.city = "City is required.";
  if (!form.region.trim()) result.region = "State is required.";
  if (!form.postalCode.trim()) result.postalCode = "ZIP code is required.";
  else if (!/^\d{5}(?:-\d{4})?$/.test(form.postalCode.trim())) result.postalCode = "Enter a valid ZIP code.";
  if (form.trashBins + form.recyclingBins < 1) result.trashBins = "Choose at least one trash or recycling bin.";
  if (!form.trashWeekday) result.trashWeekday = "Trash pickup day is required.";
  else if (!STANDARD_PICKUP_WEEKDAYS.includes(Number(form.trashWeekday) as 1 | 2 | 3 | 4 | 5)) result.trashWeekday = "Trash pickup day must be Monday through Friday.";
  if (form.recyclingBins > 0) {
    if (!form.recyclingWeekday) result.recyclingWeekday = "Recycling pickup day is required.";
    else if (!STANDARD_PICKUP_WEEKDAYS.includes(Number(form.recyclingWeekday) as 1 | 2 | 3 | 4 | 5)) result.recyclingWeekday = "Recycling pickup day must be Monday through Friday.";
    if (!form.recyclingFrequencyWeeks) result.recyclingFrequencyWeeks = "Recycling frequency is required.";
    if (!form.recyclingAnchorCollectionDate) result.recyclingAnchorCollectionDate = "Next recycling pickup date is required.";
    const anchor = parseDateOnly(form.recyclingAnchorCollectionDate);
    if (anchor && form.recyclingWeekday !== "" && anchor.getDay() !== Number(form.recyclingWeekday)) {
      result.recyclingAnchorCollectionDate = `That date is a ${WEEKDAYS[anchor.getDay()]}, but recycling pickup is set to ${WEEKDAYS[Number(form.recyclingWeekday)]}. Change the date or pickup day.`;
    }
  }
  if (!form.preferredReturnLocation.trim()) result.preferredReturnLocation = "Bin return location is required.";
  if (!form.emailAllowed) result.emailAllowed = "Email service permission is required for account, scheduling, billing, and service notices.";
  if (!form.smsAllowed) result.smsAllowed = "Text-message service permission is required so ADS can send service notices and before/after completion photos.";
  if (!form.phoneAllowed) result.phoneAllowed = "Phone-call service permission is required for time-sensitive service or access issues.";
  if (!form.termsAccepted) result.termsAccepted = "Read and accept the ADS Bin Cleaning service and payment terms before continuing.";
  return result;
}

function serverErrorsToFields(items: readonly string[]): FieldErrors {
  const mapped: FieldErrors = {};
  for (const item of items) {
    const lower = item.toLowerCase();
    if (lower.includes("referral code")) mapped.referralCode = item;
    else if (lower.includes("password")) mapped.password = item;
    else if (lower.includes("email service permission")) mapped.emailAllowed = item;
    else if (lower.includes("text-message service permission")) mapped.smsAllowed = item;
    else if (lower.includes("phone-call service permission")) mapped.phoneAllowed = item;
    else if (lower.includes("terms")) mapped.termsAccepted = item;
    else if (lower.includes("recycling pickup date")) mapped.recyclingAnchorCollectionDate = item;
    else if (lower.includes("zip")) mapped.postalCode = item;
    else if (lower.includes("return location")) mapped.preferredReturnLocation = item;
    else if (lower.includes("trash pickup")) mapped.trashWeekday = item;
    else if (lower.includes("recycling pickup day")) mapped.recyclingWeekday = item;
    else if (lower.includes("recycling frequency")) mapped.recyclingFrequencyWeeks = item;
    else if (lower.includes("full name")) mapped.fullName = item;
    else if (lower.includes("service address")) mapped.line1 = item;
    else if (lower.includes("email")) mapped.email = item;
    else if (lower.includes("phone")) mapped.phone = item;
  }
  return mapped;
}

export function BinCleaningSignupForm(props: SignupFormProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(props));
  const [lead, setLead] = useState<LeadIdentity | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validatedReferralCode, setValidatedReferralCode] = useState("");

  const formRef = useRef(form);
  const leadRef = useRef<LeadIdentity | null>(null);
  const submittedRef = useRef(false);
  const savingRef = useRef(false);
  const lastSavedFingerprint = useRef("");

  const updateForm = (next: FormState) => {
    formRef.current = next;
    setForm(next);
  };

  const binCount = form.trashBins + form.recyclingBins;
  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === form.planId) ?? PUBLIC_BIN_CLEANING_PLANS[0];
  const price = useMemo(() => plan && binCount > 0 && binCount <= MAX_BIN_COUNT ? calculateBinCleaningPrice(plan, binCount) : null, [binCount, plan]);
  const normalizedPromo = normalizeBinCleaningPromoCode(form.promoCode);
  const normalizedReferral = normalizeBinCleaningReferralCode(form.referralCode);
  const promotion = plan && price ? evaluateBinCleaningPromotion(normalizedPromo, plan, price.subtotalCents, binCount) : null;
  const referralFormatValid = !normalizedReferral || isPlausibleBinCleaningReferralCode(normalizedReferral);
  const referralEligible = Boolean(normalizedReferral && normalizedReferral === validatedReferralCode && plan?.referralEligible);
  const referralDiscountCents = referralEligible && price ? Math.round(price.subtotalCents * 0.5) : 0;
  const estimatedFirstCharge = price ? promotion?.status === "applied" ? promotion.firstChargeSubtotalCents : price.subtotalCents - referralDiscountCents : null;
  const firstService = useMemo(() => firstServiceEstimate(form), [form]);

  const saveDraft = useCallback(async (status: SaveStatus, keepalive = false) => {
    const currentForm = formRef.current;
    if (savingRef.current) return false;
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
      const result = await response.json() as { ok?: boolean; error?: string; errors?: string[]; lead?: LeadIdentity; referralValidated?: boolean };
      if (!response.ok || !result.ok || !result.lead) {
        if (status !== "abandoned") {
          setSaveState("error");
          setMessage(result.error || "The fictional signup could not be saved.");
          const serverErrors = result.errors ?? [];
          setErrors(serverErrors);
          const mapped = serverErrorsToFields(serverErrors);
          if (Object.keys(mapped).length) setFieldErrors((current) => ({ ...current, ...mapped }));
          if (serverErrors.some((item) => item.toLowerCase().includes("referral"))) setValidatedReferralCode("");
        }
        return false;
      }

      const currentReferral = normalizeBinCleaningReferralCode(currentForm.referralCode);
      setValidatedReferralCode(result.referralValidated && currentReferral ? currentReferral : "");
      setErrors([]);
      const identity = result.lead;
      leadRef.current = identity;
      setLead(identity);
      if (status === "submitted_unpaid") {
        submittedRef.current = true;
        lastSavedFingerprint.current = "";
        setSubmitted(true);
        setSaveState("submitted");
        setMessage("Signup and portal login are prepared. Stripe TEST checkout is the next step; live payments remain blocked.");
      } else {
        lastSavedFingerprint.current = fingerprint;
        if (status !== "abandoned") {
          setSaveState("saved");
          setMessage(currentReferral ? "Referral verified and fictional draft saved." : "Fictional draft saved to the staging CRM.");
        }
      }
      return true;
    } catch {
      if (status !== "abandoned") {
        setSaveState("error");
        setMessage("The staging CRM could not be reached.");
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }, []);

  const preparePortalAccount = useCallback(async () => {
    const identity = leadRef.current;
    if (!identity) {
      setSaveState("error");
      setMessage("Save the signup before creating the portal account.");
      return false;
    }
    setSaveState("saving");
    setMessage("Preparing your customer portal sign-in…");
    try {
      const response = await fetch("/api/bin-cleaning/signup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          leadId: identity.id,
          editToken: identity.editToken,
          password: formRef.current.password,
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; errors?: string[] };
      if (!response.ok || !result.ok) {
        const serverErrors = result.errors ?? [];
        setSaveState("error");
        setMessage(result.error || "The customer portal sign-in could not be prepared.");
        setErrors(serverErrors);
        const mapped = serverErrorsToFields(serverErrors);
        if (Object.keys(mapped).length) setFieldErrors((current) => ({ ...current, ...mapped }));
        return false;
      }
      setErrors([]);
      setSaveState("saved");
      setMessage("Portal sign-in prepared. It stays disabled until Stripe confirms payment.");
      return true;
    } catch {
      setSaveState("error");
      setMessage("The portal account service could not be reached.");
      return false;
    }
  }, []);

  const startCheckout = useCallback(async () => {
    const identity = leadRef.current;
    if (!identity) {
      setSaveState("error");
      setMessage("The submitted signup identity is unavailable. Start a new signup before checkout.");
      return false;
    }
    setSaveState("checkout");
    setMessage("Opening secure Stripe TEST checkout…");
    try {
      const response = await fetch("/api/bin-cleaning/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ leadId: identity.id, editToken: identity.editToken }),
      });
      const result = await response.json() as { ok?: boolean; checkoutUrl?: string; error?: string };
      if (!response.ok || !result.ok || !result.checkoutUrl) {
        setSaveState("error");
        setMessage(result.error || "Stripe TEST checkout could not be started.");
        return false;
      }
      window.location.assign(result.checkoutUrl);
      return true;
    } catch {
      setSaveState("error");
      setMessage("Stripe TEST checkout could not be reached.");
      return false;
    }
  }, []);

  const setText = (key: TextKey) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const next = { ...formRef.current, [key]: event.target.value } as FormState;
    updateForm(next);
    if (fieldErrors[key]) setFieldErrors((current) => { const copy = { ...current }; delete copy[key]; return copy; });
    if (key !== "password" && key !== "confirmPassword" && !submittedRef.current) window.setTimeout(() => void saveDraft("incomplete"), 700);
  };
  const setChecked = (key: BooleanKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...formRef.current, [key]: event.target.checked } as FormState;
    updateForm(next);
    if (fieldErrors[key]) setFieldErrors((current) => { const copy = { ...current }; delete copy[key]; return copy; });
    if (!submittedRef.current) window.setTimeout(() => void saveDraft("incomplete"), 700);
  };
  const setCount = (key: CountKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = boundedCount(event.target.value);
    const next = key === "recyclingBins" && value === 0
      ? { ...formRef.current, recyclingBins: 0, recyclingWeekday: "", recyclingFrequencyWeeks: "", recyclingAnchorCollectionDate: "" }
      : { ...formRef.current, [key]: value };
    updateForm(next as FormState);
    if (fieldErrors[key]) setFieldErrors((current) => { const copy = { ...current }; delete copy[key]; return copy; });
    if (!submittedRef.current) window.setTimeout(() => void saveDraft("incomplete"), 700);
  };
  const setPromoCode = (event: ChangeEvent<HTMLInputElement>) => {
    setValidatedReferralCode("");
    const next = { ...formRef.current, promoCode: event.target.value, referralCode: event.target.value ? "" : formRef.current.referralCode };
    updateForm(next);
    if (!submittedRef.current) window.setTimeout(() => void saveDraft("incomplete"), 700);
  };
  const setReferralCode = (event: ChangeEvent<HTMLInputElement>) => {
    setValidatedReferralCode("");
    const next = { ...formRef.current, referralCode: event.target.value, promoCode: event.target.value ? "" : formRef.current.promoCode };
    updateForm(next);
    if (fieldErrors.referralCode) setFieldErrors((current) => { const copy = { ...current }; delete copy.referralCode; return copy; });
    if (!submittedRef.current) window.setTimeout(() => void saveDraft("incomplete"), 700);
  };

  const startAnother = () => {
    const fresh = initialForm(props);
    formRef.current = fresh;
    leadRef.current = null;
    submittedRef.current = false;
    lastSavedFingerprint.current = "";
    setForm(fresh);
    setLead(null);
    setSubmitted(false);
    setSaveState("idle");
    setMessage("");
    setErrors([]);
    setFieldErrors({});
    setValidatedReferralCode("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const validation = validateForSubmit(formRef.current);
    setFieldErrors(validation);
    if (Object.keys(validation).length) {
      setSaveState("error");
      setMessage("Please fix the highlighted fields before submitting.");
      setErrors([]);
      const first = Object.keys(validation)[0];
      window.setTimeout(() => document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    if (!(await saveDraft("incomplete"))) return;
    if (!(await preparePortalAccount())) return;
    if (await saveDraft("submitted_unpaid")) await startCheckout();
  };

  const weekdayOptions = STANDARD_PICKUP_WEEKDAYS.map((index) => <option value={index} key={WEEKDAYS[index]}>{WEEKDAYS[index]}</option>);

  return (
    <form className="space-y-8" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-amber-950">Staging + Stripe TEST environment</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-950">Use made-up customer information while testing. Checkout is allowed only with Stripe test credentials and test coupons. The server rejects live Stripe keys and live webhook events.</p>
      </section>

      {submitted ? (
        <section className="rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-black text-emerald-950">Signup locked and ready for TEST payment</h2>
          <p className="mt-2 text-sm text-emerald-950">Your portal sign-in is prepared but remains disabled until payment succeeds. A signed Stripe webhook must be verified before the customer account and service are activated.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void startCheckout()} disabled={!lead || saveState === "checkout"} className="rounded-xl bg-brand-700 px-5 py-3 font-black text-white disabled:bg-zinc-400">{saveState === "checkout" ? "Opening Stripe TEST checkout…" : "Retry secure Stripe TEST checkout"}</button>
            <button type="button" onClick={startAnother} className="rounded-xl border border-zinc-400 bg-white px-5 py-3 font-black text-zinc-900">Start another fictional signup</button>
          </div>
        </section>
      ) : null}

      <fieldset disabled={submitted} className="space-y-8 disabled:opacity-60">
        <Section title="1. Contact and service address">
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Full name" fieldKey="fullName" error={fieldErrors.fullName}><input value={form.fullName} onChange={setText("fullName")} className={inputClass(fieldErrors.fullName)} autoComplete="name" /></Field>
            <Field label="Email address" fieldKey="email" error={fieldErrors.email} hint="This email becomes the customer portal sign-in."><input type="email" value={form.email} onChange={setText("email")} className={inputClass(fieldErrors.email)} autoComplete="email" /></Field>
            <Field label="Mobile number" fieldKey="phone" error={fieldErrors.phone} hint="Use fictional test contact information only."><input type="tel" value={form.phone} onChange={setText("phone")} className={inputClass(fieldErrors.phone)} autoComplete="tel" /></Field>
            <Field label="Street address" fieldKey="line1" error={fieldErrors.line1}><input value={form.line1} onChange={setText("line1")} className={inputClass(fieldErrors.line1)} autoComplete="street-address" /></Field>
            <Field label="Apartment or unit"><input value={form.line2} onChange={setText("line2")} className={inputClass()} autoComplete="address-line2" /></Field>
            <Field label="City" fieldKey="city" error={fieldErrors.city}><input value={form.city} onChange={setText("city")} className={inputClass(fieldErrors.city)} autoComplete="address-level2" /></Field>
            <Field label="State" fieldKey="region" error={fieldErrors.region}><input value={form.region} onChange={setText("region")} className={inputClass(fieldErrors.region)} maxLength={2} autoComplete="address-level1" /></Field>
            <Field label="ZIP code" fieldKey="postalCode" error={fieldErrors.postalCode}><input value={form.postalCode} onChange={setText("postalCode")} className={inputClass(fieldErrors.postalCode)} inputMode="numeric" autoComplete="postal-code" /></Field>
          </div>
        </Section>

        <Section title="2. Create your customer portal sign-in" className="border-brand-200 bg-brand-50">
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">You are creating the login for the same customer account used for billing, service history, referrals, photos, bin changes, and cancellation. The login stays inactive until Stripe confirms payment.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Create password" fieldKey="password" error={fieldErrors.password} hint={PORTAL_PASSWORD_REQUIREMENTS}>
              <input type="password" value={form.password} onChange={setText("password")} className={inputClass(fieldErrors.password)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm password" fieldKey="confirmPassword" error={fieldErrors.confirmPassword}>
              <input type="password" value={form.confirmPassword} onChange={setText("confirmPassword")} className={inputClass(fieldErrors.confirmPassword)} autoComplete="new-password" />
            </Field>
          </div>
          <p className="mt-4 text-xs font-semibold text-zinc-600">Your password is sent only to Supabase Auth to create the login. It is not saved in the ADS signup lead or CRM record.</p>
        </Section>

        <Section title="3. Plan and bins">
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {PUBLIC_BIN_CLEANING_PLANS.map((item) => (
              <label key={item.id} className={`rounded-2xl border p-4 ${form.planId === item.id ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200" : "border-zinc-200"} ${item.status === "future" ? "opacity-60" : "cursor-pointer"}`}>
                <input type="radio" name="plan" disabled={item.status === "future"} checked={form.planId === item.id} onChange={() => { setValidatedReferralCode(""); updateForm({ ...formRef.current, planId: item.id }); window.setTimeout(() => void saveDraft("incomplete"), 700); }} className="mr-2 accent-blue-700" />
                <strong>{item.name}</strong>
                <span className="mt-2 block text-sm text-zinc-700">{item.priceLines.join(" · ")}</span>
                {item.status === "future" ? <span className="mt-2 block text-xs font-bold uppercase">Coming later</span> : null}
              </label>
            ))}
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="Trash bins" fieldKey="trashBins" error={fieldErrors.trashBins}><input type="number" min={0} max={MAX_BIN_COUNT} value={form.trashBins} onChange={setCount("trashBins")} className={inputClass(fieldErrors.trashBins)} /></Field>
            <Field label="Recycling bins"><input type="number" min={0} max={MAX_BIN_COUNT} value={form.recyclingBins} onChange={setCount("recyclingBins")} className={inputClass()} /></Field>
          </div>
          <p className={`mt-3 text-sm font-bold ${binCount > MAX_BIN_COUNT || binCount < 1 ? "text-red-700" : "text-zinc-700"}`}>Total: {binCount} {binCount === 1 ? "bin" : "bins"}. The staging maximum is {MAX_BIN_COUNT}.</p>
        </Section>

        <Section title="4. Trash and recycling schedule" className="border-blue-200 bg-blue-50">
          <p className="mt-2 text-sm leading-relaxed text-blue-950">Normal recurring trash and recycling pickup days are Monday through Friday. ADS cleaning is normally the calendar day after collection. A customer who signs up by the calendar day before collection can start with that pickup; a signup on the collection day starts with the following eligible cycle. Holiday collection shifts are handled separately. When a recycling bin is included, the first service aligns to a recycling pickup so both carts should be empty. Every-other-week service needs an exact next pickup date as its anchor.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Trash pickup day" fieldKey="trashWeekday" error={fieldErrors.trashWeekday}><select value={form.trashWeekday} onChange={setText("trashWeekday")} className={inputClass(fieldErrors.trashWeekday)}><option value="">Select a day</option>{weekdayOptions}</select></Field>
            {form.recyclingBins > 0 ? <>
              <Field label="Recycling pickup day" fieldKey="recyclingWeekday" error={fieldErrors.recyclingWeekday}><select value={form.recyclingWeekday} onChange={setText("recyclingWeekday")} className={inputClass(fieldErrors.recyclingWeekday)}><option value="">Select a day</option>{weekdayOptions}</select></Field>
              <Field label="Recycling frequency" fieldKey="recyclingFrequencyWeeks" error={fieldErrors.recyclingFrequencyWeeks}><select value={form.recyclingFrequencyWeeks} onChange={setText("recyclingFrequencyWeeks")} className={inputClass(fieldErrors.recyclingFrequencyWeeks)}><option value="">Select frequency</option><option value="1">Every week</option><option value="2">Every other week</option></select></Field>
              <Field label="Next scheduled recycling pickup date" fieldKey="recyclingAnchorCollectionDate" error={fieldErrors.recyclingAnchorCollectionDate} hint="The date must fall on the selected recycling weekday."><input type="date" value={form.recyclingAnchorCollectionDate} onChange={setText("recyclingAnchorCollectionDate")} className={inputClass(fieldErrors.recyclingAnchorCollectionDate)} /></Field>
            </> : null}
          </div>
          {firstService ? <div className="mt-5 rounded-2xl border border-blue-300 bg-white p-4 text-sm text-blue-950"><p className="font-black">Estimated first cleaning: {dateLabel(firstService.cleaning)}</p><p className="mt-1">Based on an expected collection on {dateLabel(firstService.collection)}. {firstService.deferred ? "Because signup occurred on the normal collection day, that pickup is too late for onboarding, so the estimate starts with the following eligible collection cycle." : "This remains subject to route confirmation until automatic address-to-route assignment is live."}</p></div> : null}
        </Section>

        <Section title="5. Promo or referral code">
          <p className="mt-2 text-sm text-zinc-700">Use one or the other. They never stack. New-customer promotion eligibility is tied to customer and service-address history. Referral discounts appear only after the server confirms a real active referral code.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Promo code"><input value={form.promoCode} disabled={Boolean(normalizedReferral)} onChange={setPromoCode} className={inputClass()} autoCapitalize="characters" autoComplete="off" /></Field>
            <Field label="Referral code" fieldKey="referralCode" error={fieldErrors.referralCode} hint="Short /r/ADS-XXXX-XXXX links automatically place the code here."><input value={form.referralCode} disabled={Boolean(normalizedPromo)} onChange={setReferralCode} className={inputClass(fieldErrors.referralCode)} autoCapitalize="characters" autoComplete="off" /></Field>
          </div>
          {normalizedReferral && !referralFormatValid ? <p className="mt-3 text-sm font-bold text-red-700">Referral code format is not valid.</p> : null}
          {normalizedReferral && referralFormatValid && !referralEligible && !fieldErrors.referralCode ? <p className="mt-3 text-sm font-bold text-zinc-600">Referral code is not applied until the server verifies it.</p> : null}
          {referralEligible ? <p className="mt-3 text-sm font-black text-emerald-700">Referral code verified. The 50% new-customer Monthly discount is applied.</p> : null}
          {normalizedReferral && plan && !plan.referralEligible ? <p className="mt-3 text-sm font-bold text-amber-800">Referral discounts apply only to an eligible new Monthly signup.</p> : null}
          {promotion && promotion.status !== "empty" && promotion.status !== "applied" ? <p className="mt-3 text-sm font-bold text-amber-800">That promo is not recognized or is not eligible for this plan and bin count.</p> : null}
        </Section>

        <Section title="6. Return, access, and safety details">
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Designated bin-return location" fieldKey="preferredReturnLocation" error={fieldErrors.preferredReturnLocation} hint="Standard service includes returning cleaned bins to this chosen location."><input value={form.preferredReturnLocation} onChange={setText("preferredReturnLocation")} className={inputClass(fieldErrors.preferredReturnLocation)} /></Field>
            <Field label="Gate information"><input value={form.gateInformation} onChange={setText("gateInformation")} className={inputClass()} /></Field>
            <Field label="Access instructions"><textarea value={form.accessInstructions} onChange={setText("accessInstructions")} className={areaClass()} /></Field>
            <Field label="Animals or pets"><textarea value={form.animalWarning} onChange={setText("animalWarning")} className={areaClass()} /></Field>
            <div className="md:col-span-2"><Field label="Other safety or accessibility details"><textarea value={form.safetyNotes} onChange={setText("safetyNotes")} className={areaClass()} /></Field></div>
          </div>
        </Section>

        <Section title="7. Service communications, privacy, and confirmation">
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
            <p className="font-black">Service communications are part of ADS Bin Cleaning.</p>
            <p className="mt-2">We may need to contact you about scheduling, weather or service changes, access problems, billing or account issues, questions about your bins, and other information needed to complete your service. After a completed visit, ADS plans to send before-and-after service photos as part of the completion notice.</p>
            <p className="mt-2"><strong>Your privacy matters.</strong> American Dream Softwash (ADS Bin Cleaning) does not sell or rent customer personal information or customer contact lists. Information is used to operate your account, provide your requested services, communicate with you, and work with service providers needed to operate the service.</p>
            <p className="mt-2 font-bold">Email, text-message, and phone service permissions are required for the service account. Promotional marketing below is separate and optional.</p>
          </div>

          <div className="mt-5 space-y-3">
            <label data-field="emailAllowed" className={`flex items-start gap-3 rounded-xl p-3 font-semibold ${fieldErrors.emailAllowed ? "border-2 border-red-600 bg-red-50 text-red-900" : ""}`}><input type="checkbox" checked={form.emailAllowed} onChange={setChecked("emailAllowed")} className="mt-1 h-5 w-5 accent-blue-700" /><span><strong>Email service updates</strong><span className="block text-sm font-normal text-zinc-600">Required for account, scheduling, billing, and service information.</span>{fieldErrors.emailAllowed ? <span className="mt-1 block text-xs font-black text-red-700">{fieldErrors.emailAllowed}</span> : null}</span></label>
            <label data-field="smsAllowed" className={`flex items-start gap-3 rounded-xl p-3 font-semibold ${fieldErrors.smsAllowed ? "border-2 border-red-600 bg-red-50 text-red-900" : ""}`}><input type="checkbox" checked={form.smsAllowed} onChange={setChecked("smsAllowed")} className="mt-1 h-5 w-5 accent-blue-700" /><span><strong>Text-message service updates & before/after photos</strong><span className="block text-sm font-normal text-zinc-600">Required for service completion photos and important text notices.</span>{fieldErrors.smsAllowed ? <span className="mt-1 block text-xs font-black text-red-700">{fieldErrors.smsAllowed}</span> : null}</span></label>
            <label data-field="phoneAllowed" className={`flex items-start gap-3 rounded-xl p-3 font-semibold ${fieldErrors.phoneAllowed ? "border-2 border-red-600 bg-red-50 text-red-900" : ""}`}><input type="checkbox" checked={form.phoneAllowed} onChange={setChecked("phoneAllowed")} className="mt-1 h-5 w-5 accent-blue-700" /><span><strong>Phone calls when needed</strong><span className="block text-sm font-normal text-zinc-600">Required for time-sensitive service or access issues when a call is appropriate.</span>{fieldErrors.phoneAllowed ? <span className="mt-1 block text-xs font-black text-red-700">{fieldErrors.phoneAllowed}</span> : null}</span></label>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="font-black text-zinc-950">Optional marketing offers</p>
            <label className="mt-3 flex items-start gap-3 font-semibold"><input type="checkbox" checked={form.marketingAllowed} onChange={setChecked("marketingAllowed")} className="mt-1 h-5 w-5 accent-blue-700" /><span>Yes, I would like to receive occasional promotions and special offers from <strong>American Dream Softwash (ADS Bin Cleaning)</strong>, including offers for house washing, roof washing, concrete cleaning, bin cleaning, and other exterior-cleaning services.<span className="mt-1 block text-sm font-normal text-zinc-600">Marketing consent is optional and is not required to purchase ADS Bin Cleaning services.</span></span></label>
          </div>

          <div data-field="termsAccepted" className={`mt-6 rounded-2xl border-2 p-4 ${fieldErrors.termsAccepted ? "border-red-600 bg-red-50 text-red-950" : "border-brand-300 bg-brand-50"}`}>
            <a href="/bin-cleaning/terms" target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-brand-700 bg-white px-4 py-2 text-sm font-black text-brand-800 hover:bg-brand-100">Read the full ADS Bin Cleaning Service &amp; Payment Terms →</a>
            <p className="mt-2 text-xs font-semibold text-zinc-600">The terms open in a new tab so you can read them without losing this signup.</p>
            <label className="mt-4 flex items-start gap-3 font-semibold"><input type="checkbox" checked={form.termsAccepted} onChange={setChecked("termsAccepted")} className="mt-1 h-5 w-5 accent-blue-700" /><span><strong>I accept the ADS Bin Cleaning service and payment terms.</strong><span className="mt-1 block text-sm font-normal text-zinc-700">I reviewed the service information and linked terms and agree to the service preparation, billing/payment, cancellation, contamination/extra-charge, and applicable promotion/referral terms for this account.</span></span></label>
            {fieldErrors.termsAccepted ? <p className="mt-2 text-xs font-black text-red-700">{fieldErrors.termsAccepted}</p> : null}
          </div>
        </Section>

        <aside className="rounded-3xl bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-300">Server-checked estimate</p>
          <h2 className="mt-2 text-2xl font-black text-white">{plan?.name ?? "Select a plan"}</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Bins</dt><dd>{binCount}</dd></div>
            <div className="flex justify-between gap-4"><dt>Regular subtotal</dt><dd>{price ? formatCurrency(price.subtotalCents) : "Pending"}</dd></div>
            {promotion?.status === "applied" ? <div className="flex justify-between gap-4 text-emerald-300"><dt>Promo discount</dt><dd>−{formatCurrency(promotion.discountCents)}</dd></div> : null}
            {referralEligible ? <div className="flex justify-between gap-4 text-emerald-300"><dt>Verified referral discount</dt><dd>−{formatCurrency(referralDiscountCents)}</dd></div> : null}
            <div className="flex justify-between gap-4 border-t border-zinc-700 pt-3 text-lg font-black"><dt>Estimated first charge before tax</dt><dd>{estimatedFirstCharge === null ? "Pending" : formatCurrency(estimatedFirstCharge)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-zinc-300">Final plan, bin count, discount eligibility, and cents are recomputed on the server before Stripe TEST checkout. Tax remains a separate launch-readiness item; no browser-provided amount is accepted.</p>
        </aside>

        {message ? <div role={saveState === "error" ? "alert" : "status"} className={`rounded-2xl p-4 text-sm font-bold ${saveState === "error" ? "bg-red-100 text-red-900" : saveState === "submitted" || saveState === "checkout" ? "bg-emerald-100 text-emerald-950" : "bg-blue-100 text-blue-950"}`}><p>{message}</p>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}</div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={saveState === "saving" || saveState === "checkout" || submitted} className="rounded-xl bg-brand-700 px-6 py-4 text-base font-black text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-zinc-400">{saveState === "saving" ? "Preparing account…" : saveState === "checkout" ? "Opening Stripe TEST checkout…" : submitted ? "Submitted" : "Create account & continue to Stripe TEST checkout"}</button>
          <span className="text-sm font-semibold text-zinc-600">{saveState === "saved" ? "Draft saved" : lead ? "CRM draft created" : "A fresh signup starts each time this page is opened"}</span>
        </div>
      </fieldset>
    </form>
  );
}
