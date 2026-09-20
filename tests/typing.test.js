import { test } from "node:test";
import assert from "node:assert/strict";
import { typingSteps } from "../src/typing.ts";

test("playback finishes with exact source text across different random sequences", () => {
  const text = "Every single thing becomes a word. 👩‍💻 e\u0301\nMore  words!";
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const steps = [...typingSteps(text, random)];
    assert.equal(steps.at(-1).value, text);
    assert.ok(steps.every(step => Number.isFinite(step.delay) && step.delay > 0));
  }
});

test("mistakes are visibly deleted and corrected", () => {
  const text = "abcdefghijklmnop";
  const steps = [...typingSteps(text, () => 0)];
  const correction = steps.findIndex((step, index) => index > 0 && step.value.length < steps[index - 1].value.length);
  assert.ok(correction > 0);
  assert.equal(steps[correction].value, text.slice(0, 13));
  assert.equal(steps[correction + 1].value, text.slice(0, 14));
  assert.equal(steps.at(-1).value, text);
});

test("whole graphemes are typed and sentence pauses exceed normal keystrokes", () => {
  const steps = [...typingSteps("👩‍💻e\u0301.a", () => 0.5)];
  assert.deepEqual(steps.map(step => step.value), ["👩‍💻", "👩‍💻e\u0301", "👩‍💻e\u0301.", "👩‍💻e\u0301.a"]);
  assert.ok(steps[3].delay > steps[1].delay + 300);
  assert.deepEqual([...typingSteps("")], []);
});
