import braid from "./lib/braid";
import { compress, decompress } from "./lib/lzw";
import { parse } from "./lib/qs";

const stage = document.getElementById("stage");
const input = document.getElementById("input");

const render = () => (stage.innerHTML = braid({ input: input.value }));

const publish = x => {
  const value = x || input.value.replace(/(?:\r\n|\r|\n)/g, " ");
  history.replaceState(null, null, value ? `?q=${compress(value)}` : "?");
};

input.addEventListener("input", () => {
  publish("");
  render();
});

const { q } = parse(location.search);

if (q) {
  input.value = decompress(q);
  render();
}

stage.addEventListener("click", () => {
  if (!stage.value) return;
  stage.setSelectionRange(0, stage.value.length);
});
