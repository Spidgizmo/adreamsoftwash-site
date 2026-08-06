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
  const signupPath = `/bin-cleaning/signup?ref=${encodeURIComponent(code)}`;
  const shareUrl = origin ? `${origin}${signupPath}` : signupPath;
  const subject = `${senderFirstName} sent you 50% off ADS Bin Cleaning`;
  const textMessage = `Hey! ${senderFirstName} thinks your trash bins probably stink—but let’s be honest, everybody’s do. ADS Bin Cleaning professionally cleans, sanitizes, deodorizes, and returns them after pickup. Use ${senderFirstName}'s referral code ${code} for 50% off your first eligible Monthly base cleaning: ${shareUrl} ${senderFirstName} earns a referral reward too—50% for their first qualified referral and 25% for later qualified referrals. Once your ADS account is active, you’ll get your own permanent referral code to share too.`;
  const emailMessage = `Hey,

${senderFirstName} thinks your trash bins probably stink—but let’s be honest, everybody’s do. Trash and recycling bins collect grime, odors, germs, leaked waste, and nasty buildup that a quick hose-off does not really remove.

${senderFirstName} found a solution: ADS Bin Cleaning professionally cleans, sanitizes, and deodorizes the bins after collection, then returns them to the designated storage spot.

${senderFirstName} sent you this referral so you can receive 50% off your first eligible Monthly base cleaning.

Referral code: ${code}

Claim the offer here:
${shareUrl}

Full disclosure: ${senderFirstName} earns a referral reward after your referral qualifies—50% off an eligible base cleaning for their first qualified referral, then 25% off an eligible base cleaning for each later qualified referral.

Once your signup is complete and your ADS account is active, you will receive your own permanent referral code to share with friends and family. Your referred friends can receive 50% off their first eligible Monthly base cleaning, while you can earn 50% for your first qualified referral and 25% for later qualified referrals.

${senderFirstName} thought this might save you the mess of cleaning the bins yourself!`;

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
    const shareText = `${senderFirstName} thinks your trash bins probably stink—but let’s be honest, everybody’s do. ADS Bin Cleaning professionally cleans, sanitizes, deodorizes, and returns them after pickup. Use ${senderFirstName}'s referral code ${code} for 50% off your first eligible Monthly base cleaning. ${senderFirstName} earns 50% for their first qualified referral and 25% for later qualified referrals. Once your ADS account is active, you’ll get your own permanent referral code to share too.`;

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
        <p className="mt-2 text-sm font-semibold text-zinc-800">
          Invitations identify {senderFirstName} as the sender.
        </p>
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
