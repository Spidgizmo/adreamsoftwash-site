import { createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

export type StripeCheckoutMode = "payment" | "subscription";

type StripeCoupon = {
  id: string;
  livemode: boolean;
  valid: boolean;
  duration: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
};

type TestCouponSpec = {
  id: string;
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
};

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

export async function stripeGet<T>(path: string): Promise<T> {
  const { secretKey } = stripeTestConfig();
  const response = await fetch(`${STRIPE_API}/${path.replace(/^\//, "")}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
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

async function retrieveStripeTestCoupon(couponId: string): Promise<StripeCoupon | null> {
  try {
    return await stripeGet<StripeCoupon>(`coupons/${encodeURIComponent(couponId)}`);
  } catch (error) {
    if (error instanceof Error && /No such coupon|resource_missing/i.test(error.message)) return null;
    throw error;
  }
}

function couponSpec(kind: string, promoCode: string | null): TestCouponSpec | null {
  if (kind === "referral") {
    return {
      id: "ADS_REFERRAL50_TEST_V1",
      name: "ADS Referral 50% TEST",
      percentOff: 50,
    };
  }
  if (kind !== "promotion") return null;
  if (promoCode === "NEW25") {
    return {
      id: "ADS_NEW25_TEST_V1",
      name: "ADS NEW25 25% TEST",
      percentOff: 25,
    };
  }
  if (promoCode === "ONE45") {
    return {
      id: "ADS_ONE45_TEST_V1",
      name: "ADS ONE45 $15 TEST",
      amountOff: 1500,
      currency: "usd",
    };
  }
  return null;
}

function assertCouponMatches(coupon: StripeCoupon, spec: TestCouponSpec) {
  if (!coupon.valid || coupon.duration !== "once") {
    throw new Error(`Stripe TEST coupon ${spec.id} is not a valid one-time coupon`);
  }
  if (spec.percentOff !== undefined && Number(coupon.percent_off) !== spec.percentOff) {
    throw new Error(`Stripe TEST coupon ${spec.id} has the wrong percentage`);
  }
  if (spec.amountOff !== undefined) {
    if (coupon.amount_off !== spec.amountOff || coupon.currency?.toLowerCase() !== spec.currency) {
      throw new Error(`Stripe TEST coupon ${spec.id} has the wrong fixed discount`);
    }
  }
}

export async function ensureStripeTestCouponForDiscount(kind: string, promoCode: string | null) {
  const spec = couponSpec(kind, promoCode);
  if (!spec) return null;

  let coupon = await retrieveStripeTestCoupon(spec.id);
  if (!coupon) {
    try {
      coupon = await stripePost<StripeCoupon>(
        "coupons",
        {
          id: spec.id,
          name: spec.name,
          duration: "once",
          percent_off: spec.percentOff,
          amount_off: spec.amountOff,
          currency: spec.currency,
          "metadata[ads_environment]": "test",
          "metadata[ads_discount_key]": spec.id,
        },
        `ads-bin-test-coupon:${spec.id}`,
      );
    } catch (error) {
      // A concurrent request may have created the deterministic coupon after our
      // initial GET. Re-read it before surfacing an error.
      coupon = await retrieveStripeTestCoupon(spec.id);
      if (!coupon) throw error;
    }
  }

  if (coupon.livemode) throw new Error("A live Stripe coupon cannot be used in staging");
  assertCouponMatches(coupon, spec);
  return coupon.id;
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
