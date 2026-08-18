import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellPath = new URL(
  "../src/components/bin-cleaning/AppShell.tsx",
  import.meta.url,
);

test("customer portal navigation does not expose staff destinations", async () => {
  const source = await readFile(shellPath, "utf8");

  assert.match(
    source,
    /"Customer portal": \[\s*\{ href: "\/bin-cleaning\/portal", label: "Portal" \},\s*\]/,
  );
  assert.match(source, /"Internal CRM": \[/);
  assert.match(source, /"Field work": \[/);

  const portalBlock = source.match(
    /"Customer portal": \[([\s\S]*?)\],\s*"Internal CRM"/,
  )?.[1];
  assert.ok(portalBlock, "customer portal navigation block exists");
  assert.doesNotMatch(portalBlock, /\/bin-cleaning\/crm/);
  assert.doesNotMatch(portalBlock, /\/bin-cleaning\/field\/visits\/assigned/);
});
