import { NextResponse } from "next/server";
import { isStagingEnvironment } from "@/lib/app-environment";
import {
  runStep3SimulatorProbe,
  validateStep3IntegrationConfiguration,
} from "@/lib/bin-cleaning/test-integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REDACTED_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  if (!isStagingEnvironment()) {
    return NextResponse.json(
      { ok: false, error: "This endpoint is available only in staging." },
      { status: 404, headers: REDACTED_HEADERS },
    );
  }

  try {
    const integrations = validateStep3IntegrationConfiguration();
    const simulatorProbe = runStep3SimulatorProbe();

    return NextResponse.json(
      {
        ok: true,
        environment: "staging",
        integrations: {
          addressValidation: {
            mode: integrations.addressValidation,
            probe: simulatorProbe.addressValidation,
          },
          taxCalculation: {
            mode: integrations.taxCalculation,
            probe: simulatorProbe.taxCalculation,
          },
          notifications: {
            mode: integrations.notifications,
            probes: simulatorProbe.notifications,
          },
          stripe: {
            mode: integrations.stripe,
            checkoutEnabled: false,
          },
        },
        protections: {
          sensitiveValuesReturned: false,
          externalRequestsMade: false,
          messagesDelivered: false,
          authoritativeTaxCreated: false,
          stripeCheckoutEnabled: false,
        },
        commit:
          process.env.VERCEL_GIT_COMMIT_SHA ??
          process.env.GITHUB_SHA ??
          "unknown",
      },
      { headers: REDACTED_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        environment: "staging",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503, headers: REDACTED_HEADERS },
    );
  }
}
