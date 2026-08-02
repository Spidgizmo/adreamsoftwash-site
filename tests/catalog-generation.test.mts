import assert from "node:assert/strict";import test from "node:test";import { readFile } from "node:fs/promises";import { generatedBlock } from "../scripts/generate-bin-cleaning-catalog.mjs";
test("database catalog snapshot is generated exactly from canonical JSON",async()=>{const seed=await readFile("supabase/seed.sql","utf8");assert.ok(seed.includes(await generatedBlock()))});
