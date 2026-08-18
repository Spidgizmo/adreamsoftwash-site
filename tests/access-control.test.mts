import assert from "node:assert/strict";
import test from "node:test";
import {
  areaForPath,
  expired,
  mayAccess,
  roleForIdentity,
} from "../src/lib/bin-cleaning/access.ts";

test("direct private URLs map to protected areas", () => {
  assert.equal(areaForPath("/bin-cleaning/portal"), "portal");
  assert.equal(areaForPath("/bin-cleaning/crm/customers/x"), "crm");
  assert.equal(areaForPath("/bin-cleaning/field/visits/x"), "field");
});

test("customers are portal-only", () => {
  assert.equal(mayAccess("customer", "portal"), true);
  assert.equal(mayAccess("customer", "crm"), false);
  assert.equal(mayAccess("customer", "field"), false);
});

test("dispatcher accesses CRM but not portal or field", () => {
  assert.equal(mayAccess("dispatcher", "crm"), true);
  assert.equal(mayAccess("dispatcher", "portal"), false);
  assert.equal(mayAccess("dispatcher", "field"), false);
});

test("technician is field-only", () => {
  assert.equal(mayAccess("field_technician", "field"), true);
  assert.equal(mayAccess("field_technician", "crm"), false);
  assert.equal(mayAccess("field_technician", "portal"), false);
});

test("administrator accesses CRM and emergency field view, not customer portal", () => {
  assert.equal(mayAccess("administrator", "crm"), true);
  assert.equal(mayAccess("administrator", "field"), true);
  assert.equal(mayAccess("administrator", "portal"), false);
});

test("customer fallback requires a linked customer record", () => {
  assert.equal(roleForIdentity(undefined, true), "customer");
  assert.equal(roleForIdentity(undefined, false), null);
  assert.equal(roleForIdentity("field_technician", false), "field_technician");
});

test("expired sessions are detected at the boundary", () => {
  assert.equal(expired(100, 100001), true);
  assert.equal(expired(101, 100000), false);
});
