"use client";

import { useEffect, useState } from "react";

export function ReferralShare({ code }: { code: string | null | undefined }) {
  const [origin, setOrigin] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!code) {
    return <p className="mt-3 text-sm text-zinc-600">Not eligible</p>;
  }

  const signupPath = `/bin-cleaning/signup?ref=${encodeURIComponent(code)}`;
  const shareUrl = origin ? `${origin}${signupPath}` : signupPath;
  const subject = "Get 50% off ADS Bin Cleaning";
  const message = `I use ADS Bin Cleaning. Use my referral code ${code} when you sign up for an eligible Monthly plan. You can get 50% off your first eligible base cleaning, and I can get 50% off my next eligible base cleaning after the referral qualifies. ${shareUrl}`;

  async function copy(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch {
      setFeedback("Copy failed. Press and hold the code or link to copy it.");
    }
  }

  async function inviteFriends() {
    const absoluteUrl = `${window.location.origin}${signupPath}`;
    const shareText = `Use my ADS Bin Cleaning referral code ${code}. We can each receive 50% off an eligible base cleaning after the referral qualifies.`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: subject, text: shareText, url: absoluteUrl });
        setFeedback("Referral invitation opened.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copy(absoluteUrl, "Referral link copied.");
  }

  return (
    <div className="mt-4">
      <div className="rounded-xl bg-brand-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-800">
          Permanent referral code
        </p>
        <p className="mt-1 text-2xl font-black tracking-wide text-zinc-950">{code}</p>
        <p className="mt-2 break-all text-sm text-zinc-700">{shareUrl}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={inviteFriends}
          className="rounded-lg bg-brand-700 px-4 py-3 font-bold text-white hover:bg-brand-800 sm:col-span-2"
        >
          Invite friends
        </button>
        <a
          href={`sms:?&body=${encodeURIComponent(message)}`}
          className="rounded-lg border border-brand-300 bg-white px-4 py-3 text-center font-bold text-brand-800 hover:bg-brand-50"
        >
          Text invitation
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
          className="rounded-lg border border-brand-300 bg-white px-4 py-3 text-center font-bold text-brand-800 hover:bg-brand-50"
        >
          Email invitation
        </a>
        <button
          type="button"
          onClick={() => copy(code, "Referral code copied.")}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold text-zinc-800 hover:bg-zinc-50"
        >
          Copy code
        </button>
        <button
          type="button"
          onClick={() => copy(`${window.location.origin}${signupPath}`, "Referral link copied.")}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 font-bold text-zinc-800 hover:bg-zinc-50"
        >
          Copy referral link
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Your phone or computer opens its own messaging or email app. ADS does not
        collect or store your friend&apos;s phone number or email address when you
        use these buttons.
      </p>
      {feedback && (
        <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
          {feedback}
        </p>
      )}
    </div>
  );
}
