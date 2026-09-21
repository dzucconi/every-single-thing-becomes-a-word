import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { linkSize } from "../src/recording.ts";

const source = (await readFile(new URL("../src/app.ts", import.meta.url), "utf8"))
  .replace(/^import[\s\S]*?;\n/gm, "");
const debounceSource = await readFile(new URL("../src/debounce.ts", import.meta.url), "utf8");

function app() {
  let time = 0;
  let timerId = 0;
  let encoded = "1.abc";
  const timers = new Map();
  const elements = new Map();
  const writes = [];
  const clipboard = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: "", textContent: "", dataset: {}, handlers: {},
      addEventListener(name, callback) { this.handlers[name] = callback; },
      setAttribute() {}, focus() {}, setSelectionRange() {},
    });
    return elements.get(id);
  };
  const location = { href: "https://example.com/", search: "" };
  vm.runInNewContext(stripTypeScriptTypes((debounceSource + "\n" + source).replace(/^export /gm, "")) + "\ninitApp();", {
    requireElement: selector => element(selector),
    navigator: { clipboard: { writeText: async value => clipboard.push(value) } },
    document: { querySelector: element }, window: { location, addEventListener() {} },
    history: { replaceState(_state, _title, url) { location.href = String(url); writes.push(location.href); } },
    performance: { now: () => time }, URL, URLSearchParams, LINK_LIMIT: 8000, linkSize,
    appendEdit: (recording, edit) => [recording[0], [...recording[1], edit]],
    braid: value => value, captureEdit: () => [1, 0, 0, "a"],
    encodeRecording: async () => encoded,
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, at: time + delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    element, writes, clipboard, setEncoded: value => { encoded = value; },
    click: id => element(id).handlers.click(),
    input(value) { element("#input").value = value; element("#input").handlers.input(); },
    async tick(ms) {
      const target = time + ms;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > target) break;
        time = next[1].at;
        timers.delete(next[0]);
        await next[1].callback();
      }
      time = target;
      await new Promise(setImmediate);
    },
  };
}

test("saving waits for a typing pause, while Stop flushes immediately", async () => {
  const page = app();
  page.click("#record");
  await page.tick(300);
  page.input("a");
  await page.tick(599);
  assert.equal(page.writes.length, 0);
  await page.tick(1);
  assert.equal(page.writes.length, 1);
  page.input("ab");
  page.click("#record");
  await page.tick(0);
  assert.equal(page.writes.length, 2);
  await page.tick(2000);
  assert.equal(page.writes.length, 2);
});

test("continuous typing still saves at the two-second checkpoint", async () => {
  const page = app();
  page.click("#record");
  for (let i = 0; i < 8; i++) {
    page.input("a".repeat(i + 1));
    await page.tick(250);
  }
  assert.equal(page.writes.length, 1);
});

test("oversized links keep the last valid URL and a persistent error", async () => {
  const page = app();
  page.click("#record");
  await page.tick(600);
  assert.equal(page.writes.length, 1);
  page.setEncoded("1." + "a".repeat(8100));
  page.input("large recording");
  await page.tick(600);
  assert.equal(page.writes.length, 1);
  assert.equal(page.element("#copy-link").disabled, true);
  assert.equal(page.element("#link-state").dataset.state, "error");
  page.input("another edit");
  assert.match(page.element("#link-message").textContent, /Link too long/);
  page.setEncoded("1.small");
  await page.tick(600);
  assert.equal(page.writes.length, 2);
  assert.equal(page.element("#copy-link").disabled, false);
  assert.equal(page.element("#link-state").dataset.state, "saved");
});

test("link budget includes exact boundaries and counts bytes", () => {
  assert.equal(linkSize("a".repeat(6399)).level, "saved");
  assert.equal(linkSize("a".repeat(6400)).level, "warning");
  assert.equal(linkSize("a".repeat(8000)).level, "warning");
  assert.equal(linkSize("a".repeat(8001)).level, "error");
  assert.equal(linkSize("é").bytes, 2);
});


test("composition links preserve current text without playback or recording history", async () => {
  const page = app();
  page.click("#record");
  await page.tick(600);
  const value = "hello & goodbye + é 👋\nnew line";
  page.input(value);
  await page.click("#copy-composition");
  const url = new URL(page.clipboard[0]);
  assert.equal(url.searchParams.get("text"), value);
  assert.equal(url.searchParams.has("recording"), false);
  assert.equal(url.searchParams.has("playback"), false);
  assert.equal(page.writes.length, 1);
  assert.equal(page.element("#copy-composition").textContent, "Copied");
  await page.tick(3000);
  assert.equal(page.element("#copy-composition").textContent, "Copy link");
});

test("composition links work without recording and reject oversized URLs", async () => {
  const page = app();
  assert.equal(page.element("#copy-composition").disabled, true);
  page.input("a composition");
  assert.equal(page.element("#copy-composition").disabled, false);
  await page.click("#copy-composition");
  assert.equal(new URL(page.clipboard[0]).searchParams.get("text"), "a composition");
  page.input("a".repeat(8000));
  await page.click("#copy-composition");
  assert.equal(page.clipboard.length, 1);
  assert.equal(page.element("#copy-composition").textContent, "Link too long");
  assert.equal(page.writes.length, 0);
});
