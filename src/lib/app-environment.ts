export const APP_ENVIRONMENTS = [
  "development",
  "test",
  "staging",
  "production",
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

type EnvironmentValues = Readonly<Record<string, string | undefined>>;

export type HostedStagingConfiguration = Readonly<{
  appEnvironment: "staging";
  supabaseHost: string;
  applicationHost: string | null;
}>;

function normalizedEnvironment(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveAppEnvironment(
  value: string | undefined = process.env.NEXT_PUBLIC_APP_ENV,
): AppEnvironment {
  const normalized = normalizedEnvironment(value);

  if (APP_ENVIRONMENTS.includes(normalized as AppEnvironment)) {
    return normalized as AppEnvironment;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isStagingEnvironment(
  value: string | undefined = process.env.NEXT_PUBLIC_APP_ENV,
): boolean {
  return resolveAppEnvironment(value) === "staging";
}

function hostedHttpsUrl(value: string | undefined, label: string): URL {
  if (!value) throw new Error(`${label} is required.`);

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS.`);
  }
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    throw new Error(`${label} must use a hosted address, not localhost.`);
  }

  return parsed;
}

export function validateHostedStagingConfiguration(
  environment: EnvironmentValues = process.env,
): HostedStagingConfiguration {
  if (resolveAppEnvironment(environment.NEXT_PUBLIC_APP_ENV) !== "staging") {
    throw new Error("NEXT_PUBLIC_APP_ENV must be staging.");
  }

  const supabaseUrl = hostedHttpsUrl(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  if (!environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
  }

  const rawApplicationUrl =
    environment.APP_BASE_URL ??
    (environment.VERCEL_URL ? `https://${environment.VERCEL_URL}` : undefined);
  const applicationUrl = rawApplicationUrl
    ? hostedHttpsUrl(rawApplicationUrl, "APP_BASE_URL or VERCEL_URL")
    : null;

  return {
    appEnvironment: "staging",
    supabaseHost: supabaseUrl.host,
    applicationHost: applicationUrl?.host ?? null,
  };
}
