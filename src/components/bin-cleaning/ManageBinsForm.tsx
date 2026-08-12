"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/bin-cleaning-plans";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  customerId: string;
  currentTrashBins: number;
  currentRecyclingBins: number;
  basePriceCents: number;
  includedBins: number;
  additionalBinPriceCents: number;
  currentRecyclingWeekday?: number | null;
  currentRecyclingFrequencyWeeks?: number | null;
  currentRecyclingAnchor?: string | null;
};

function priceForBins(basePriceCents: number, includedBins: number, additionalBinPriceCents: number, totalBins: number) {
  return basePriceCents + Math.max(0, totalBins - includedBins) * additionalBinPriceCents;
}

export function ManageBinsForm({
  customerId,
  currentTrashBins,
  currentRecyclingBins,
  basePriceCents,
  includedBins,
  additionalBinPriceCents,
  currentRecyclingWeekday,
  currentRecyclingFrequencyWeeks,
  currentRecyclingAnchor,
}: Props) {
  const [trashBins, setTrashBins] = useState(currentTrashBins);
  const [recyclingBins, setRecyclingBins] = useState(currentRecyclingBins);
  const [frequencyWeeks, setFrequencyWeeks] = useState(currentRecyclingFrequencyWeeks ?? 2);
  const total = trashBins + recyclingBins;
  const currentTotal = currentTrashBins + currentRecyclingBins;
  const currentPrice = useMemo(
    () => priceForBins(basePriceCents, includedBins, additionalBinPriceCents, currentTotal),
    [basePriceCents, includedBins, additionalBinPriceCents, currentTotal],
  );
  const requestedPrice = useMemo(
    () => priceForBins(basePriceCents, includedBins, additionalBinPriceCents, total),
    [basePriceCents, includedBins, additionalBinPriceCents, total],
  );
  const changed = trashBins !== currentTrashBins || recyclingBins !== currentRecyclingBins;

  return (
    <form action="/api/bin-cleaning/portal" method="post" className="mt-4 space-y-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="bin_change_present" value="1" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-semibold">
          Trash bins
          <input
            type="number"
            min="0"
            max="20"
            required
            name="trash_bin_count"
            value={trashBins}
            onChange={(event) => setTrashBins(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>
        <label className="font-semibold">
          Recycling bins
          <input
            type="number"
            min="0"
            max="20"
            required
            name="recycling_bin_count"
            value={recyclingBins}
            onChange={(event) => setRecyclingBins(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>
      </div>

      {recyclingBins > 0 && (
        <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <legend className="px-2 font-black text-blue-950">Recycling pickup schedule</legend>
          <p className="mb-4 text-sm text-blue-950">
            Adding a recycling bin also updates future service scheduling. For every-other-week recycling, the pickup date anchors the correct alternating week.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="font-semibold">
              Pickup day
              <select
                required
                name="bin_recycling_weekday"
                defaultValue={currentRecyclingWeekday ?? ""}
                className="mt-1 w-full rounded-lg border bg-white p-3"
              >
                <option value="">Select day</option>
                {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
            <label className="font-semibold">
              Frequency
              <select
                required
                name="bin_recycling_frequency_weeks"
                value={frequencyWeeks}
                onChange={(event) => setFrequencyWeeks(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border bg-white p-3"
              >
                <option value="1">Every week</option>
                <option value="2">Every other week</option>
              </select>
            </label>
            <label className="font-semibold">
              {frequencyWeeks === 1 ? "Known recycling pickup date" : "Next scheduled recycling pickup"}
              <input
                type="date"
                required
                name="bin_recycling_anchor"
                defaultValue={currentRecyclingAnchor ?? ""}
                className="mt-1 w-full rounded-lg border bg-white p-3"
              />
            </label>
          </div>
        </fieldset>
      )}

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div className="flex justify-between gap-4"><span>Current recurring estimate</span><strong>{formatCurrency(currentPrice)}</strong></div>
        <div className="mt-2 flex justify-between gap-4"><span>New recurring estimate</span><strong>{formatCurrency(requestedPrice)}</strong></div>
        <p className="mt-3 text-xs leading-5 text-zinc-600">
          The new price is scheduled for the next billing renewal. It does not rewrite a past charge. If a service visit is already locked for routing, that visit keeps the bin configuration that was locked with it; this change starts with the next eligible service after that visit.
        </p>
      </div>

      {total < 1 && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">At least one trash or recycling bin is required.</p>}
      <button
        disabled={!changed || total < 1}
        className="w-full rounded-lg bg-brand-700 p-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        Confirm bin change
      </button>
    </form>
  );
}
