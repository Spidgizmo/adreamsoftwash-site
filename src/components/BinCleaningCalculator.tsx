"use client";

import Link from "next/link";
import { useState } from "react";
import { PUBLIC_BIN_CLEANING_PLANS, calculateBinCleaningPrice, formatCurrency, type PlanId } from "@/lib/bin-cleaning-plans";

export function BinCleaningCalculator({ showAction = true }: { showAction?: boolean }) {
  const [planId, setPlanId] = useState<PlanId>("monthly");
  const [binCount, setBinCount] = useState(1);
  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === planId)!;
  const price = calculateBinCleaningPrice(plan, binCount);

  return <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
    <fieldset>
      <legend className="text-lg font-bold">Choose a service plan</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PUBLIC_BIN_CLEANING_PLANS.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-4 transition ${planId === item.id ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200" : "border-zinc-200 bg-white hover:border-brand-300"}`}>
          <input className="mr-2 accent-blue-700" type="radio" name="plan" value={item.id} checked={planId === item.id} onChange={() => setPlanId(item.id)} />
          <span className="font-bold">{item.name}</span>
          <span className="mt-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">{item.billingLabel}</span>
          <span className="mt-3 block text-sm font-bold text-brand-800">{item.priceLines[0]}</span>
          <span className="mt-1 block text-sm font-semibold text-zinc-700">{item.priceLines[1]}</span>
        </label>)}
      </div>
      <label htmlFor="bin-count" className="mt-6 block text-sm font-bold">Number of bins</label>
      <div className="mt-2 flex max-w-xs items-center gap-3">
        <button type="button" aria-label="Remove one bin" onClick={() => setBinCount((count) => Math.max(1, count - 1))} className="h-11 w-11 rounded-lg border border-zinc-300 bg-white text-xl font-bold">−</button>
        <input id="bin-count" type="number" min="1" max="20" value={binCount} onChange={(event) => setBinCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} className="h-11 w-20 rounded-lg border border-zinc-300 bg-white text-center font-bold" />
        <button type="button" aria-label="Add one bin" onClick={() => setBinCount((count) => Math.min(20, count + 1))} className="h-11 w-11 rounded-lg border border-zinc-300 bg-white text-xl font-bold">+</button>
      </div>
    </fieldset>
    <aside aria-live="polite" className="rounded-2xl bg-zinc-950 p-6 text-white shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Your estimate</p>
      <h3 className="mt-2 text-2xl font-bold text-white">{plan.name}</h3>
      <p className="mt-1 text-sm text-zinc-300">{binCount} {binCount === 1 ? "bin" : "bins"} · {plan.billingLabel}</p>
      {price ? <dl className="mt-6 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>Base price ({plan.binsIncluded} included)</dt><dd>{formatCurrency(price.basePriceCents)}</dd></div><div className="flex justify-between gap-4"><dt>Additional bins ({price.additionalBinCount})</dt><dd>{formatCurrency(price.additionalBinChargesCents)}</dd></div><div className="flex justify-between gap-4 border-t border-zinc-700 pt-4 text-lg font-bold"><dt>Subtotal</dt><dd>{formatCurrency(price.subtotalCents)}</dd></div></dl> : <p className="mt-6 rounded-xl bg-zinc-800 p-4 font-bold">This plan is not available.</p>}
      <p className="mt-5 text-xs leading-relaxed text-zinc-300">Applicable tax will be calculated from the validated service address during checkout.</p>
      {showAction && (price ? <Link href={`/bin-cleaning/signup?plan=${plan.id}&bins=${binCount}`} className="mt-5 inline-flex w-full justify-center rounded-lg bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-500">Preview signup</Link> : <button disabled className="mt-5 w-full cursor-not-allowed rounded-lg bg-zinc-700 px-5 py-3 font-bold text-zinc-400">Plan unavailable</button>)}
    </aside>
  </div>;
}
