import { NextResponse } from "next/server";
import { validateHostedStagingConfiguration } from "@/lib/app-environment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const configuration = validateHostedStagingConfiguration();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          environment: configuration.appEnvironment,
          supabaseHost: configuration.supabaseHost,
          applicationHost: configuration.applicationHost,
          checks: {
            hostedConfiguration: true,
            supabaseReachable: false,
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      environment: configuration.appEnvironment,
      supabaseHost: configuration.supabaseHost,
      applicationHost: configuration.applicationHost,
      checks: {
        hostedConfiguration: true,
        supabaseReachable: true,
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
        checks: {
          hostedConfiguration: false,
          supabaseReachable: false,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
