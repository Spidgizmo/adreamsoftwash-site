import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const portalPath = new URL("../src/app/bin-cleaning/portal/page.tsx", import.meta.url);
const shellPath = new URL("../src/components/bin-cleaning/AppShell.tsx", import.meta.url);

test("customer portal keeps the account summary visible and management sections collapsed", async () => {
  const portal = await readFile(portalPath, "utf8");

  assert.match(portal, /<section className="card p-5">[\s\S]*Hello, \{customer\.full_name\}/);
  assert.match(portal, /title="Service history"/);
  assert.match(portal, /title="Your referrals"/);
  assert.match(portal, /title="Manage your bins"/);
  assert.match(portal, /title="Update contact & service details"/);
  assert.match(portal, /title="Moving\? Update your service address"/);
  assert.match(portal, /function CollapsibleSection/);
  assert.match(portal, /<details className="card mt-4 p-5">/);
  assert.doesNotMatch(portal, /<details[^>]*\sopen(?:=|\s|>)/);
});

test("optional marketing is compact and appears only inside the collapsed contact section", async () => {
  const [portal, shell] = await Promise.all([
    readFile(portalPath, "utf8"),
    readFile(shellPath, "utf8"),
  ]);

  assert.equal((portal.match(/Optional marketing offers/g) ?? []).length, 2);
  assert.match(portal, /title="Update contact & service details"[\s\S]*Optional marketing offers/);
  assert.match(portal, /Turn off/);
  assert.match(portal, /Turn on/);
  assert.doesNotMatch(shell, /MarketingPreferenceControl/);
});

test("referral balances are described as service credits with no cash payout right", async () => {
  const portal = await readFile(portalPath, "utf8");

  assert.match(portal, /Available promotional service credits/);
  assert.match(portal, /promotional service credits only; no cash value/i);
  assert.match(portal, /cannot be paid out, withdrawn, exchanged for cash, refunded as cash, or transferred/);
});
