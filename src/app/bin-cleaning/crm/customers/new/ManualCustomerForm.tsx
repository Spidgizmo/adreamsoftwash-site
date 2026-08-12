"use client";

import { FormEvent, useState } from "react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Errors = Record<string, string>;

function fieldClass(hasError: boolean) {
  return `mt-1 w-full rounded-lg border p-3 outline-none ${hasError ? "border-red-600 bg-red-50 ring-2 ring-red-200 focus:border-red-700 focus:ring-red-300" : "focus:border-brand-600 focus:ring-2 focus:ring-brand-100"}`;
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-sm font-bold text-red-700">{message}</span>;
}

export function ManualCustomerForm() {
  const [errors, setErrors] = useState<Errors>({});

  function validate(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const number = (name: string) => Number(value(name));
    const next: Errors = {};

    if (!value("full_name")) next.full_name = "Enter a customer name.";
    if (!value("email")) next.email = "Enter an email value.";
    if (!value("phone")) next.phone = "Enter a phone value.";
    if (!value("line1")) next.line1 = "Enter the service street address.";
    if (!value("city")) next.city = "Enter the city.";
    if (!value("region")) next.region = "Enter the state.";
    if (!value("postal_code")) next.postal_code = "Enter the ZIP code.";

    const trash = number("trash_bins");
    const recycling = number("recycling_bins");
    if (!Number.isInteger(trash) || trash < 0) next.trash_bins = "Enter 0 or more trash bins.";
    if (!Number.isInteger(recycling) || recycling < 0) next.recycling_bins = "Enter 0 or more recycling bins.";
    if (!next.trash_bins && !next.recycling_bins && trash + recycling < 1) {
      next.trash_bins = "At least one total bin is required.";
      next.recycling_bins = "At least one total bin is required.";
    }

    if (!value("trash_weekday")) next.trash_weekday = "Choose the trash pickup day.";
    if (recycling > 0) {
      if (!value("recycling_weekday")) next.recycling_weekday = "Choose the recycling pickup day.";
      if (!["1", "2"].includes(value("recycling_frequency_weeks"))) next.recycling_frequency_weeks = "Choose the recycling frequency.";
    }

    if (!value("preferred_return_location")) next.preferred_return_location = "Enter where ADS should return the bins.";

    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate(event.currentTarget);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => {
        const first = event.currentTarget.querySelector<HTMLElement>("[data-field-error='true']");
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        first?.querySelector<HTMLElement>("input, select, textarea")?.focus();
      });
      return;
    }
    event.currentTarget.submit();
  }

  const invalid = (name: string) => Boolean(errors[name]);

  return (
    <form noValidate onSubmit={handleSubmit} action="/api/bin-cleaning/crm/manual-customer" method="post" className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-900 sm:col-span-2">
          <strong>Please fix the fields marked in red.</strong> All problems are shown at the same time below.
        </div>
      )}

      <label data-field-error={invalid("full_name")} className="font-semibold">Full name *<input name="full_name" className={fieldClass(invalid("full_name"))} /><ErrorText message={errors.full_name} /></label>
      <label data-field-error={invalid("email")} className="font-semibold">Email *<input name="email" placeholder="Any fictional test email/value" className={fieldClass(invalid("email"))} /><ErrorText message={errors.email} /></label>
      <label data-field-error={invalid("phone")} className="font-semibold">Phone *<input name="phone" placeholder="Any fictional test phone/value" className={fieldClass(invalid("phone"))} /><ErrorText message={errors.phone} /></label>
      <label className="font-semibold">Plan *<select name="plan_id" defaultValue="monthly" className={fieldClass(false)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="twice-yearly">Twice a Year</option><option value="one-time">One-Time</option></select></label>
      <label data-field-error={invalid("line1")} className="font-semibold sm:col-span-2">Street address *<input name="line1" className={fieldClass(invalid("line1"))} /><ErrorText message={errors.line1} /></label>
      <label className="font-semibold">Unit / Apt<input name="line2" className={fieldClass(false)} /></label>
      <label data-field-error={invalid("city")} className="font-semibold">City *<input name="city" className={fieldClass(invalid("city"))} /><ErrorText message={errors.city} /></label>
      <label data-field-error={invalid("region")} className="font-semibold">State *<input name="region" defaultValue="OH" className={fieldClass(invalid("region"))} /><ErrorText message={errors.region} /></label>
      <label data-field-error={invalid("postal_code")} className="font-semibold">ZIP *<input name="postal_code" className={fieldClass(invalid("postal_code"))} /><ErrorText message={errors.postal_code} /></label>
      <label data-field-error={invalid("trash_bins")} className="font-semibold">Trash bins *<input type="number" min="0" name="trash_bins" defaultValue="1" className={fieldClass(invalid("trash_bins"))} /><ErrorText message={errors.trash_bins} /></label>
      <label data-field-error={invalid("recycling_bins")} className="font-semibold">Recycling bins *<input type="number" min="0" name="recycling_bins" defaultValue="1" className={fieldClass(invalid("recycling_bins"))} /><ErrorText message={errors.recycling_bins} /></label>
      <p className="-mt-2 text-xs text-zinc-500 sm:col-span-2">At least one total bin is required.</p>
      <label data-field-error={invalid("trash_weekday")} className="font-semibold">Trash pickup day *<select name="trash_weekday" defaultValue="1" className={fieldClass(invalid("trash_weekday"))}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><ErrorText message={errors.trash_weekday} /></label>
      <label data-field-error={invalid("recycling_weekday")} className="font-semibold">Recycling pickup day<select name="recycling_weekday" defaultValue="1" className={fieldClass(invalid("recycling_weekday"))}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><ErrorText message={errors.recycling_weekday} /></label>
      <label data-field-error={invalid("recycling_frequency_weeks")} className="font-semibold">Recycling frequency<select name="recycling_frequency_weeks" defaultValue="2" className={fieldClass(invalid("recycling_frequency_weeks"))}><option value="1">Every week</option><option value="2">Every other week</option></select><ErrorText message={errors.recycling_frequency_weeks} /></label>
      <label className="font-semibold">Next recycling pickup<input type="date" name="recycling_anchor_collection_date" className={fieldClass(false)} /><span className="mt-1 block text-xs font-normal text-zinc-500">Optional during manual testing; add it when you want to test every-other-week schedule anchoring.</span></label>
      <label data-field-error={invalid("preferred_return_location")} className="font-semibold sm:col-span-2">Return location *<input name="preferred_return_location" placeholder="Behind side gate / garage / etc." className={fieldClass(invalid("preferred_return_location"))} /><ErrorText message={errors.preferred_return_location} /></label>
      <label className="font-semibold sm:col-span-2">Access instructions<textarea name="access_instructions" className={fieldClass(false)} /></label>
      <label className="font-semibold">Gate information<input name="gate_information" className={fieldClass(false)} /></label>
      <label className="font-semibold">Animal warning<input name="animal_warning" className={fieldClass(false)} /></label>
      <label className="font-semibold sm:col-span-2">Staff note<textarea name="staff_note" placeholder="Anything you learned on the phone that staff should know." className={fieldClass(false)} /></label>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:col-span-2"><strong>Payment:</strong> Not collected yet. Stripe remains disabled while we finish non-payment testing.</div>
      <button className="rounded-xl bg-brand-700 p-3 font-black text-white sm:col-span-2">Save manual customer intake</button>
    </form>
  );
}
