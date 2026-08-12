"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ads-bin-cleaning-referral-notifications-cleared-at-v1";

type ReferralNotification = Readonly<{
  id: string;
  customerName: string;
  referralCode: string;
  submittedAt: string;
}>;

export function ReferralNotifications({
  referrals,
}: {
  referrals: readonly ReferralNotification[];
}) {
  const [clearedAt, setClearedAt] = useState<number | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    setClearedAt(Number.isFinite(parsed) ? parsed : 0);
  }, []);

  const newReferrals = useMemo(() => {
    if (clearedAt == null) return [];
    return referrals.filter((referral) => {
      const submitted = Date.parse(referral.submittedAt);
      return Number.isFinite(submitted) && submitted > clearedAt;
    });
  }, [clearedAt, referrals]);

  if (clearedAt == null || newReferrals.length === 0) return null;

  function clearNotifications() {
    const now = Date.now();
    window.localStorage.setItem(STORAGE_KEY, String(now));
    setClearedAt(now);
  }

  return (
    <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">
            New referral notification
          </p>
          <h2 className="mt-1 text-lg font-black text-sky-950">
            {newReferrals.length} new referral{newReferrals.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-sky-900">
            {newReferrals
              .slice(0, 3)
              .map((referral) => `${referral.customerName} · ${referral.referralCode}`)
              .join(" • ")}
            {newReferrals.length > 3 ? ` • +${newReferrals.length - 3} more` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={clearNotifications}
          className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-black text-sky-800 hover:bg-sky-100"
        >
          Clear notification{newReferrals.length === 1 ? "" : "s"}
        </button>
      </div>
    </section>
  );
}
