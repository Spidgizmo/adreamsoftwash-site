import "server-only";

export const INTEGRATION_MODES = ["disabled", "simulator", "test"] as const;
export type IntegrationMode = (typeof INTEGRATION_MODES)[number];

type EnvironmentValues = Readonly<Record<string, string | undefined>>;

export type TestIntegrationStatus = Readonly<{
  addressValidation: IntegrationMode;
  taxCalculation: IntegrationMode;
  notifications: IntegrationMode;
  stripe: "disabled" | "test";
  configured: Readonly<{
    supabaseServerCredential: boolean;
    addressValidationCredential: boolean;
    taxCredential: boolean;
    emailCredential: boolean;
    smsCredential: boolean;
    stripeTestCredentials: boolean;
  }>;
}>;

function integrationMode(
  value: string | undefined,
  fallback: IntegrationMode,
  label: string,
): IntegrationMode {
  const normalized = (value ?? fallback).trim().toLowerCase();
  if (!INTEGRATION_MODES.includes(normalized as IntegrationMode)) {
    throw new Error(`${label} must be disabled, simulator, or test.`);
  }
  return normalized as IntegrationMode;
}

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function requireWhenTest(
  mode: IntegrationMode,
  value: string | undefined,
  label: string,
) {
  if (mode === "test" && !present(value)) {
    throw new Error(`${label} is required when its integration mode is test.`);
  }
}

export function validateTestIntegrationConfiguration(
  environment: EnvironmentValues = process.env,
): TestIntegrationStatus {
  const addressValidation = integrationMode(
    environment.ADDRESS_VALIDATION_MODE,
    "simulator",
    "ADDRESS_VALIDATION_MODE",
  );
  const taxCalculation = integrationMode(
    environment.TAX_CALCULATION_MODE,
    "simulator",
    "TAX_CALCULATION_MODE",
  );
  const notifications = integrationMode(
    environment.NOTIFICATION_MODE,
    "simulator",
    "NOTIFICATION_MODE",
  );
  const stripe =
    (environment.STRIPE_INTEGRATION_MODE ?? "disabled").trim().toLowerCase() ===
    "test"
      ? "test"
      : "disabled";

  requireWhenTest(
    addressValidation,
    environment.ADDRESS_VALIDATION_API_KEY,
    "ADDRESS_VALIDATION_API_KEY",
  );
  requireWhenTest(
    taxCalculation,
    environment.TAX_PROVIDER_API_KEY,
    "TAX_PROVIDER_API_KEY",
  );

  if (
    notifications === "test" &&
    !present(environment.TEST_EMAIL_API_KEY) &&
    !present(environment.TEST_SMS_API_KEY)
  ) {
    throw new Error(
      "At least one protected test notification credential is required when NOTIFICATION_MODE is test.",
    );
  }

  if (stripe === "test") {
    if (!environment.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
      throw new Error("STRIPE_SECRET_KEY must be a Stripe test secret key.");
    }
    if (!environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")) {
      throw new Error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe test publishable key.",
      );
    }
  }

  return {
    addressValidation,
    taxCalculation,
    notifications,
    stripe,
    configured: {
      supabaseServerCredential: present(environment.SUPABASE_SERVICE_ROLE_KEY),
      addressValidationCredential: present(
        environment.ADDRESS_VALIDATION_API_KEY,
      ),
      taxCredential: present(environment.TAX_PROVIDER_API_KEY),
      emailCredential: present(environment.TEST_EMAIL_API_KEY),
      smsCredential: present(environment.TEST_SMS_API_KEY),
      stripeTestCredentials:
        environment.STRIPE_SECRET_KEY?.startsWith("sk_test_") === true &&
        environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") ===
          true,
    },
  };
}

export type SimulatedAddressResult = Readonly<{
  provider: "safe-simulator";
  normalizedAddress: string;
  outcome: "eligible-test-address" | "staff-review-required";
  confidence: "simulated";
}>;

export function simulateAddressValidation(input: {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
}): SimulatedAddressResult {
  const fields = [input.line1, input.city, input.region, input.postalCode].map(
    (value) => value.trim(),
  );
  if (fields.some((value) => !value)) {
    return {
      provider: "safe-simulator",
      normalizedAddress: fields.filter(Boolean).join(", "),
      outcome: "staff-review-required",
      confidence: "simulated",
    };
  }

  return {
    provider: "safe-simulator",
    normalizedAddress: `${fields[0]}, ${fields[1]}, ${fields[2]} ${fields[3]}`,
    outcome: "eligible-test-address",
    confidence: "simulated",
  };
}

export type SimulatedTaxResult = Readonly<{
  provider: "safe-simulator";
  outcome: "staff-review-required";
  taxCents: null;
  reason: string;
}>;

export function simulateTaxReview(): SimulatedTaxResult {
  return {
    provider: "safe-simulator",
    outcome: "staff-review-required",
    taxCents: null,
    reason:
      "The Step 3 simulator proves the protected integration boundary but does not invent a live taxability decision or tax rate.",
  };
}

export type SimulatedNotification = Readonly<{
  provider: "safe-simulator";
  delivered: false;
  channel: "email" | "sms";
  fictionalRecipient: string;
  subject: string | null;
  body: string;
}>;

function isFictionalRecipient(
  channel: "email" | "sms",
  recipient: string,
): boolean {
  if (channel === "email") return recipient.toLowerCase().endsWith(".test");
  return /^\+?1555\d{7}$/.test(recipient.replace(/[()\- .]/g, ""));
}

export function simulateNotification(input: {
  channel: "email" | "sms";
  fictionalRecipient: string;
  subject?: string;
  body: string;
}): SimulatedNotification {
  if (!isFictionalRecipient(input.channel, input.fictionalRecipient)) {
    throw new Error(
      "The notification simulator accepts only fictional .test email addresses or reserved 555 test phone numbers.",
    );
  }

  return {
    provider: "safe-simulator",
    delivered: false,
    channel: input.channel,
    fictionalRecipient: input.fictionalRecipient,
    subject: input.subject?.trim() || null,
    body: input.body,
  };
}
