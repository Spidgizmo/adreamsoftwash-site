import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

export type StripeCheckoutMode = "payment" | "subscription";

export function stripeTestConfig() {
  const mode = process.env.STRIPE_INTEGRATION_MODE?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (mode !== "test") {
    throw new Error("Stripe test checkout is disabled");
  }
  if (!secretKey?.startsWith("sk_test_")) {
    throw new Error("Stripe TEST mode requires an sk_test_ secret key");
  }
  if (!webhookSecret?.startsWith("whsec_")) {
    throw new Error("Stripe TEST mode requires a webhook signing secret");
  }
  return { secretKey, webhookSecret };
}

function appendValue(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    params.append(key, value ? "true" : "false");
    return;
  }
  params.append(key, String(value));
}

export function stripeFormBody(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) appendValue(params, key, value);
  return params;
}

export async function stripePost<T>(
  path: string,
  values: Record<string, unknown>,
  idempotencyKey: string,
): Promise<T> {
  const { secretKey } = stripeTestConfig();
  const response = await fetch(`${STRIPE_API}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: stripeFormBody(values),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe request failed (${response.status})`);
  }
  return payload;
}

export async function stripeDeleteTestCustomer(customerId: string) {
  if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) {
    throw new Error("Stripe customer id is invalid");
  }

  const { secretKey } = stripeTestConfig();
  const response = await fetch(`${STRIPE_API}/customers/${encodeURIComponent(customerId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    deleted?: boolean;
    error?: { code?: string; message?: string };
  };

  // A retry after Stripe was already cleaned up must be safe. If the customer no
  // longer exists, there is no remaining Stripe customer/subscription to bill.
  if (response.status === 404 && payload.error?.code === "resource_missing") {
    return { id: customerId, deleted: true, alreadyMissing: true } as const;
  }
  if (!response.ok || payload.id !== customerId || payload.deleted !== true) {
    throw new Error(payload.error?.message || `Stripe customer deletion failed (${response.status})`);
  }
  return { id: customerId, deleted: true, alreadyMissing: false } as const;
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const { webhookSecret } = stripeTestConfig();
  if (!signatureHeader) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const item of signatureHeader.split(",")) {
    const [kind, value] = item.trim().split("=", 2);
    if (kind === "t" && /^\d+$/.test(value ?? "")) timestamp = Number(value);
    if (kind === "v1" && /^[0-9a-f]+$/i.test(value ?? "")) signatures.push(value.toLowerCase());
  }
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return signatures.some((candidate) => {
    const candidateBytes = Buffer.from(candidate, "hex");
    return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
  });
}

export function stripeCouponForDiscount(kind: string, promoCode: string | null) {
  if (kind === "referral") return process.env.STRIPE_TEST_COUPON_REFERRAL50?.trim() || null;
  if (kind !== "promotion") return null;
  if (promoCode === "NEW25") return process.env.STRIPE_TEST_COUPON_NEW25?.trim() || null;
  if (promoCode === "ONE45") return process.env.STRIPE_TEST_COUPON_ONE45?.trim() || null;
  return null;
}
