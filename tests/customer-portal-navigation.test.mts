import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerPath = new URL(
  "../src/components/SiteHeader.tsx",
  import.meta.url,
);

test("site header exposes the customer portal on desktop and mobile", async () => {
  const source = await readFile(headerPath, "utf8");

  assert.match(source, /const CUSTOMER_PORTAL_URL = "\/bin-cleaning\/login"/);
  assert.equal((source.match(/Customer Portal/g) ?? []).length, 2);
  assert.match(source, /md:inline-flex/);
  assert.match(source, /md:hidden/);
});
