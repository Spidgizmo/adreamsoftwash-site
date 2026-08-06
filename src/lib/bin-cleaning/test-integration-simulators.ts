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

export type Step3SimulatorProbe = Readonly<{
  addressValidation: SimulatedAddressResult;
  taxCalculation: SimulatedTaxResult;
  notifications: Readonly<{
    email: SimulatedNotification;
    sms: SimulatedNotification;
  }>;
}>;

export function runStep3SimulatorProbe(): Step3SimulatorProbe {
  return {
    addressValidation: simulateAddressValidation({
      line1: "123 Fictional Avenue",
      city: "Toledo",
      region: "OH",
      postalCode: "43604",
    }),
    taxCalculation: simulateTaxReview(),
    notifications: {
      email: simulateNotification({
        channel: "email",
        fictionalRecipient: "step3-verification@example.test",
        subject: "ADS Bin Cleaning Step 3 simulator verification",
        body: "Fictional staging verification only. Nothing was delivered.",
      }),
      sms: simulateNotification({
        channel: "sms",
        fictionalRecipient: "+1 (555) 010-0123",
        body: "ADS fictional staging verification only.",
      }),
    },
  };
}
