import type { Edit, Recording, PlaybackStep, LinkSize } from "./types.ts";

// App sharing budget, not a guaranteed limit of every browser or host.
export const LINK_LIMIT = 8000;
export const LINK_WARNING = 6400;

export function linkSize(url: string | URL): LinkSize {
  const bytes = new TextEncoder().encode(String(url)).length;
  return { bytes, level: bytes > LINK_LIMIT ? "error" : bytes >= LINK_WARNING ? "warning" : "saved" };
}

/** Store each edit as [milliseconds, position, removed length, inserted text].
 * UTF-16 positions match textarea selections and preserve arbitrary edits. */
export function captureEdit(before: string, after: string, delay: number): Edit {
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

export function applyEdit(value: string, [, start, removed, inserted]: Edit): string {
  return value.slice(0, start) + inserted + value.slice(start + removed);
}

export function* recordedSteps([initial, edits]: Recording): Generator<PlaybackStep, void> {
  let value = initial;
  for (const edit of edits) {
    value = applyEdit(value, edit);
    yield { value, delay: edit[0], caret: edit[1] + edit[3].length };
  }
}

export async function encodeRecording(recording: Recording): Promise<string> {
  const source = new Blob([JSON.stringify(recording)]).stream();
  const bytes = new Uint8Array(await new Response(source.pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return "1." + btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function decodeRecording(encoded: string): Promise<Recording> {
  if (!/^1\.[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 1_000_000) {
    throw new Error("Invalid recording");
  }
  const bytes = Uint8Array.from(atob(encoded.slice(2).replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
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
  return parseRecording(JSON.parse(await new Blob(chunks).text()));
}

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);
const isNonnegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** Validate untrusted URL data before it reaches playback. */
export function parseRecording(value: unknown): Recording {
  if (!isUnknownArray(value) || value.length !== 2 ||
      typeof value[0] !== "string" || !isUnknownArray(value[1])) {
    throw new Error("Invalid recording");
  }
  const initial = value[0];
  let length = initial.length;
  const edits = value[1].map((edit): Edit => {
    if (!isUnknownArray(edit) || edit.length !== 4) throw new Error("Invalid edit");
    const [delay, start, removed, inserted] = edit;
    if (!isNonnegativeInteger(delay) || !isNonnegativeInteger(start) ||
        !isNonnegativeInteger(removed) || typeof inserted !== "string" ||
        delay > 2_147_483_647 || start > length || removed > length - start) {
      throw new Error("Invalid edit");
    }
    length += inserted.length - removed;
    return [delay, start, removed, inserted];
  });
  return [initial, edits];
}

export function appendEdit(recording: Recording, edit: Edit): Recording {
  return [recording[0], [...recording[1], edit]];
}
