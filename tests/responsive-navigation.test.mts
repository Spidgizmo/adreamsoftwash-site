import assert from "node:assert/strict"; import { readFileSync } from "node:fs"; import test from "node:test";
const shell=readFileSync("src/components/bin-cleaning/AppShell.tsx","utf8");
const portal=readFileSync("src/app/bin-cleaning/portal/page.tsx","utf8");
const field=readFileSync("src/app/bin-cleaning/field/visits/[id]/page.tsx","utf8");
test("mobile navigation includes portal, CRM, and field destinations",()=>{for(const route of ["/bin-cleaning/portal","/bin-cleaning/crm","/bin-cleaning/field/visits/visit-complete"])assert.match(shell,new RegExp(route))});
test("responsive surfaces use phone-first and tablet/desktop breakpoints",()=>{for(const source of [shell,portal,field]){assert.match(source,/sm:/);assert.match(source,/(md:|lg:)/)}});
test("field controls retain mobile-sized touch targets",()=>assert.match(field,/min-h-12/));
