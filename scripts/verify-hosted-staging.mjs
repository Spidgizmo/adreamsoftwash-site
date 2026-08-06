const required = [
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const expectedCommit = process.env.EXPECTED_COMMIT_SHA?.trim() || null;
const githubRepository = process.env.GITHUB_REPOSITORY?.trim() || null;
const githubToken = process.env.GITHUB_TOKEN?.trim() || null;

async function discoverSuccessfulPreviewUrl() {
  if (!expectedCommit || !githubRepository || !githubToken) return null;

  const deadline = Date.now() + 5 * 60 * 1000;
  let lastFailure = "No successful Preview deployment was visible yet.";

  while (Date.now() < deadline) {
    try {
      const deployments = await fetch(
        `https://api.github.com/repos/${githubRepository}/deployments?sha=${encodeURIComponent(expectedCommit)}&per_page=10`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (!deployments.ok) {
        lastFailure = `GitHub deployments API returned ${deployments.status}.`;
      } else {
        const rows = await deployments.json();
        for (const deployment of rows) {
          if (deployment.environment !== "Preview") continue;

          const statuses = await fetch(deployment.statuses_url, {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${githubToken}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          if (!statuses.ok) {
            lastFailure = `GitHub deployment-status API returned ${statuses.status}.`;
            continue;
          }

          const successful = (await statuses.json()).find(
            (status) =>
              status.state === "success" &&
              (status.environment_url || status.target_url),
          );
          if (successful) {
            return hostedHttpsUrl(
              successful.environment_url || successful.target_url,
              "Vercel Preview deployment URL",
            );
          }
        }
      }
    } catch (error) {
      lastFailure =
        error instanceof Error ? error.message : "Unknown deployment lookup error.";
    }

    await sleep(10_000);
  }

  throw new Error(
    `Timed out waiting for the Vercel Preview deployment for ${expectedCommit}. ${lastFailure}`,
  );
}

async function resolveApplicationUrl() {
  try {
    const discovered = await discoverSuccessfulPreviewUrl();
    if (discovered) return discovered;
  } catch (error) {
    if (!process.env.STAGING_APP_URL?.trim()) throw error;
  }

  if (!process.env.STAGING_APP_URL?.trim()) {
    throw new Error(
      "STAGING_APP_URL is required when a Preview deployment cannot be discovered from GitHub.",
    );
  }
  return hostedHttpsUrl(process.env.STAGING_APP_URL, "STAGING_APP_URL");
}

const appUrl = await resolveApplicationUrl();
const supabaseUrl = hostedHttpsUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.ADS_STAGING_TEST_PASSWORD;

function assertNoProtectedValues(payload) {
  const serialized = JSON.stringify(payload);
  const forbiddenNames = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADS_STAGING_TEST_PASSWORD",
    "ADDRESS_VALIDATION_API_KEY",
    "TAX_PROVIDER_API_KEY",
    "TEST_EMAIL_API_KEY",
    "TEST_SMS_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ];

  for (const name of forbiddenNames) {
    if (serialized.includes(name)) {
      throw new Error(`Staging response exposed protected variable name ${name}.`);
    }
  }

  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["ADS_STAGING_TEST_PASSWORD", password],
  ]) {
    if (value && serialized.includes(value)) {
      throw new Error(`Staging response exposed the value of ${name}.`);
    }
  }
}

async function loadIntegrationProbe() {
  const deadline = Date.now() + 3 * 60 * 1000;
  let lastFailure = "The endpoint has not returned the expected deployment yet.";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(
        new URL("/api/bin-cleaning/test-integrations", appUrl),
        {
          redirect: "error",
          headers: { "Cache-Control": "no-cache" },
        },
      );

      if (!response.ok) {
        lastFailure = `Integration endpoint returned ${response.status}: ${await response.text()}`;
      } else {
        const probe = await response.json();
        if (
          !expectedCommit ||
          probe.commit === expectedCommit ||
          probe.commit === "unknown"
        ) {
          return probe;
        }
        lastFailure = `Expected commit ${expectedCommit}, received ${probe.commit}.`;
      }
    } catch (error) {
      lastFailure =
        error instanceof Error ? error.message : "Unknown integration-probe error.";
    }

    await sleep(8_000);
  }

  throw new Error(
    `Timed out waiting for the hosted Step 3 integration probe. ${lastFailure}`,
  );
}

const integrationProbe = await loadIntegrationProbe();
assertNoProtectedValues(integrationProbe);

if (
  integrationProbe.ok !== true ||
  integrationProbe.environment !== "staging" ||
  integrationProbe.integrations?.addressValidation?.mode !== "simulator" ||
  integrationProbe.integrations?.addressValidation?.probe?.provider !==
    "safe-simulator" ||
  integrationProbe.integrations?.addressValidation?.probe?.outcome !==
    "eligible-test-address" ||
  integrationProbe.integrations?.taxCalculation?.mode !== "simulator" ||
  integrationProbe.integrations?.taxCalculation?.probe?.provider !==
    "safe-simulator" ||
  integrationProbe.integrations?.taxCalculation?.probe?.taxCents !== null ||
  integrationProbe.integrations?.notifications?.mode !== "simulator" ||
  integrationProbe.integrations?.notifications?.probes?.email?.delivered !==
    false ||
  integrationProbe.integrations?.notifications?.probes?.sms?.delivered !== false ||
  integrationProbe.integrations?.stripe?.mode !== "disabled" ||
  integrationProbe.integrations?.stripe?.checkoutEnabled !== false ||
  integrationProbe.protections?.sensitiveValuesReturned !== false ||
  integrationProbe.protections?.externalRequestsMade !== false ||
  integrationProbe.protections?.messagesDelivered !== false ||
  integrationProbe.protections?.authoritativeTaxCreated !== false ||
  integrationProbe.protections?.stripeCheckoutEnabled !== false
) {
  throw new Error(
    `Unexpected Step 3 integration response: ${JSON.stringify(integrationProbe)}`,
  );
}

const emailRecipient =
  integrationProbe.integrations.notifications.probes.email.fictionalRecipient;
const smsRecipient =
  integrationProbe.integrations.notifications.probes.sms.fictionalRecipient;
if (!emailRecipient.endsWith(".test") || !/[+]1.*555/.test(smsRecipient)) {
  throw new Error("Notification simulator did not use fictional recipients.");
}

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
assertNoProtectedValues(health);
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
  `Hosted staging verified at ${appUrl.origin}: Step 3 server-only simulators, redaction, Stripe-disabled boundary, health, safety banner, six fictional sign-ins, and role-scoped customer isolation passed.`,
);
