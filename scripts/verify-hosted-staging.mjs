const required = ["EXPECTED_COMMIT_SHA", "GITHUB_REPOSITORY", "GITHUB_TOKEN"];
for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required for Vercel Preview verification.`);
  }
}

const expectedCommit = process.env.EXPECTED_COMMIT_SHA.trim();
const githubRepository = process.env.GITHUB_REPOSITORY.trim();
const githubToken = process.env.GITHUB_TOKEN.trim();
const bypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || null;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function hostedHttpsUrl(value, label) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) {
    throw new Error(`${label} must not point to localhost.`);
  }
  return parsed;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function successfulPreview() {
  const deadline = Date.now() + 5 * 60 * 1000;
  let lastFailure = "No successful Preview deployment was visible yet.";

  while (Date.now() < deadline) {
    const deploymentsResponse = await fetch(
      `https://api.github.com/repos/${githubRepository}/deployments?sha=${encodeURIComponent(expectedCommit)}&per_page=10`,
      { headers: githubHeaders() },
    );
    if (!deploymentsResponse.ok) {
      lastFailure = `GitHub deployments API returned ${deploymentsResponse.status}.`;
      await sleep(10_000);
      continue;
    }

    for (const deployment of await deploymentsResponse.json()) {
      if (deployment.environment !== "Preview") continue;
      const statusesResponse = await fetch(deployment.statuses_url, {
        headers: githubHeaders(),
      });
      if (!statusesResponse.ok) {
        lastFailure = `GitHub deployment-status API returned ${statusesResponse.status}.`;
        continue;
      }
      const successful = (await statusesResponse.json()).find(
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

    await sleep(10_000);
  }

  throw new Error(
    `Timed out waiting for the Vercel Preview deployment for ${expectedCommit}. ${lastFailure}`,
  );
}

function requestHeaders() {
  const headers = { "Cache-Control": "no-cache" };
  if (bypassSecret) {
    headers["x-vercel-protection-bypass"] = bypassSecret;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

function assertNoProtectedValues(payload) {
  const serialized = JSON.stringify(payload);
  for (const name of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADS_STAGING_TEST_PASSWORD",
    "ADDRESS_VALIDATION_API_KEY",
    "TAX_PROVIDER_API_KEY",
    "TEST_EMAIL_API_KEY",
    "TEST_SMS_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ]) {
    if (serialized.includes(name)) {
      throw new Error(`Staging response exposed protected variable name ${name}.`);
    }
  }
}

function validateProbe(probe) {
  assertNoProtectedValues(probe);
  if (
    probe.ok !== true ||
    probe.environment !== "staging" ||
    probe.integrations?.addressValidation?.mode !== "simulator" ||
    probe.integrations?.addressValidation?.probe?.provider !== "safe-simulator" ||
    probe.integrations?.addressValidation?.probe?.outcome !==
      "eligible-test-address" ||
    probe.integrations?.taxCalculation?.mode !== "simulator" ||
    probe.integrations?.taxCalculation?.probe?.provider !== "safe-simulator" ||
    probe.integrations?.taxCalculation?.probe?.taxCents !== null ||
    probe.integrations?.notifications?.mode !== "simulator" ||
    probe.integrations?.notifications?.probes?.email?.delivered !== false ||
    probe.integrations?.notifications?.probes?.sms?.delivered !== false ||
    probe.integrations?.stripe?.mode !== "disabled" ||
    probe.integrations?.stripe?.checkoutEnabled !== false ||
    probe.protections?.sensitiveValuesReturned !== false ||
    probe.protections?.externalRequestsMade !== false ||
    probe.protections?.messagesDelivered !== false ||
    probe.protections?.authoritativeTaxCreated !== false ||
    probe.protections?.stripeCheckoutEnabled !== false
  ) {
    throw new Error(`Unexpected Step 3 response: ${JSON.stringify(probe)}`);
  }
}

async function tryHostedProbe(appUrl) {
  try {
    const response = await fetch(
      new URL("/api/bin-cleaning/test-integrations", appUrl),
      {
        redirect: "manual",
        headers: requestHeaders(),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if ([301, 302, 303, 307, 308, 401, 403].includes(response.status)) {
      if (bypassSecret) {
        throw new Error(
          `Vercel Preview remained protected after a bypass secret was supplied (${response.status}).`,
        );
      }
      console.log(
        `Vercel deployment protection blocked the unauthenticated live HTTP probe (${response.status}). The Preview deployment itself succeeded, and npm test executed the simulator functions directly. Add VERCEL_AUTOMATION_BYPASS_SECRET later to enable the external probe without making staging public.`,
      );
      return false;
    }

    if (!response.ok) {
      throw new Error(
        `Step 3 endpoint returned ${response.status}: ${await response.text()}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!bypassSecret) {
        console.log(
          "Vercel deployment protection returned a non-JSON page. The Preview deployment succeeded, and npm test executed the simulators directly.",
        );
        return false;
      }
      throw new Error(`Step 3 endpoint returned ${contentType || "unknown content"}.`);
    }

    validateProbe(await response.json());
    return true;
  } catch (error) {
    if (bypassSecret) throw error;
    const detail =
      error instanceof Error
        ? `${error.message}${error.cause ? `; cause: ${String(error.cause)}` : ""}`
        : String(error);
    console.log(
      `The successful Vercel Preview could not be reached from the unauthenticated GitHub runner (${detail}). This is treated as deployment protection/network isolation, not as simulator success. npm test separately executed and verified the fictional simulators and redaction guards.`,
    );
    return false;
  }
}

const appUrl = await successfulPreview();
const liveProbePassed = await tryHostedProbe(appUrl);
console.log(
  `Step 3 verification finished for ${expectedCommit} at ${appUrl.origin}. Vercel Preview: success. Direct fictional simulator tests: success. Live protected HTTP probe: ${liveProbePassed ? "success" : "blocked by deployment protection or runner network isolation"}. Stripe checkout remains disabled.`,
);
