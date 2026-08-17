import { NextRequest, NextResponse } from "next/server";
import { processReferralNotificationOutbox } from "@/lib/bin-cleaning/referral-notification-outbox";
import { armAvailableStripeReferralRewards } from "@/lib/bin-cleaning/stripe-referral-rewards";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function processReferralWork() {
  const matured = await serviceRoleDatabaseRequest<number>("rpc/process_mature_referral_rewards", {
    method: "POST",
    body: "{}",
  });
  const stripeRewards = await armAvailableStripeReferralRewards(50);
  const notifications = await processReferralNotificationOutbox(50);
  return { matured: Number(matured || 0), stripeRewards, notifications };
}

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function browserForm(request: NextRequest) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Cron authorization is required." }, { status: 401 });
  }
  try {
    const result = await processReferralWork();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Referral processing failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!cronAuthorized(request) && session?.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Administrator authorization is required." }, { status: 401 });
  }
  try {
    const result = await processReferralWork();
    if (browserForm(request)) {
      const armed = result.stripeRewards.armed;
      const failures = result.stripeRewards.failures.length;
      const url = new URL("/bin-cleaning/crm", request.url);
      url.searchParams.set("referrals_processed", "1");
      url.searchParams.set("rewards_armed", String(armed));
      if (failures) url.searchParams.set("reward_failures", String(failures));
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch {
    if (browserForm(request)) {
      return NextResponse.redirect(new URL("/bin-cleaning/crm?referrals_process_error=1", request.url), 303);
    }
    return NextResponse.json({ ok: false, error: "Referral processing failed." }, { status: 500 });
  }
}
