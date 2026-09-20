import { braid } from "./braid.js";
import { typingSteps } from "./typing.js";
import {
  captureEdit,
  recordedSteps,
  encodeRecording,
  decodeRecording,
  linkSize,
  LINK_LIMIT,
} from "./recording.js";

const input = document.querySelector("#input");
const output = document.querySelector("#output");
const copy = document.querySelector("#copy");
const record = document.querySelector("#record");
const replay = document.querySelector("#replay");
const copyLink = document.querySelector("#copy-link");
const linkState = document.querySelector("#link-state");
const linkSizeLabel = document.querySelector("#link-size");
const linkMessage = document.querySelector("#link-message");
const feedbackTimers = new Map();
function feedback(button, message, label) {
  clearTimeout(feedbackTimers.get(button));
  button.textContent = message;
  feedbackTimers.set(
    button,
    setTimeout(() => {
      button.textContent = label;
      feedbackTimers.delete(button);
    }, 3000),
  );
}

let playbackTimer;
let interaction = 0;
let recording = null;
let isRecording = false;
let previousValue = "";
let lastEdit = 0;
let saveTimer;
let checkpointTimer;
let saveRevision = 0;
let saveInFlight;
let lastAttemptRevision = -1;
let lastSaveSucceeded = false;

function showLinkSize(url) {
  const size = linkSize(url);
  linkState.hidden = false;
  linkState.dataset.state = size.level;
  linkSizeLabel.textContent = `Link ${size.bytes.toLocaleString("en-US")} / ${LINK_LIMIT.toLocaleString("en-US")} bytes`;
  linkMessage.textContent =
    size.level === "error"
      ? "Link too long. Latest edits aren’t saved in the URL; replay still works."
      : "";
  return size.level !== "error";
}

function update() {
  output.value = braid(input.value);
  copy.disabled = output.value.length === 0;
}

function stopPlayback() {
  clearTimeout(playbackTimer);
  replay.textContent = "Replay";
  interaction++;
}

function play(steps) {
  stopPlayback();
  replay.textContent = "Playing";
  function advance() {
    const next = steps.next();
    if (next.done) {
      replay.textContent = "Replay";
      return;
    }
    playbackTimer = setTimeout(() => {
      input.value = next.value.value;
      const caret = next.value.caret ?? input.value.length;
      input.setSelectionRange(caret, caret);
      input.scrollTop = input.scrollHeight;
      update();
      advance();
    }, next.value.delay);
  }
  advance();
}

async function saveURL() {
  clearTimeout(saveTimer);
  clearTimeout(checkpointTimer);
  saveTimer = undefined;
  checkpointTimer = undefined;
  if (saveInFlight) {
    await saveInFlight;
    return saveURL();
  }
  if (lastAttemptRevision === saveRevision) return lastSaveSucceeded;
  const revision = saveRevision;
  saveInFlight = (async () => {
    try {
      const encoded = await encodeRecording(recording);
      if (revision !== saveRevision) return false;
      const url = new URL(window.location.href);
      url.searchParams.delete("text");
      url.searchParams.set("recording", encoded);
      url.searchParams.set("playback", "1");
      if (!showLinkSize(url)) {
        copyLink.disabled = true;
        return false;
      }
      history.replaceState(null, "", url);
      copyLink.disabled = false;
      return true;
    } catch {
      if (revision !== saveRevision) return false;
      copyLink.disabled = true;
      linkState.hidden = false;
      linkState.dataset.state = "error";
      linkMessage.textContent =
        "Couldn’t save the recording to the URL. Replay still works.";
      return false;
    }
  })();
  const result = await saveInFlight;
  saveInFlight = undefined;
  if (revision === saveRevision) {
    lastAttemptRevision = revision;
    lastSaveSucceeded = result;
  }
  return result;
}

function queueSave() {
  saveRevision++;
  linkState.hidden = false;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveURL, 600);
  // Bound how stale the URL can become during uninterrupted typing.
  if (checkpointTimer === undefined)
    checkpointTimer = setTimeout(saveURL, 2000);
}

function stopRecording() {
  isRecording = false;
  record.textContent = "Record";
  record.setAttribute("aria-pressed", "false");
}

record.addEventListener("click", () => {
  stopPlayback();
  clearTimeout(feedbackTimers.get(record));
  if (isRecording) {
    stopRecording();
    feedback(record, "Stopped", "Record");
    void saveURL();
    return;
  }
  recording = [input.value, []];
  previousValue = input.value;
  lastEdit = performance.now();
  isRecording = true;
  record.textContent = "Stop";
  record.setAttribute("aria-pressed", "true");
  replay.disabled = false;
  queueSave();
  input.focus();
});

input.addEventListener("beforeinput", stopPlayback);
input.addEventListener("input", () => {
  stopPlayback();
  update();
  if (isRecording && input.value !== previousValue) {
    const now = performance.now();
    recording[1].push(captureEdit(previousValue, input.value, now - lastEdit));
    previousValue = input.value;
    lastEdit = now;
    queueSave();
  }
});
window.addEventListener("pageshow", update);

replay.addEventListener("click", () => {
  if (!recording) return;
  if (isRecording) {
    stopRecording();
    void saveURL();
  }
  input.value = recording[0];
  input.focus();
  update();
  play(recordedSteps(recording));
});

copyLink.addEventListener("click", async () => {
  if (!recording || !(await saveURL())) return;
  try {
    await navigator.clipboard.writeText(window.location.href);
    feedback(copyLink, "Copied", "Copy link");
  } catch {
    feedback(copyLink, "Copy from address bar", "Copy link");
  }
});

copy.addEventListener("click", async () => {
  const value = output.value;
  try {
    await navigator.clipboard.writeText(value);
    feedback(copy, "Copied", "Copy");
  } catch {
    output.focus();
    output.select();
    feedback(copy, "Select Copy from menu", "Copy");
  }
});

async function loadComposition() {
  const params = new URLSearchParams(window.location.search);
  const playback =
    params.has("playback") && !["0", "false"].includes(params.get("playback"));
  const encoded = params.get("recording");
  if (encoded !== null) {
    const version = interaction;
    try {
      const loaded = await decodeRecording(encoded);
      if (version !== interaction) return;
      recording = loaded;
      replay.disabled = false;
      copyLink.disabled = !showLinkSize(window.location.href);
      input.value = recording[0];
      if (playback) play(recordedSteps(recording));
      else
        for (const step of recordedSteps(recording)) input.value = step.value;
      update();
    } catch {
      if (version === interaction) {
        linkState.hidden = false;
        linkState.dataset.state = "error";
        linkMessage.textContent = "This recording link couldn’t be read.";
      }
    }
    return;
  }
  const text = params.get("text");
  if (text !== null) {
    input.value = playback ? "" : text;
    if (playback) play(typingSteps(text));
    update();
  }
}
update();
void loadComposition();
