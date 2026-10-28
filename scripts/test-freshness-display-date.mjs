#!/usr/bin/env node
import assert from "node:assert/strict";
import { formatDisplayDate } from "../src/data/registry/freshness.mjs";

assert.equal(formatDisplayDate("2026-10-27T20:34:28.939Z"), "2026-10-27");
assert.equal(formatDisplayDate(undefined), null);
assert.equal(formatDisplayDate("not-a-date"), null);
assert.equal(formatDisplayDate("2026-02-30T00:00:00.000Z"), null);

console.log("freshness display date tests passed");
