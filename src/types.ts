export type Edit = readonly [delay: number, start: number, removed: number, inserted: string];
export type Recording = readonly [initial: string, edits: readonly Edit[]];
export type PlaybackStep = Readonly<{ value: string; delay: number; caret?: number }>;
export type LinkSize = Readonly<{ bytes: number; level: "error" | "warning" | "saved" }>;
