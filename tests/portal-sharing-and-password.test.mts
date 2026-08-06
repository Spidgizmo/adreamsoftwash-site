import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginPath = new URL(
  "../src/app/bin-cleaning/login/page.tsx",
  import.meta.url,
);
const passwordPath = new URL(
  "../src/components/bin-cleaning/PasswordField.tsx",
  import.meta.url,
);
const referralPath = new URL(
  "../src/components/bin-cleaning/ReferralShare.tsx",
  import.meta.url,
);
const portalPath = new URL(
  "../src/app/bin-cleaning/portal/page.tsx",
  import.meta.url,
);

test("login uses an accessible show and hide password control", async () => {
  const [login, password] = await Promise.all([
    readFile(loginPath, "utf8"),
    readFile(passwordPath, "utf8"),
  ]);

  assert.match(login, /<PasswordField \/>/);
  assert.match(password, /type=\{visible \? "text" : "password"\}/);
  assert.match(password, /aria-label=\{visible \? "Hide password" : "Show password"\}/);
  assert.match(password, /type="button"/);
});

test("portal referral sharing supports native share, text, email, code, and link", async () => {
  const [referral, portal] = await Promise.all([
    readFile(referralPath, "utf8"),
    readFile(portalPath, "utf8"),
  ]);

  assert.match(portal, /<ReferralShare code=\{referrals\[0\]\?\.code\} \/>/);
  assert.match(referral, /navigator\.share/);
  assert.match(referral, /sms:\?&body=/);
  assert.match(referral, /mailto:\?subject=/);
  assert.match(referral, /Copy code/);
  assert.match(referral, /Copy referral link/);
  assert.match(referral, /does not\s+collect or store your friend/);
});

test("portal explains which bins need cleaning without changing paid bin count", async () => {
  const portal = await readFile(portalPath, "utf8");

  assert.match(portal, /Which bins need cleaning on your next visit\?/);
  assert.match(portal, /does not change the number of bins on your paid plan/);
});
