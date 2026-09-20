import { braid } from "./braid.ts";
import { typingSteps } from "./typing.ts";
import {
  captureEdit,
  appendEdit,
  recordedSteps,
  encodeRecording,
  decodeRecording,
  linkSize,
  LINK_LIMIT,
} from "./recording.ts";

import { requireElement } from "./dom.ts";
import type { Recording, PlaybackStep } from "./types.ts";

export function initApp(): void {
  const input = requireElement("#input", "textarea");
  const output = requireElement("#output", "textarea");
  const copy = requireElement("#copy", "button");
  const record = requireElement("#record", "button");
  const replay = requireElement("#replay", "button");
  const copyLink = requireElement("#copy-link", "button");
  const copyComposition = requireElement("#copy-composition", "button");
  const linkState = requireElement("#link-state", "div");
  const linkSizeLabel = requireElement("#link-size", "span");
  const linkMessage = requireElement("#link-message", "span");
  const feedbackTimers = new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>();
  function feedback(button: HTMLButtonElement, message: string, label: string): void {
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

  let playbackTimer: ReturnType<typeof setTimeout> | undefined;
  let interaction = 0;
  let recording: Recording | null = null;
  let isRecording = false;
  let previousValue = "";
  let lastEdit = 0;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let checkpointTimer: ReturnType<typeof setTimeout> | undefined;
  let saveRevision = 0;
  let saveInFlight: Promise<boolean> | undefined;
  let lastAttemptRevision = -1;
  let lastSaveSucceeded = false;

  function showLinkSize(url: string | URL): boolean {
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
    copyComposition.disabled = input.value.length === 0;
  }

  function stopPlayback() {
    clearTimeout(playbackTimer);
    replay.textContent = "Replay";
    interaction++;
  }

  function play(steps: Generator<PlaybackStep, void>): void {
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

  async function saveURL(): Promise<boolean> {
    clearTimeout(saveTimer);
    clearTimeout(checkpointTimer);
    saveTimer = undefined;
    checkpointTimer = undefined;
    if (saveInFlight) {
      await saveInFlight;
      return saveURL();
    }
    if (!recording) return false;
    const snapshot = recording;
    if (lastAttemptRevision === saveRevision) return lastSaveSucceeded;
    const revision = saveRevision;
    saveInFlight = (async () => {
      try {
        const encoded = await encodeRecording(snapshot);
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
    if (isRecording && recording && input.value !== previousValue) {
      const now = performance.now();
      recording = appendEdit(recording, captureEdit(previousValue, input.value, now - lastEdit));
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
      feedback(copyLink, "Copied", "Copy recording");
    } catch {
      feedback(copyLink, "Copy from address bar", "Copy recording");
    }
  });

  copyComposition.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("recording");
    url.searchParams.delete("playback");
    url.searchParams.set("text", input.value);
    if (linkSize(url).level === "error") {
      feedback(copyComposition, "Link too long", "Copy link");
      return;
    }
    try {
      await navigator.clipboard.writeText(url.href);
      feedback(copyComposition, "Copied", "Copy link");
    } catch {
      feedback(copyComposition, "Couldn’t copy", "Copy link");
    }
  });

  copy.addEventListener("click", async () => {
    const value = output.value;
    try {
      await navigator.clipboard.writeText(value);
      feedback(copy, "Copied", "Copy text");
    } catch {
      output.focus();
      output.select();
      feedback(copy, "Select Copy from menu", "Copy text");
    }
  });

  async function loadComposition() {
    const params = new URLSearchParams(window.location.search);
    const playback =
      params.has("playback") && !["0", "false"].includes(params.get("playback") ?? "");
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
}
