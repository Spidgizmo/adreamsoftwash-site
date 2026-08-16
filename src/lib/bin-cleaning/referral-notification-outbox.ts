import nodemailer from "nodemailer";
import { simulateNotification } from "@/lib/bin-cleaning/test-integration-simulators";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type ReferralNotificationKind =
  | "referred_customer_welcome"
  | "referrer_joined_pending"
  | "referrer_reward_qualified";

type OutboxRow = {
  id: string;
  kind: ReferralNotificationKind;
  recipient_email: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type NotificationCopy = { subject: string; body: string };

function text(payload: Record<string, unknown>, key: string, fallback: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(payload: Record<string, unknown>, key: string, fallback: number) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "https://acleanbin.com"
  ).replace(/\/$/, "");
}

export function referralNotificationCopy(row: Pick<OutboxRow, "kind" | "payload">): NotificationCopy {
  const portalUrl = `${appBaseUrl()}${text(row.payload, "portalPath", "/bin-cleaning/portal")}`;
  const recipientFirstName = text(row.payload, "recipientFirstName", "there");
  const referredFirstName = text(row.payload, "referredFirstName", "Your referral");
  const referrerFirstName = text(row.payload, "referrerFirstName", "Your friend");

  if (row.kind === "referred_customer_welcome") {
    const code = text(row.payload, "referralCode", "available in your portal");
    const firstPercent = number(row.payload, "firstRewardPercent", 50);
    const laterPercent = number(row.payload, "laterRewardPercent", 25);
    return {
      subject: `Welcome to ADS Bin Cleaning — ${referrerFirstName} referred you`,
      body: [
        `Hi ${recipientFirstName},`,
        "",
        `Thanks for joining ADS Bin Cleaning. ${referrerFirstName} referred you and thanks you for subscribing.`,
        "",
        `Your own permanent referral code is ${code}. You can always find it, your referral link, and your reward activity in your customer portal:`,
        portalUrl,
        "",
        `Just like ${referrerFirstName}, your first qualified referral earns ${firstPercent}% off one eligible Monthly base cleaning. Each later qualified referral earns ${laterPercent}% off one eligible Monthly base cleaning. Rewards are applied one per eligible Monthly invoice.`,
        "",
        "Thanks for choosing ADS Bin Cleaning.",
      ].join("\n"),
    };
  }

  if (row.kind === "referrer_joined_pending") {
    return {
      subject: `${referredFirstName} joined with your ADS referral`,
      body: [
        `Hi ${recipientFirstName},`,
        "",
        `${referredFirstName} joined ADS Bin Cleaning using your referral.`,
        "",
        "The referral is now in progress. Your reward will move into available credit after the referred customer's first eligible paid service is completed and the referral hold clears.",
        "",
        `You can follow its status in your customer portal: ${portalUrl}`,
      ].join("\n"),
    };
  }

  const percent = number(row.payload, "rewardPercent", 25);
  return {
    subject: `Your ${percent}% ADS referral reward is ready`,
    body: [
      `Hi ${recipientFirstName},`,
      "",
      `${referredFirstName}'s referral has qualified. Your ${percent}% reward is now available in your customer portal.`,
      "",
      "ADS applies one qualified referral reward per eligible Monthly invoice. Any additional qualified rewards stay queued for later eligible invoices.",
      "",
      `See your referral activity and credits: ${portalUrl}`,
    ].join("\n"),
  };
}

async function markOutbox(
  id: string,
  values: Record<string, unknown>,
) {
  return serviceRoleDatabaseRequest(`referral_notification_outbox?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

function configuredMode() {
  return process.env.NOTIFICATION_MODE?.trim().toLowerCase() || "simulator";
}

async function sendSmtp(recipient: string, copy: NotificationCopy) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL?.trim() || user;
  if (!host || !user || !pass || !from) throw new Error("SMTP referral notifications are not configured");

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to: recipient, subject: copy.subject, text: copy.body });
}

export async function processReferralNotificationOutbox(limit = 20) {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  const mode = configuredMode();
  if (["test", "staging"].includes(appEnv || "") && mode !== "simulator") {
    throw new Error("Hosted test referral notifications must remain in simulator mode");
  }
  if (appEnv === "production" && !["smtp", "disabled"].includes(mode)) {
    throw new Error("Production notification mode must be smtp or disabled");
  }
  if (mode === "disabled") return { processed: 0, sent: 0, simulated: 0, failed: 0 };

  const rows = await serviceRoleDatabaseRequest<OutboxRow[]>(
    `referral_notification_outbox?status=in.(queued,failed)&select=id,kind,recipient_email,payload,attempts&order=created_at.asc&limit=${Math.max(1, Math.min(limit, 100))}`,
  );

  let sent = 0;
  let simulated = 0;
  let failed = 0;

  for (const row of rows) {
    const copy = referralNotificationCopy(row);
    try {
      if (mode === "simulator") {
        simulateNotification({
          channel: "email",
          fictionalRecipient: row.recipient_email,
          subject: copy.subject,
          body: copy.body,
        });
        await markOutbox(row.id, {
          status: "simulated",
          attempts: row.attempts + 1,
          last_error: null,
          processed_at: new Date().toISOString(),
        });
        simulated += 1;
      } else {
        await sendSmtp(row.recipient_email, copy);
        await markOutbox(row.id, {
          status: "sent",
          attempts: row.attempts + 1,
          last_error: null,
          processed_at: new Date().toISOString(),
        });
        sent += 1;
      }
    } catch (error) {
      failed += 1;
      await markOutbox(row.id, {
        status: "failed",
        attempts: row.attempts + 1,
        last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown notification error",
        processed_at: new Date().toISOString(),
      }).catch(() => null);
    }
  }

  return { processed: rows.length, sent, simulated, failed };
}
