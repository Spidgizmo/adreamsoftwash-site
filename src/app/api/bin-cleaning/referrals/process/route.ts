import { NextRequest, NextResponse } from "next/server";
import { processReferralNotificationOutbox } from "@/lib/bin-cleaning/referral-notification-outbox";
import { currentSession, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function processReferralWork() {
  const matured = await serviceRoleDatabaseRequest<number>("rpc/process_mature_referral_rewards", {
    method: "POST",
    body: "{}",
  });
  const notifications = await processReferralNotificationOutbox(50);
  return { matured: Number(matured || 0), notifications };
}

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
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
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Referral processing failed." }, { status: 500 });
  }
}
