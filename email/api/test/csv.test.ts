// The hand-rolled CSV parser: quoting, the required email column, and what gets skipped.
import { strict as assert } from "node:assert";
import test from "node:test";

import { parseContactsCsv } from "../src/csv.js";

test("csv: a plain file with email plus dynamic fields", () => {
  const out = parseContactsCsv("email,first_name,org\namina@example.org,Amina,ITC\nb@example.org,Bilal,\n");
  assert.deepEqual(out.fieldNames, ["first_name", "org"]);
  assert.equal(out.rows.length, 2);
  assert.deepEqual(out.rows[0], { email: "amina@example.org", fields: { first_name: "Amina", org: "ITC" } });
  assert.deepEqual(out.rows[1].fields, { first_name: "Bilal", org: "" });
  assert.equal(out.skipped, 0);
});

test("csv: quoted fields may contain commas and newlines", () => {
  const out = parseContactsCsv('email,note\na@example.org,"hello, world"\nb@example.org,"line one\nline two"\n');
  assert.equal(out.rows[0].fields.note, "hello, world");
  assert.equal(out.rows[1].fields.note, "line one\nline two");
});

test('csv: "" inside a quoted field is an escaped quote', () => {
  const out = parseContactsCsv('email,quote\na@example.org,"she said ""hi"""\n');
  assert.equal(out.rows[0].fields.quote, 'she said "hi"');
});

test("csv: a header with no email column is rejected", () => {
  assert.throws(() => parseContactsCsv("name,org\nAmina,ITC\n"), /needs a column named "email"/);
});

test("csv: rows with an empty or implausible email are skipped, not inserted blank", () => {
  const out = parseContactsCsv("email,name\n,Nobody\nnot-an-email,Also Nobody\nreal@example.org,Someone\n");
  assert.equal(out.rows.length, 1);
  assert.equal(out.skipped, 2);
});

test("csv: the email column is matched case-insensitively and normalized to lowercase", () => {
  const out = parseContactsCsv("Email,Name\nAMINA@Example.ORG,Amina\n");
  assert.equal(out.rows[0].email, "amina@example.org");
});

test("csv: header names become safe merge-tag keys", () => {
  const out = parseContactsCsv("email,First Name,Org!\na@example.org,Amina,ITC\n");
  assert.deepEqual(out.fieldNames, ["first_name", "org"]);
});

test("csv: an empty file parses to nothing, not an error", () => {
  const out = parseContactsCsv("");
  assert.deepEqual(out, { fieldNames: [], rows: [], skipped: 0 });
});
