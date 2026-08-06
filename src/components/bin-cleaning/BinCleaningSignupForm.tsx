"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const STORAGE_KEY = "ads-bin-cleaning-fictional-signup-v1";
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type LeadIdentity = Readonly<{ id: string; editToken: string }>;
type SaveStatus = "incomplete" | "abandoned" | "submitted_unpaid";

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

type SavedState = Readonly<{
  form?: Partial<FormState>;
  lead?: LeadIdentity;
}>;

type SignupFormProps = Readonly<{
  initialPlanId: PlanId;
  initialBinCount: number;
  initialPromoCode: string;
  initialReferralCode: string;
}>;

function initialForm(props: SignupFormProps): FormState {
  const promo = normalizeBinCleaningPromoCode(props.initialPromoCode);
  const referral = normalizeBinCleaningReferralCode(props.initialReferralCode);
  return {
    fictionalDataConfirmed: false,
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "Toledo",
    region: "OH",
    postalCode: "",
    planId: props.initialPlanId,
    trashBins: props.initialBinCount,
    recyclingBins: 0,
    otherBins: 0,
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
    termsAccepted: false,
  };
}

function boundedCount(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(MAX_BIN_COUNT, Math.max(0, parsed))
    : 0;
}

function Field({
  label,
  children,
  hint,
}: Readonly<{
  label: string;
  children: React.ReactNode;
  hint?: string;
}>) {
  return (
    <label className="block text-sm font-bold text-zinc-900">
      {label}
      {children}
      {hint ? (
        <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-600">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";
const areaClass =
  "mt-2 min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";

export function BinCleaningSignupForm(props: SignupFormProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(props));
  const [lead, setLead] = useState<LeadIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error" | "submitted"
  >("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const saveInFlight = useRef(false);
  const submitted = useRef(false);

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
            promoCode: props.initialReferralCode
              ? ""
              : props.initialPromoCode || saved.form?.promoCode || "",
            referralCode:
              props.initialReferralCode || saved.form?.referralCode || "",
          }));
        }
        if (saved.lead?.id && saved.lead.editToken) setLead(saved.lead);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [props.initialPlanId, props.initialPromoCode, props.initialReferralCode]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ form, lead: lead ?? undefined }),
    );
  }, [form, hydrated, lead]);

  const binCount = form.trashBins + form.recyclingBins + form.otherBins;
  const plan =
    PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === form.planId) ??
    PUBLIC_BIN_CLEANING_PLANS[0];
  const price = useMemo(() => {
    if (!plan || binCount < 1 || binCount > MAX_BIN_COUNT) return null;
    return calculateBinCleaningPrice(plan, binCount);
  }, [binCount, plan]);
  const normalizedPromo = normalizeBinCleaningPromoCode(form.promoCode);
  const normalizedReferral = normalizeBinCleaningReferralCode(form.referralCode);
  const promotion =
    plan && price
      ? evaluateBinCleaningPromotion(
          normalizedPromo,
          plan,
          price.subtotalCents,
          binCount,
        )
      : null;
  const referralFormatValid =
    !normalizedReferral ||
    isPlausibleBinCleaningReferralCode(normalizedReferral);
  const referralEligible = Boolean(
    normalizedReferral && referralFormatValid && plan?.referralEligible,
  );
  const referralDiscountCents =
    referralEligible && price ? Math.round(price.subtotalCents * 0.5) : 0;
  const estimatedFirstCharge = price
    ? promotion?.status === "applied"
      ? promotion.firstChargeSubtotalCents
      : price.subtotalCents - referralDiscountCents
    : null;

  const payload = useCallback(
    () => ({
      fictionalDataConfirmed: form.fictionalDataConfirmed,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      line1: form.line1,
      line2: form.line2,
      city: form.city,
      region: form.region,
      postalCode: form.postalCode,
      planId: form.planId,
      binStreams: {
        trash: form.trashBins,
        recycling: form.recyclingBins,
        other: form.otherBins,
      },
      trashWeekday: form.trashWeekday === "" ? null : Number(form.trashWeekday),
      recyclingWeekday:
        form.recyclingWeekday === "" ? null : Number(form.recyclingWeekday),
      recyclingFrequencyWeeks:
        form.recyclingFrequencyWeeks === ""
          ? null
          : Number(form.recyclingFrequencyWeeks),
      recyclingAnchorCollectionDate: form.recyclingAnchorCollectionDate,
      promoCode: normalizedPromo,
      referralCode: normalizedReferral,
      preferredReturnLocation: form.preferredReturnLocation,
      accessInstructions: form.accessInstructions,
      gateInformation: form.gateInformation,
      animalWarning: form.animalWarning,
      safetyNotes: form.safetyNotes,
      emailAllowed: form.emailAllowed,
      smsAllowed: form.smsAllowed,
      phoneAllowed: form.phoneAllowed,
      termsAccepted: form.termsAccepted,
      sourcePath: window.location.pathname + window.location.search,
    }),
    [form, normalizedPromo, normalizedReferral],
  );

  const save = useCallback(
    async (status: SaveStatus, keepalive = false) => {
      if (!form.fictionalDataConfirmed || saveInFlight.current) return false;
      saveInFlight.current = true;
      if (status !== "abandoned") setSaveState("saving");
      try {
        const response = await fetch("/api/bin-cleaning/signup-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          keepalive,
          body: JSON.stringify({
            leadId: lead?.id ?? null,
            editToken: lead?.editToken ?? null,
            status,
            payload: payload(),
          }),
        });
        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          errors?: string[];
          lead?: { id: string; editToken: string; status: string };
        };
        if (!response.ok || !result.ok || !result.lead) {
          setSaveState("error");
          setMessage(result.error || "The fictional signup could not be saved.");
          setErrors(result.errors ?? []);
          return false;
        }
        const identity = {
          id: result.lead.id,
          editToken: result.lead.editToken,
        };
        setLead(identity);
        setErrors([]);
        if (status === "submitted_unpaid") {
          submitted.current = true;
          setSaveState("submitted");
          setMessage(
            "Fictional signup submitted to the staging CRM. No payment was collected and Stripe Checkout did not start.",
          );
        } else if (status !== "abandoned") {
          setSaveState("saved");
          setMessage("Fictional draft saved to the staging CRM.");
        }
        return true;
      } catch {
        if (status !== "abandoned") {
          setSaveState("error");
          setMessage("The staging CRM could not be reached. Your browser copy remains saved.");
        }
        return false;
      } finally {
        saveInFlight.current = false;
      }
    }, [form.fictionalDataConfirmed, lead, payload],
  );

  useEffect(() => {
    if (!hydrated || !form.fictionalDataConfirmed || submitted.current) return;
    const timer = window.setTimeout(() => void save("incomplete"), 900);
    return () => window.clearTimeout(timer);
  }, [form, hydrated, save]);

  useEffect(() => {
    const markAbandoned = () => {
      if (
        !form.fictionalDataConfirmed ||
        submitted.current ||
        document.visibilityState === "visible"
      ) {
        return;
      }
      const body = JSON.stringify({
        leadId: lead?.id ?? null,
        editToken: lead?.editToken ?? null,
        status: "abandoned",
        payload: payload(),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/bin-cleaning/signup-draft",
          new Blob([body], { type: "application/json" }),
        );
      } else {
        void save("abandoned", true);
      }
    };
    document.addEventListener("visibilitychange", markAbandoned);
    window.addEventListener("pagehide", markAbandoned);
    return () => {
      document.removeEventListener("visibilitychange", markAbandoned);
      window.removeEventListener("pagehide", markAbandoned);
    };
  }, [form.fictionalDataConfirmed, lead, payload, save]);

  const setText =
    (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const setChecked =
    (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.checked }));

  const setCount =
    (key: "trashBins" | "recyclingBins" | "otherBins") =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({
        ...current,
        [key]: boundedCount(event.target.value),
      }));

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        void save("submitted_unpaid");
      }}
    >
      <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black text-amber-950">
          Fictional staging data only
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-950">
          This form saves test signups into the staging CRM. Use invented names,
          an email ending in <strong>.test</strong>, a reserved 555 phone number,
          and an invented service address. Stripe is disabled and no payment can
          be accepted here.
        </p>
        <label className="mt-4 flex items-start gap-3 font-bold text-amber-950">
          <input
            type="checkbox"
            checked={form.fictionalDataConfirmed}
            onChange={setChecked("fictionalDataConfirmed")}
            className="mt-1 h-5 w-5 accent-blue-700"
          />
          I confirm every value I enter is fictional test data.
        </label>
      </section>

      <fieldset
        disabled={!form.fictionalDataConfirmed || submitted.current}
        className="space-y-8 disabled:opacity-60"
      >
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">1. Contact and service address</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Full name">
              <input value={form.fullName} onChange={setText("fullName")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="Email address" hint="Use an invented address ending in .test, such as avery@example.test.">
              <input type="email" value={form.email} onChange={setText("email")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="Mobile number" hint="Use a reserved fictional number, such as +1 (555) 010-0123.">
              <input type="tel" value={form.phone} onChange={setText("phone")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="Street address">
              <input value={form.line1} onChange={setText("line1")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="Apartment or unit">
              <input value={form.line2} onChange={setText("line2")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={setText("city")} className={inputClass} autoComplete="off" />
            </Field>
            <Field label="State">
              <input value={form.region} onChange={setText("region")} className={inputClass} maxLength={2} autoComplete="off" />
            </Field>
            <Field label="ZIP code">
              <input value={form.postalCode} onChange={setText("postalCode")} className={inputClass} inputMode="numeric" autoComplete="off" />
            </Field>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">2. Plan and bins</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {PUBLIC_BIN_CLEANING_PLANS.map((item) => (
              <label
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  form.planId === item.id
                    ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                    : "border-zinc-200"
                } ${item.status === "future" ? "opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={item.id}
                  disabled={item.status === "future"}
                  checked={form.planId === item.id}
                  onChange={() => setForm((current) => ({ ...current, planId: item.id }))}
                  className="mr-2 accent-blue-700"
                />
                <span className="font-black">{item.name}</span>
                <span className="mt-2 block text-sm text-zinc-700">{item.priceLines.join(" · ")}</span>
                {item.status === "future" ? <span className="mt-2 block text-xs font-bold uppercase">Coming later</span> : null}
              </label>
            ))}
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            <Field label="Trash bins">
              <input type="number" min={0} max={MAX_BIN_COUNT} value={form.trashBins} onChange={setCount("trashBins")} className={inputClass} />
            </Field>
            <Field label="Recycling bins">
              <input type="number" min={0} max={MAX_BIN_COUNT} value={form.recyclingBins} onChange={setCount("recyclingBins")} className={inputClass} />
            </Field>
            <Field label="Other carts">
              <input type="number" min={0} max={MAX_BIN_COUNT} value={form.otherBins} onChange={setCount("otherBins")} className={inputClass} />
            </Field>
          </div>
          <p className={`mt-3 text-sm font-bold ${binCount > MAX_BIN_COUNT || binCount < 1 ? "text-red-700" : "text-zinc-700"}`}>
            Total: {binCount} {binCount === 1 ? "bin" : "bins"}. The staging maximum is {MAX_BIN_COUNT}.
          </p>
        </section>

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-blue-950">3. Trash and recycling schedule</h2>
          <p className="mt-2 text-sm leading-relaxed text-blue-950">
            ADS cleaning is normally the calendar day after collection. When a recycling bin is included, the first service aligns to a recycling pickup so both carts should be empty. Every-other-week service needs an exact next pickup date as its anchor.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Trash pickup day">
              <select value={form.trashWeekday} onChange={setText("trashWeekday")} className={inputClass}>
                <option value="">Select a day</option>
                {WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>)}
              </select>
            </Field>
            {form.recyclingBins > 0 ? (
              <>
                <Field label="Recycling pickup day">
                  <select value={form.recyclingWeekday} onChange={setText("recyclingWeekday")} className={inputClass}>
                    <option value="">Select a day</option>
                    {WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>)}
                  </select>
                </Field>
                <Field label="Recycling frequency">
                  <select value={form.recyclingFrequencyWeeks} onChange={setText("recyclingFrequencyWeeks")} className={inputClass}>
                    <option value="">Select frequency</option>
                    <option value="1">Every week</option>
                    <option value="2">Every other week</option>
                  </select>
                </Field>
                <Field label="Next scheduled recycling pickup date" hint="The date must fall on the recycling weekday selected above.">
                  <input type="date" value={form.recyclingAnchorCollectionDate} onChange={setText("recyclingAnchorCollectionDate")} className={inputClass} />
                </Field>
              </>
            ) : null}
          </div>
          {form.recyclingBins > 0 && form.trashWeekday && form.recyclingWeekday && form.trashWeekday !== form.recyclingWeekday ? (
            <p className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-950">
              Trash and recycling are on different weekdays. This signup will be saved for staff scheduling review instead of automatic assignment.
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">4. Promo or referral code</h2>
          <p className="mt-2 text-sm text-zinc-700">Use one or the other. They never stack.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Promo code">
              <input
                value={form.promoCode}
                disabled={Boolean(normalizedReferral)}
                onChange={(event) => setForm((current) => ({ ...current, promoCode: event.target.value, referralCode: event.target.value ? "" : current.referralCode }))}
                className={inputClass}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </Field>
            <Field label="Referral code" hint="Short /r/ADS-XXXX-XXXX links automatically place the code here.">
              <input
                value={form.referralCode}
                disabled={Boolean(normalizedPromo)}
                onChange={(event) => setForm((current) => ({ ...current, referralCode: event.target.value, promoCode: event.target.value ? "" : current.promoCode }))}
                className={inputClass}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </Field>
          </div>
          {normalizedReferral && !referralFormatValid ? <p className="mt-3 text-sm font-bold text-red-700">Referral code format is not valid.</p> : null}
          {normalizedReferral && plan && !plan.referralEligible ? <p className="mt-3 text-sm font-bold text-amber-800">Referral discounts apply only to an eligible new Monthly signup.</p> : null}
          {promotion && promotion.status !== "empty" && promotion.status !== "applied" ? <p className="mt-3 text-sm font-bold text-amber-800">That promo is not recognized or is not eligible for this plan and bin count.</p> : null}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">5. Return, access, and safety details</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Designated bin-return location" hint="Standard service includes returning cleaned bins to this chosen location.">
              <input value={form.preferredReturnLocation} onChange={setText("preferredReturnLocation")} className={inputClass} />
            </Field>
            <Field label="Gate information">
              <input value={form.gateInformation} onChange={setText("gateInformation")} className={inputClass} />
            </Field>
            <Field label="Access instructions">
              <textarea value={form.accessInstructions} onChange={setText("accessInstructions")} className={areaClass} />
            </Field>
            <Field label="Animals or pets">
              <textarea value={form.animalWarning} onChange={setText("animalWarning")} className={areaClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Other safety or accessibility details">
                <textarea value={form.safetyNotes} onChange={setText("safetyNotes")} className={areaClass} />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">6. Contact permissions and confirmation</h2>
          <div className="mt-5 space-y-3">
            {([
              ["emailAllowed", "Email updates"],
              ["smsAllowed", "Text-message updates"],
              ["phoneAllowed", "Phone calls when needed"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 font-semibold">
                <input type="checkbox" checked={form[key]} onChange={setChecked(key)} className="h-5 w-5 accent-blue-700" />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-6 flex items-start gap-3 rounded-xl bg-zinc-100 p-4 font-bold">
            <input type="checkbox" checked={form.termsAccepted} onChange={setChecked("termsAccepted")} className="mt-1 h-5 w-5 accent-blue-700" />
            I confirm this fictional staging signup may be saved as submitted but unpaid. No account becomes active and no service is scheduled until later launch steps are completed and approved.
          </label>
        </section>

        <aside className="rounded-3xl bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-300">Fictional estimate</p>
          <h2 className="mt-2 text-2xl font-black text-white">{plan?.name ?? "Select a plan"}</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Bins</dt><dd>{binCount}</dd></div>
            <div className="flex justify-between gap-4"><dt>Regular subtotal</dt><dd>{price ? formatCurrency(price.subtotalCents) : "Pending"}</dd></div>
            {promotion?.status === "applied" ? <div className="flex justify-between gap-4 text-emerald-300"><dt>Promo discount</dt><dd>−{formatCurrency(promotion.discountCents)}</dd></div> : null}
            {referralEligible ? <div className="flex justify-between gap-4 text-emerald-300"><dt>Referred new Monthly customer discount</dt><dd>−{formatCurrency(referralDiscountCents)}</dd></div> : null}
            <div className="flex justify-between gap-4 border-t border-zinc-700 pt-3 text-lg font-black"><dt>Estimated first charge before tax</dt><dd>{estimatedFirstCharge === null ? "Pending" : formatCurrency(estimatedFirstCharge)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-zinc-300">Tax remains a staff-review simulation. Stripe is explicitly disabled. The submit button only saves a submitted-but-unpaid CRM record.</p>
        </aside>

        {message ? (
          <div role={saveState === "error" ? "alert" : "status"} className={`rounded-2xl p-4 text-sm font-bold ${saveState === "error" ? "bg-red-100 text-red-900" : saveState === "submitted" ? "bg-emerald-100 text-emerald-950" : "bg-blue-100 text-blue-950"}`}>
            <p>{message}</p>
            {errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saveState === "saving" || submitted.current}
            className="rounded-xl bg-brand-700 px-6 py-4 text-base font-black text-white shadow hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {saveState === "saving" ? "Saving fictional signup…" : submitted.current ? "Submitted — no payment collected" : "Submit fictional signup — stop before payment"}
          </button>
          <span className="text-sm font-semibold text-zinc-600">
            {saveState === "saved" ? "Draft saved" : lead ? "CRM draft created" : "Draft saves after fictional-data confirmation"}
          </span>
        </div>
      </fieldset>
    </form>
  );
}
