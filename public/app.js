import { braid } from "./braid.js";
import { typingSteps } from "./typing.js";

const input = document.querySelector("#input");
const output = document.querySelector("#output");
const copy = document.querySelector("#copy");
const status = document.querySelector("#status");

function update() {
  output.value = braid(input.value);
  copy.disabled = output.value.length === 0;
  status.textContent = "";
}

let playbackTimer;

input.addEventListener("beforeinput", () => clearTimeout(playbackTimer));
input.addEventListener("input", () => {
  clearTimeout(playbackTimer);
  update();
});
window.addEventListener("pageshow", update);
copy.addEventListener("click", async () => {
  const value = output.value;
  try {
    await navigator.clipboard.writeText(value);
    if (output.value === value) status.textContent = "Copied";
  } catch {
    output.focus();
    output.select();
    status.textContent = "Select Copy from your device’s menu.";
  }
});
const params = new URLSearchParams(window.location.search);
const text = params.get("text");
const playback = params.has("playback") && !["0", "false"].includes(params.get("playback"));

if (text !== null) {
  input.value = playback ? "" : text;
  if (playback) {
    const steps = typingSteps(text);

    function typeNextCharacter() {
      const next = steps.next();
      if (next.done) return;
      playbackTimer = setTimeout(() => {
        input.value = next.value.value;
        input.setSelectionRange(input.value.length, input.value.length);
        input.scrollTop = input.scrollHeight;
        update();
        typeNextCharacter();
      }, next.value.delay);
    }

    typeNextCharacter();
  }
}
update();
