import "server-only";

export {
  runStep3SimulatorProbe,
  simulateAddressValidation,
  simulateNotification,
  simulateTaxReview,
  type SimulatedAddressResult,
  type SimulatedNotification,
  type SimulatedTaxResult,
  type Step3SimulatorProbe,
} from "./test-integration-simulators";

export const INTEGRATION_MODES = ["disabled", "simulator", "test"] as const;
export type IntegrationMode = (typeof INTEGRATION_MODES)[number];
export type StripeIntegrationMode = "disabled" | "test";

type EnvironmentValues = Readonly<Record<string, string | undefined>>;

export type TestIntegrationStatus = Readonly<{
  addressValidation: IntegrationMode;
  taxCalculation: IntegrationMode;
  notifications: IntegrationMode;
  stripe: StripeIntegrationMode;
  configured: Readonly<{
    supabaseServerCredential: boolean;
    addressValidationCredential: boolean;
    taxCredential: boolean;
    emailCredential: boolean;
    smsCredential: boolean;
    stripeTestCredentials: boolean;
  }>;
}>;

export type Step3IntegrationStatus = Readonly<{
  addressValidation: "simulator";
  taxCalculation: "simulator";
  notifications: "simulator";
  stripe: "disabled";
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

function stripeIntegrationMode(value: string | undefined): StripeIntegrationMode {
  const normalized = (value ?? "disabled").trim().toLowerCase();
  if (normalized !== "disabled" && normalized !== "test") {
    throw new Error("STRIPE_INTEGRATION_MODE must be disabled or test.");
  }
  return normalized;
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
  const stripe = stripeIntegrationMode(environment.STRIPE_INTEGRATION_MODE);

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

export function validateStep3IntegrationConfiguration(
  environment: EnvironmentValues = process.env,
): Step3IntegrationStatus {
  const status = validateTestIntegrationConfiguration(environment);

  if (status.addressValidation !== "simulator") {
    throw new Error(
      "Step 3 requires ADDRESS_VALIDATION_MODE=simulator on hosted staging.",
    );
  }
  if (status.taxCalculation !== "simulator") {
    throw new Error(
      "Step 3 requires TAX_CALCULATION_MODE=simulator on hosted staging.",
    );
  }
  if (status.notifications !== "simulator") {
    throw new Error(
      "Step 3 requires NOTIFICATION_MODE=simulator on hosted staging.",
    );
  }
  if (status.stripe !== "disabled") {
    throw new Error(
      "Step 3 requires STRIPE_INTEGRATION_MODE=disabled. Stripe test checkout begins at Step 8.",
    );
  }

  return {
    addressValidation: status.addressValidation,
    taxCalculation: status.taxCalculation,
    notifications: status.notifications,
    stripe: status.stripe,
  };
}
