"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ESTIMATED_TOTAL_LABEL,
  MAX_BIN_COUNT,
  MIN_BIN_COUNT,
  NEW25_PROMO_CODE,
  PUBLIC_BIN_CLEANING_PLANS,
  TAX_ESTIMATE_MESSAGE,
  calculateBinCleaningPrice,
  evaluateBinCleaningPromotion,
  formatCurrency,
  normalizeBinCleaningPromoCode,
  type PlanId,
} from "@/lib/bin-cleaning-plans";

type BinCleaningCalculatorProps = {
  showAction?: boolean;
  initialPlanId?: PlanId;
  initialBinCount?: number;
  enablePromoCode?: boolean;
  initialPromoCode?: string;
};

export function BinCleaningCalculator({
  showAction = true,
  initialPlanId = "monthly",
  initialBinCount = 1,
  enablePromoCode = false,
  initialPromoCode = "",
}: BinCleaningCalculatorProps) {
  const normalizedInitialPromo = normalizeBinCleaningPromoCode(initialPromoCode);
  const [planId, setPlanId] = useState<PlanId>(initialPlanId);
  const [binCount, setBinCount] = useState(initialBinCount);
  const [promoEntry, setPromoEntry] = useState(normalizedInitialPromo);
  const [submittedPromoCode, setSubmittedPromoCode] = useState(
    normalizedInitialPromo,
  );
  const plan = PUBLIC_BIN_CLEANING_PLANS.find(
    (item) => item.id === planId,
  )!;
  const price = calculateBinCleaningPrice(plan, binCount);
  const promotion = price
    ? evaluateBinCleaningPromotion(
        submittedPromoCode,
        plan,
        price.subtotalCents,
      )
    : null;

  const applyPromo = () => {
    const normalized = normalizeBinCleaningPromoCode(promoEntry);
    setPromoEntry(normalized);
    setSubmittedPromoCode(normalized);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <fieldset>
        <legend className="text-lg font-bold">Choose a service plan</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PUBLIC_BIN_CLEANING_PLANS.map((item) => (
            <label
              key={item.id}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                planId === item.id
                  ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200"
                  : "border-zinc-200 bg-white hover:border-brand-300"
              }`}
            >
              <input
                className="mr-2 accent-blue-700"
                type="radio"
                name="plan"
                value={item.id}
                checked={planId === item.id}
                onChange={() => setPlanId(item.id)}
              />
              <span className="font-bold">{item.name}</span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                {item.billingLabel}
              </span>
              <span className="mt-3 block text-sm font-bold text-brand-800">
                {item.priceLines[0]}
              </span>
              <span className="mt-1 block text-sm font-semibold text-zinc-700">
                {item.priceLines[1]}
              </span>
            </label>
          ))}
        </div>

        <label htmlFor="bin-count" className="mt-6 block text-sm font-bold">
          Number of bins
        </label>
        <div className="mt-2 flex max-w-xs items-center gap-3">
          <button
            type="button"
            aria-label="Remove one bin"
            onClick={() =>
              setBinCount((count) => Math.max(MIN_BIN_COUNT, count - 1))
            }
            className="h-11 w-11 rounded-lg border border-zinc-300 bg-white text-xl font-bold"
          >
            −
          </button>
          <input
            id="bin-count"
            type="number"
            min={MIN_BIN_COUNT}
            max={MAX_BIN_COUNT}
            step="1"
            value={binCount}
            onChange={(event) => {
              const value = Number(event.target.value);
              setBinCount(
                Number.isInteger(value) &&
                  value >= MIN_BIN_COUNT &&
                  value <= MAX_BIN_COUNT
                  ? value
                  : MIN_BIN_COUNT,
              );
            }}
            className="h-11 w-20 rounded-lg border border-zinc-300 bg-white text-center font-bold"
          />
          <button
            type="button"
            aria-label="Add one bin"
            onClick={() =>
              setBinCount((count) => Math.min(MAX_BIN_COUNT, count + 1))
            }
            className="h-11 w-11 rounded-lg border border-zinc-300 bg-white text-xl font-bold"
          >
            +
          </button>
        </div>

        {enablePromoCode && (
          <div className="mt-7 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <label htmlFor="promo-code" className="block text-sm font-black">
              Promo code
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="promo-code"
                name="promo_code"
                value={promoEntry}
                maxLength={32}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder={NEW25_PROMO_CODE}
                onChange={(event) => setPromoEntry(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyPromo();
                  }
                }}
                className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 font-bold uppercase"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="h-11 rounded-lg bg-brand-700 px-5 font-bold text-white hover:bg-brand-600"
              >
                Apply code
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              New Monthly subscribers can use {NEW25_PROMO_CODE} for 25% off
              the first month. It cannot be combined with the Share 50%. Get
              50%. referral offer or another discount. Final account
              eligibility is verified during checkout.
            </p>
            {promotion?.status === "applied" && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-emerald-100 p-3 text-sm font-bold text-emerald-900"
              >
                {NEW25_PROMO_CODE} applied: 25% off your first Monthly charge.
                Referral discounts cannot be added to this offer.
              </p>
            )}
            {promotion?.status === "ineligible" && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-amber-100 p-3 text-sm font-bold text-amber-950"
              >
                {NEW25_PROMO_CODE} is available only with a new Monthly
                subscription.
              </p>
            )}
            {promotion?.status === "invalid" && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900"
              >
                That promo code is not recognized.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <aside
        aria-live="polite"
        className="rounded-2xl bg-zinc-950 p-6 text-white shadow-xl"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
          Your estimate
        </p>
        <h3 className="mt-2 text-2xl font-bold text-white">{plan.name}</h3>
        <p className="mt-1 text-sm text-zinc-300">
          {binCount} {binCount === 1 ? "bin" : "bins"} · {plan.billingLabel}
        </p>
        {price ? (
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Base price ({plan.binsIncluded} included)</dt>
              <dd>{formatCurrency(price.basePriceCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Additional-bin charges ({price.additionalBinCount})</dt>
              <dd>{formatCurrency(price.additionalBinChargesCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-700 pt-4 font-bold">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(price.subtotalCents)}</dd>
            </div>
            {promotion?.status === "applied" && (
              <div className="flex justify-between gap-4 font-bold text-emerald-300">
                <dt>{NEW25_PROMO_CODE} · first month 25% off</dt>
                <dd>−{formatCurrency(promotion.discountCents)}</dd>
              </div>
            )}
            <div className="border-t border-zinc-700 pt-3">
              <dt className="font-bold">Tax</dt>
              <dd className="mt-1 text-xs leading-relaxed text-zinc-300">
                {TAX_ESTIMATE_MESSAGE}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-zinc-700 pt-4 text-lg font-bold">
              <dt>
                {promotion?.status === "applied"
                  ? "First month before tax"
                  : ESTIMATED_TOTAL_LABEL}
              </dt>
              <dd>
                {formatCurrency(
                  promotion?.status === "applied"
                    ? promotion.firstChargeSubtotalCents
                    : price.subtotalCents,
                )}
              </dd>
            </div>
            {promotion?.status === "applied" && (
              <div className="flex justify-between gap-4 border-t border-zinc-700 pt-3 text-xs text-zinc-300">
                <dt>Later Monthly renewals before tax</dt>
                <dd>{formatCurrency(price.subtotalCents)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-6 rounded-xl bg-zinc-800 p-4 font-bold">
            This plan is not available.
          </p>
        )}
        {showAction &&
          (price ? (
            <Link
              href={`/bin-cleaning/signup?plan=${plan.id}&bins=${binCount}`}
              className="mt-5 inline-flex w-full justify-center rounded-lg bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-500"
            >
              Preview signup
            </Link>
          ) : (
            <button
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-lg bg-zinc-700 px-5 py-3 font-bold text-zinc-400"
            >
              Plan unavailable
            </button>
          ))}
      </aside>
    </div>
  );
}
