import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const referralPath = new URL(
  "../src/components/bin-cleaning/ReferralShare.tsx",
  import.meta.url,
);
const redirectPath = new URL("../src/app/r/[code]/route.ts", import.meta.url);
const signupPath = new URL(
  "../src/app/bin-cleaning/signup/page.tsx",
  import.meta.url,
);

test("text invitations use a short branded referral path", async () => {
  const referral = await readFile(referralPath, "utf8");

  assert.match(
    referral,
    /const shortPath = `\/r\/\$\{encodeURIComponent\(code\)\}`/,
  );
  assert.match(referral, /Clean My Bins: \$\{shortUrl\}/);
  assert.match(referral, /Get 50% off your first eligible Monthly base cleaning/);
  assert.match(referral, /earns a referral reward too/);
  assert.doesNotMatch(
    referral,
    /const textMessage = `[^`]*\/bin-cleaning\/signup\?ref=/,
  );
});

test("short referral route normalizes and forwards valid codes into signup", async () => {
  const [redirect, signup] = await Promise.all([
    readFile(redirectPath, "utf8"),
    readFile(signupPath, "utf8"),
  ]);

  assert.match(redirect, /\^ADS-\[A-Z0-9\]\{4\}-\[A-Z0-9\]\{4\}\$/);
  assert.match(redirect, /const \{ code \} = await params/);
  assert.match(redirect, /code\.trim\(\)\.toUpperCase\(\)/);
  assert.match(
    redirect,
    /destination\.searchParams\.set\("ref", normalizedCode\)/,
  );
  assert.match(redirect, /NextResponse\.redirect\(destination, 307\)/);
  assert.match(signup, /const query = await searchParams/);
  assert.match(signup, /normalizeBinCleaningReferralCode\(query\.ref\)/);
  assert.match(signup, /initialReferralCode=\{initialReferralCode\}/);
});

test("copy and native share controls use the short redirect URL", async () => {
  const referral = await readFile(referralPath, "utf8");

  assert.match(referral, /const absoluteShortUrl = `\$\{window\.location\.origin\}\$\{shortPath\}`/);
  assert.match(referral, /url: absoluteShortUrl/);
  assert.match(referral, /Short referral link copied/);
});
