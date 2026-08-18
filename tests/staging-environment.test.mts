import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isStagingEnvironment,
  resolveAppEnvironment,
  validateHostedStagingConfiguration,
} from "../src/lib/app-environment.ts";

const layoutPath = new URL("../src/app/layout.tsx", import.meta.url);
const bannerPath = new URL(
  "../src/components/StagingBanner.tsx",
  import.meta.url,
);
const healthPath = new URL(
  "../src/app/api/bin-cleaning/staging-health/route.ts",
  import.meta.url,
);

test("app environment resolves known values and staging state", () => {
  assert.equal(resolveAppEnvironment("staging"), "staging");
  assert.equal(resolveAppEnvironment(" TEST "), "test");
  assert.equal(isStagingEnvironment("staging"), true);
  assert.equal(isStagingEnvironment("production"), false);
});

test("hosted staging requires HTTPS non-local Supabase and application hosts", () => {
  assert.deepEqual(
    validateHostedStagingConfiguration({
      NEXT_PUBLIC_APP_ENV: "staging",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-anon-key",
      APP_BASE_URL: "https://ads-bin-cleaning-staging.example.test",
    }),
    {
      appEnvironment: "staging",
      supabaseHost: "project-ref.supabase.co",
      applicationHost: "ads-bin-cleaning-staging.example.test",
    },
  );

  assert.throws(
    () =>
      validateHostedStagingConfiguration({
        NEXT_PUBLIC_APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-anon-key",
      }),
    /must use HTTPS|hosted address/,
  );

  assert.throws(
    () =>
      validateHostedStagingConfiguration({
        NEXT_PUBLIC_APP_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-anon-key",
      }),
    /must be staging/,
  );
});

test("staging is visibly labeled and exposes a redacted health endpoint", async () => {
  const [layout, banner, health] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(bannerPath, "utf8"),
    readFile(healthPath, "utf8"),
  ]);

  assert.match(layout, /<StagingBanner \/>/);
  assert.match(banner, /fictional data only/);
  assert.match(banner, /no real\s+payments/);
  assert.match(health, /validateHostedStagingConfiguration/);
  assert.match(health, /supabaseReachable/);
  assert.doesNotMatch(health, /SUPABASE_SERVICE_ROLE_KEY/);
});
