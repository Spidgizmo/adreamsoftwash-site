const required = [
  "STAGING_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ADS_STAGING_TEST_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required for hosted staging verification.`);
  }
}

if (process.env.ADS_STAGING_TEST_PASSWORD.length < 16) {
  throw new Error("ADS_STAGING_TEST_PASSWORD must contain at least 16 characters.");
}

function hostedHttpsUrl(value, label) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) {
    throw new Error(`${label} must not point to localhost.`);
  }
  return parsed;
}

const appUrl = hostedHttpsUrl(process.env.STAGING_APP_URL, "STAGING_APP_URL");
const supabaseUrl = hostedHttpsUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.ADS_STAGING_TEST_PASSWORD;

const healthResponse = await fetch(
  new URL("/api/bin-cleaning/staging-health", appUrl),
  { redirect: "error" },
);
if (!healthResponse.ok) {
  throw new Error(
    `Staging health check failed (${healthResponse.status}): ${await healthResponse.text()}`,
  );
}
const health = await healthResponse.json();
if (
  health.ok !== true ||
  health.environment !== "staging" ||
  health.checks?.hostedConfiguration !== true ||
  health.checks?.supabaseReachable !== true
) {
  throw new Error(`Unexpected staging health response: ${JSON.stringify(health)}`);
}

for (const path of ["/bin-cleaning", "/bin-cleaning/login"]) {
  const response = await fetch(new URL(path, appUrl));
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}.`);
  }
  const body = await response.text();
  if (!body.includes("staging test site") || !body.includes("fictional data only")) {
    throw new Error(`${path} is missing the staging safety banner.`);
  }
}

const users = [
  ["avery@example.test", 1],
  ["jordan@example.test", 1],
  ["admin@example.test", 5],
  ["dispatcher@example.test", 5],
  ["technician@example.test", 1],
  ["unassigned-tech@example.test", 0],
];

for (const [email, expectedCustomers] of users) {
  const signIn = await fetch(
    new URL("/auth/v1/token?grant_type=password", supabaseUrl),
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!signIn.ok) {
    throw new Error(`Hosted sign-in failed for ${email}: ${await signIn.text()}`);
  }

  const { access_token: accessToken } = await signIn.json();
  const customers = await fetch(
    new URL("/rest/v1/customers?select=id", supabaseUrl),
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!customers.ok) {
    throw new Error(`Hosted RLS request failed for ${email}: ${await customers.text()}`);
  }

  const rows = await customers.json();
  if (rows.length !== expectedCustomers) {
    throw new Error(
      `Hosted RLS isolation failed for ${email}: expected ${expectedCustomers}, received ${rows.length}.`,
    );
  }
}

console.log(
  `Hosted staging verified at ${appUrl.origin}: health, safety banner, six fictional sign-ins, and role-scoped customer isolation passed.`,
);
