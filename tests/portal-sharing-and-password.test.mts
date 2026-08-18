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

  assert.match(portal, /senderName=\{customer\.full_name\}/);
  assert.match(referral, /navigator\.share/);
  assert.match(referral, /sms:\?&body=/);
  assert.match(referral, /mailto:\?subject=/);
  assert.match(referral, /Copy code/);
  assert.match(referral, /Copy referral link/);
  assert.match(referral, /does not\s+collect or store your friend/);
});

test("referral invitations explain the service, sender, future code, and tiered whole-charge rewards", async () => {
  const referral = await readFile(referralPath, "utf8");

  assert.match(referral, /senderFirstName/);
  assert.match(referral, /sent you 50% off ADS Bin Cleaning/);
  assert.match(referral, /thinks your trash bins probably stink/);
  assert.match(referral, /let’s be honest, everybody’s do/);
  assert.match(referral, /grime, odors, germs, leaked waste, and nasty buildup/);
  assert.match(referral, /cleans, sanitizes, and deodorizes/);
  assert.match(referral, /returns them to the designated storage spot/);
  assert.match(referral, /50% off your first eligible Monthly bin-cleaning charge/);
  assert.match(
    referral,
    /50% off their entire next eligible Monthly bin-cleaning charge for their first qualified referral/,
  );
  assert.match(
    referral,
    /25% off one eligible Monthly bin-cleaning charge for each later qualified referral/,
  );
  assert.match(referral, /your own permanent referral code to share/);
  assert.match(referral, /Rewards apply one per[\s\S]*invoice and do not stack/);
  assert.match(referral, /Promotional service credits only; no cash value or cash payout/);
  assert.match(referral, /Invitations identify \{senderFirstName\} as the sender/);
});

test("portal removes the per-visit dirty-bin selector and uses paid bin management instead", async () => {
  const portal = await readFile(portalPath, "utf8");

  assert.doesNotMatch(portal, /Which bins need cleaning on your next visit\?/);
  assert.doesNotMatch(portal, /name="dirty_bin"/);
  assert.match(portal, /title="Manage your bins"/);
  assert.match(portal, /Add or remove trash and recycling bins/);
});
