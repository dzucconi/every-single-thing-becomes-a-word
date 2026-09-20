import { test } from "node:test";
import assert from "node:assert/strict";
import { captureEdit, applyEdit, appendEdit, parseRecording, recordedSteps, encodeRecording, decodeRecording } from "../src/recording.ts";

test("records and replays typing, backspaces, middle edits, paste, and undo exactly", async () => {
  const values = ["", "H", "He", "Helo", "Hel", "Hello", "Hello world", "Hello 🌍", "Hello 👩‍💻", "e\u0301 Hello 👩‍💻", "Hello 👩‍💻", ""];
  const edits = values.slice(1).map((value, i) => captureEdit(values[i], value, 37 + i * 123));
  const recording = [values[0], edits];
  const decoded = await decodeRecording(await encodeRecording(recording));
  assert.deepEqual(decoded, recording);
  const steps = [...recordedSteps(decoded)];
  assert.deepEqual(steps.map(step => step.value), values.slice(1));
  assert.deepEqual(steps.map(step => step.delay), edits.map(edit => edit[0]));
  assert.equal(steps.at(-1).caret, 0);
});

test("preserves initial contents and long pauses without inventing edits", async () => {
  const recording = ["already here", [captureEdit("already here", "already here!", 12_345)]];
  const steps = [...recordedSteps(await decodeRecording(await encodeRecording(recording)))];
  assert.deepEqual(steps, [{ value: "already here!", delay: 12_345, caret: 13 }]);
  assert.deepEqual(await decodeRecording(await encodeRecording(["", []])), ["", []]);
});

test("recording compresses repeated edit structure and round-trips in a URL", async () => {
  let text = "";
  const edits = Array.from({ length: 200 }, (_, i) => {
    const next = text + "a";
    const edit = captureEdit(text, next, 80);
    text = next;
    return edit;
  });
  const recording = ["", edits];
  const encoded = await encodeRecording(recording);
  assert.ok(encoded.length < JSON.stringify(recording).length / 2);
  const url = new URL("https://example.com");
  url.searchParams.set("recording", encoded);
  assert.deepEqual(await decodeRecording(url.searchParams.get("recording")), recording);
});

test("rejects corrupted recordings and invalid edit positions or timings", async () => {
  for (const value of ["", "2.abc", "1.not-valid", "1.!"]) {
    await assert.rejects(decodeRecording(value));
  }
  for (const recording of [["", [[10, 1, 0, "x"]]], ["a", [[10, 0, 2, ""]]], ["", [[-1, 0, 0, "x"]]]]) {
    await assert.rejects(decodeRecording(await encodeRecording(recording)));
  }
});

test("minimal edits preserve arbitrary Unicode changes", () => {
  const values = ["😀", "😃", "👩‍💻", "👨‍💻", "a\r\nb", "a\nb", "", "\u0000é"];
  for (const before of values) {
    for (const after of values) {
      assert.equal(applyEdit(before, captureEdit(before, after, 80)), after);
    }
  }
});

test("appending edits preserves previous recording snapshots", () => {
  const original = Object.freeze(["a", Object.freeze([])]);
  const edit = captureEdit("a", "ab", 100);
  const next = appendEdit(original, edit);
  assert.deepEqual(original, ["a", []]);
  assert.deepEqual(next, ["a", [edit]]);
  assert.notEqual(next, original);
  assert.notEqual(next[1], original[1]);
});

test("validates unknown recording data and sequential edit bounds", () => {
  for (const value of [null, {}, [], [1, []], ["", {}], ["", [null]],
    ["", [[0, 0, 0]]], ["", [["0", 0, 0, "a"]]],
    ["", [[0, 0, 0, 1]]], ["", [[0.5, 0, 0, "a"]]],
    ["", [[2_147_483_648, 0, 0, "a"]]],
    ["a", [[0, 0, 1, ""], [0, 1, 0, "b"]]]]) {
    assert.throws(() => parseRecording(value));
  }
  assert.deepEqual(parseRecording(["", [[0, 0, 0, "a"], [0, 1, 0, "b"]]]),
    ["", [[0, 0, 0, "a"], [0, 1, 0, "b"]]]);
});
