// The hand-rolled Markdown-to-email renderer: merge tags, the small markup it supports, and that
// the unsubscribe link always lands in both the HTML and the plain-text alternative.
import { strict as assert } from "node:assert";
import test from "node:test";

import { applyMergeTags, renderEmail } from "../src/render.js";

test("merge tags: substitutes known fields and blanks unknown ones", () => {
  const out = applyMergeTags("Hi {{first_name}}, from {{org}} and {{nobody}}.", { first_name: "Amina", org: "ITC" });
  assert.equal(out, "Hi Amina, from ITC and .");
});

test("merge tags: matched case-insensitively", () => {
  assert.equal(applyMergeTags("{{First_Name}}", { first_name: "Amina" }), "Amina");
});

test("render: a heading, a paragraph and a list, in both html and text", () => {
  const { html, text } = renderEmail("# Welcome\n\nHello there.\n\n- one\n- two", { unsubscribeUrl: "https://e/u/tok" });
  assert.match(html, /<h1[^>]*>Welcome<\/h1>/);
  assert.match(html, /<p[^>]*>Hello there\.<\/p>/);
  assert.match(html, /<li[^>]*>one<\/li>/);
  assert.match(html, /<li[^>]*>two<\/li>/);
  assert.match(text, /WELCOME/);
  assert.match(text, /Hello there\./);
  assert.match(text, /- one/);
});

test("render: a bare [label](url) line becomes a styled button, not a plain inline link", () => {
  const { html, text } = renderEmail("[Read more](https://example.org/x)", { unsubscribeUrl: "https://e/u/tok" });
  assert.match(html, /<a href="https:\/\/example\.org\/x" style="[^"]*border-radius:999px[^"]*">Read more<\/a>/);
  assert.match(text, /Read more: https:\/\/example\.org\/x/);
});

test("render: the same [label](url) mid-paragraph stays an ordinary inline link", () => {
  const { html } = renderEmail("See [Read more](https://example.org/x) for details.", { unsubscribeUrl: "https://e/u/tok" });
  assert.match(html, /<a href="https:\/\/example\.org\/x" style="color:#2563eb[^"]*">Read more<\/a>/);
  assert.doesNotMatch(html, /border-radius:999px/);
});

test("render: inline bold, italic and a link inside a paragraph", () => {
  const { html, text } = renderEmail("This is **bold**, *italic*, and a [link](https://example.org).", { unsubscribeUrl: "https://e/u/tok" });
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<a href="https:\/\/example\.org"[^>]*>link<\/a>/);
  assert.match(text, /This is bold, italic, and a link \(https:\/\/example\.org\)\./);
});

test("render: html is escaped, so a stray <script> can't ride along", () => {
  const { html } = renderEmail("<script>alert(1)</script>", { unsubscribeUrl: "https://e/u/tok" });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("render: the unsubscribe link always appears, in both alternatives", () => {
  const { html, text } = renderEmail("Just a line.", { unsubscribeUrl: "https://e.example/u/abc123" });
  assert.match(html, /href="https:\/\/e\.example\/u\/abc123"/);
  assert.match(text, /Unsubscribe: https:\/\/e\.example\/u\/abc123/);
});
