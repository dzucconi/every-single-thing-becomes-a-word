import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = (await readFile(new URL("../src/menu.ts", import.meta.url), "utf8")).replace(/^import[\s\S]*?;\n/gm, "");
function setup(matches) {
  const handlers = {};
  const shell = { dataset: {}, addEventListener: (key, fn) => { handlers[key] = fn; } };
  const attributes = {};
  const toggle = {
    setAttribute: (key, value) => { attributes[key] = value; },
    getAttribute: key => attributes[key],
    addEventListener: (key, fn) => { handlers[key] = fn; },
    focus() { this.focused = true; },
  };
  const menu = { getBoundingClientRect: () => ({ left: 1000, right: 1280, top: 670, bottom: 720 }) };
  const linkState = { dataset: {}, hidden: false, getBoundingClientRect: () => ({ left: 12, right: 200, top: 690, bottom: 710 }) };
  const media = { matches, addEventListener: (key, fn) => { handlers[key] = fn; } };
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^export /gm, "")) + "\ninitMenu();", {
    requireElement: selector => ({ ".control-shell": shell, "#controls": menu, "#menu-toggle": toggle, "#link-state": linkState })[selector],
    document: { querySelector: selector => ({ '.control-shell': shell, '#controls': menu, '#menu-toggle': toggle, '#link-state': linkState })[selector] },
    window: { matchMedia: () => media, addEventListener: (key, fn) => { handlers[key] = fn; } },
    requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {},
  });
  return { shell, toggle, attributes, handlers, media, linkState };
}

test("mouse proximity reveals controls and moving away or leaving hides them", () => {
  const { shell, handlers } = setup(true);
  assert.equal(shell.dataset.near, 'false');
  handlers.pointermove({ pointerType: 'mouse', clientX: 1200, clientY: 630 });
  assert.equal(shell.dataset.near, 'true');
  handlers.pointermove({ pointerType: 'mouse', clientX: 400, clientY: 100 });
  assert.equal(shell.dataset.near, 'false');
  handlers.pointermove({ pointerType: 'mouse', clientX: 1200, clientY: 630 });
  handlers.pointerout({ relatedTarget: null });
  assert.equal(shell.dataset.near, 'false');
});

test("touch disclosure toggles and Escape closes it with focus restored", () => {
  const { shell, toggle, attributes, handlers } = setup(false);
  assert.equal(shell.dataset.mode, 'touch');
  handlers.click();
  assert.equal(attributes['aria-expanded'], 'true');
  handlers.keydown({ key: 'Escape' });
  assert.equal(attributes['aria-expanded'], 'false');
  assert.equal(toggle.focused, true);
});

test("changing input capability resets the disclosure", () => {
  const { shell, attributes, handlers, media } = setup(false);
  handlers.click();
  media.matches = true;
  handlers.change();
  assert.equal(shell.dataset.mode, 'mouse');
  assert.equal(attributes['aria-expanded'], 'false');
});
