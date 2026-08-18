"use client";

import { useEffect, useState } from "react";

export function ReferralShare({
  code,
  senderName,
}: {
  code: string | null | undefined;
  senderName: string;
}) {
  const [origin, setOrigin] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!code) {
    return <p className="mt-3 text-sm text-zinc-600">Not eligible</p>;
  }

  const senderFirstName = senderName.trim().split(/\s+/)[0] || "A friend";
  const shortPath = `/r/${encodeURIComponent(code)}`;
  const shortUrl = origin ? `${origin}${shortPath}` : shortPath;
  const subject = `${senderFirstName} sent you 50% off ADS Bin Cleaning`;
  const textMessage = `Hey! ${senderFirstName} thinks your bins probably stink—but everybody's do. ADS cleans, sanitizes, deodorizes, and returns them. Get 50% off your first eligible Monthly bin-cleaning charge. Clean My Bins: ${shortUrl} ${senderFirstName} earns a referral reward too. You'll get your own referral code after signup.`;
  const emailMessage = `Hey,\n\n${senderFirstName} thinks your trash bins probably stink—but let’s be honest, everybody’s do. Trash and recycling bins collect grime, odors, germs, leaked waste, and nasty buildup that a quick hose-off does not really remove.\n\n${senderFirstName} found a solution: ADS Bin Cleaning professionally cleans, sanitizes, and deodorizes the bins after collection, then returns them to the designated storage spot.\n\n${senderFirstName} sent you this referral so you can receive 50% off your first eligible Monthly bin-cleaning charge. The referral is attached automatically when you open the signup link.\n\nClean My Bins:\n${shortUrl}\n\nFull disclosure: ${senderFirstName} earns a referral reward after your referral qualifies—50% off their entire next eligible Monthly bin-cleaning charge for their first qualified referral, then 25% off one eligible Monthly bin-cleaning charge for each later qualified referral.\n\nOnce your signup is complete and your ADS account is active, you will receive your own permanent referral code to share with friends and family. Your referred friends can receive 50% off their first eligible Monthly bin-cleaning charge, while you can earn 50% for your first qualified referral and 25% for later qualified referrals. Referral rewards are promotional service credits only and have no cash value.\n\n${senderFirstName} thought this might save you the mess of cleaning the bins yourself!`;

  async function copy(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch {
      setFeedback("Copy failed. Press and hold the code or link to copy it.");
    }
  }

  async function inviteFriends() {
    const absoluteShortUrl = `${window.location.origin}${shortPath}`;
    const shareText = `${senderFirstName} thinks your bins probably stink—but everybody's do. ADS cleans, sanitizes, deodorizes, and returns them. Get 50% off your first eligible Monthly bin-cleaning charge. ${senderFirstName} earns a referral reward too, and you'll get your own referral code after signup.`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: subject,
          text: shareText,
          url: absoluteShortUrl,
        });
        setFeedback("Referral invitation opened.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copy(absoluteShortUrl, "Short referral link copied.");
  }

  return (
    <div className="mt-4">
      <div className="rounded-xl bg-brand-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-800">
          Permanent referral code
        </p>
        <p className="mt-1 text-2xl font-black tracking-wide text-zinc-950">{code}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-800">
          Invitations identify {senderFirstName} as the sender.
        </p>
        <p className="mt-2 text-sm text-zinc-700">
          Your first qualified referral earns 50% off your entire next eligible
          Monthly bin-cleaning charge. Each later qualified referral earns 25%
          off one eligible Monthly bin-cleaning charge. Rewards apply one per
          invoice and do not stack on the same Monthly bill.
        </p>
        <p className="mt-2 text-xs font-semibold text-zinc-600">
          Promotional service credits only; no cash value or cash payout.
        </p>
        <p className="mt-2 break-all text-sm text-zinc-700">{shortUrl}</p>
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
          href={`sms:?&body=${encodeURIComponent(textMessage)}`}
          className="rounded-lg border border-brand-300 bg-white px-4 py-3 text-center font-bold text-brand-800 hover:bg-brand-50"
        >
          Text invitation
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailMessage)}`}
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
          onClick={() =>
            copy(
              `${window.location.origin}${shortPath}`,
              "Short referral link copied.",
            )
          }
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
