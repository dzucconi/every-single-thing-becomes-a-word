import { test } from "node:test";
import assert from "node:assert/strict";
import { braid } from "../src/braid.ts";

test("braids words by column and preserves padding", () => {
  assert.equal(braid("abc de"), "adbec ");
  assert.equal(braid("one two"), "otnweo");
  assert.equal(braid("word"), "word");
});

test("preserves the original whitespace behavior", () => {
  assert.equal(braid(""), "");
  assert.equal(braid(" \n\t"), "");
  assert.equal(braid("a  b"), "a b");
  assert.equal(braid(" a "), " a ");
  assert.equal(braid("ab\ncd\tef"), "acebdf");
});

test("keeps emoji, joined emoji, and combining characters intact", () => {
  assert.equal(braid("😀a 🐈b"), "😀🐈ab");
  assert.equal(braid("👩‍💻x e\u0301y"), "👩‍💻e\u0301xy");
});
