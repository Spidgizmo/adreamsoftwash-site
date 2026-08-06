import { NextResponse } from "next/server";
import { isStagingEnvironment } from "@/lib/app-environment";
import { validateTestIntegrationConfiguration } from "@/lib/bin-cleaning/test-integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isStagingEnvironment()) {
    return NextResponse.json(
      { ok: false, error: "This endpoint is available only in staging." },
      { status: 404 },
    );
  }

  try {
    const status = validateTestIntegrationConfiguration();

    return NextResponse.json({
      ok: true,
      environment: "staging",
      integrations: status,
      protections: {
        secretValuesReturned: false,
        addressSimulatorMakesExternalRequests: false,
        taxSimulatorCreatesAuthoritativeTax: false,
        notificationSimulatorDeliversMessages: false,
        stripeCheckoutEnabled: status.stripe === "test" ? false : false,
      },
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.GITHUB_SHA ??
        "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        environment: "staging",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
