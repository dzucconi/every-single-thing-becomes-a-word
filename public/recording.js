// App sharing budget, not a guaranteed limit of every browser or host.
export const LINK_LIMIT = 8000;
export const LINK_WARNING = 6400;

export function linkSize(url) {
  const bytes = new TextEncoder().encode(String(url)).length;
  return { bytes, level: bytes > LINK_LIMIT ? "error" : bytes >= LINK_WARNING ? "warning" : "saved" };
}

/** Store each edit as [milliseconds, position, removed length, inserted text].
 * UTF-16 positions match textarea selections and preserve arbitrary edits. */
export function captureEdit(before, after, delay) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  return [Math.round(delay), start, oldEnd - start, after.slice(start, newEnd)];
}

export function applyEdit(value, [, start, removed, inserted]) {
  return value.slice(0, start) + inserted + value.slice(start + removed);
}

export function* recordedSteps([initial, edits]) {
  let value = initial;
  for (const edit of edits) {
    value = applyEdit(value, edit);
    yield { value, delay: edit[0], caret: edit[1] + edit[3].length };
  }
}

export async function encodeRecording(recording) {
  const source = new Blob([JSON.stringify(recording)]).stream();
  const bytes = new Uint8Array(await new Response(source.pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return "1." + btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function decodeRecording(encoded) {
  if (!/^1\.[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 1_000_000) {
    throw new Error("Invalid recording");
  }
  const bytes = Uint8Array.from(atob(encoded.slice(2).replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2_000_000) {
      await reader.cancel();
      throw new Error("Recording is too large");
    }
    chunks.push(value);
  }
  const recording = JSON.parse(await new Blob(chunks).text());
  if (!Array.isArray(recording) || recording.length !== 2 || typeof recording[0] !== "string" || !Array.isArray(recording[1])) {
    throw new Error("Invalid recording");
  }
  let length = recording[0].length;
  for (const edit of recording[1]) {
    if (!Array.isArray(edit) || edit.length !== 4 ||
        !edit.slice(0, 3).every(n => Number.isSafeInteger(n) && n >= 0) ||
        edit[0] > 2_147_483_647 || typeof edit[3] !== "string" ||
        edit[1] > length || edit[2] > length - edit[1]) {
      throw new Error("Invalid edit");
    }
    length += edit[3].length - edit[2];
  }
  return recording;
}
