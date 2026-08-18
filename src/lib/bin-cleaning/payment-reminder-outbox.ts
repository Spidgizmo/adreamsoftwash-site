import nodemailer from "nodemailer";
import { simulateNotification } from "@/lib/bin-cleaning/test-integration-simulators";
import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";

type PaymentReminderRow = {
  id: string;
  signup_lead_id: string;
  recipient: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type PendingLead = {
  id: string;
  full_name: string | null;
  email: string;
  email_allowed: boolean;
};

function firstName(fullName: string | null) {
  return fullName?.trim().split(/\s+/)[0] || "there";
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "https://acleanbin.com"
  ).replace(/\/$/, "");
}

function configuredMode() {
  return process.env.NOTIFICATION_MODE?.trim().toLowerCase() || "simulator";
}

export function paymentReminderCopy(row: Pick<PaymentReminderRow, "payload">) {
  const name = typeof row.payload.firstName === "string" && row.payload.firstName.trim()
    ? row.payload.firstName.trim()
    : "there";
  const resumePath = typeof row.payload.resumePath === "string" && row.payload.resumePath.startsWith("/")
    ? row.payload.resumePath
    : "/bin-cleaning/login?payment=required";
  const resumeUrl = `${appBaseUrl()}${resumePath}`;
  return {
    subject: "Finish your ADS Bin Cleaning signup",
    body: [
      `Hi ${name},`,
      "",
      "Your ADS Bin Cleaning signup is saved, but secure payment has not been completed yet.",
      "",
      "Sign in with the customer account you already created to return to secure payment:",
      resumeUrl,
      "",
      "You do not need to create another account. ADS does not activate service until payment is verified through Stripe and our signed webhook processing.",
      "",
      "If you already completed payment, you can ignore this reminder.",
      "",
      "ADS Bin Cleaning",
    ].join("\n"),
  };
}

export async function queuePendingPaymentReminder(signupLeadId: string) {
  const leads = await serviceRoleDatabaseRequest<PendingLead[]>(
    `signup_leads?id=eq.${encodeURIComponent(signupLeadId)}&status=eq.submitted_unpaid&is_test=eq.true&select=id,full_name,email,email_allowed&limit=1`,
  );
  const lead = leads[0];
  if (!lead?.email_allowed || !lead.email) return { queued: false as const };

  const sendAfter = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const idempotencyKey = `signup-payment:${lead.id}:1h:email`;
  const rows = await serviceRoleDatabaseRequest<{ id: string }[]>(
    "signup_payment_notification_outbox?on_conflict=idempotency_key",
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({
        signup_lead_id: lead.id,
        kind: "payment_reminder_1h",
        channel: "email",
        recipient: lead.email,
        payload: {
          firstName: firstName(lead.full_name),
          resumePath: "/bin-cleaning/login?payment=required",
        },
        status: "scheduled",
        send_after: sendAfter,
        idempotency_key: idempotencyKey,
      }),
    },
  );
  return { queued: rows.length > 0, sendAfter } as const;
}

async function markOutbox(id: string, values: Record<string, unknown>) {
  return serviceRoleDatabaseRequest(
    `signup_payment_notification_outbox?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(values) },
  );
}

async function sendSmtp(recipient: string, subject: string, body: string) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL?.trim() || user;
  if (!host || !user || !pass || !from) throw new Error("SMTP payment reminders are not configured");

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to: recipient, subject, text: body });
}

export async function processSignupPaymentReminderOutbox(limit = 50) {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  const mode = configuredMode();
  if (["test", "staging"].includes(appEnv || "") && mode !== "simulator") {
    throw new Error("Hosted test payment reminders must remain in simulator mode");
  }
  if (appEnv === "production" && !["smtp", "disabled"].includes(mode)) {
    throw new Error("Production notification mode must be smtp or disabled");
  }
  if (mode === "disabled") return { processed: 0, sent: 0, simulated: 0, failed: 0, canceled: 0 };

  const due = encodeURIComponent(new Date().toISOString());
  const rows = await serviceRoleDatabaseRequest<PaymentReminderRow[]>(
    `signup_payment_notification_outbox?status=in.(scheduled,failed)&send_after=lte.${due}&select=id,signup_lead_id,recipient,payload,attempts&order=send_after.asc&limit=${Math.max(1, Math.min(limit, 100))}`,
  );

  let sent = 0;
  let simulated = 0;
  let failed = 0;
  let canceled = 0;

  for (const row of rows) {
    const stillPending = await serviceRoleDatabaseRequest<{ id: string }[]>(
      `signup_leads?id=eq.${encodeURIComponent(row.signup_lead_id)}&status=eq.submitted_unpaid&is_test=eq.true&select=id&limit=1`,
    ).catch(() => []);
    if (!stillPending[0]) {
      await markOutbox(row.id, {
        status: "canceled",
        processed_at: new Date().toISOString(),
      }).catch(() => null);
      canceled += 1;
      continue;
    }

    const copy = paymentReminderCopy(row);
    try {
      if (mode === "simulator") {
        simulateNotification({
          channel: "email",
          fictionalRecipient: row.recipient,
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
        await sendSmtp(row.recipient, copy.subject, copy.body);
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

  return { processed: rows.length, sent, simulated, failed, canceled };
}
