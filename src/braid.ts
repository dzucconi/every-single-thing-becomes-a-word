const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Read a padded grid of words down each column. Every whitespace character
 * separates a word, including empty words: spacing is part of the composition. */
export function braid(input: string): string {
  if (!input) return "";

  const words = input.split(/\s/u).map(word =>
    Array.from(segmenter.segment(word), ({ segment }) => segment)
  );
  const width = words.reduce((max, word) => Math.max(max, word.length), 0);
  return Array.from({ length: width }, (_, index) =>
    words.map(word => word[index] ?? " ").join("")
  ).join("");
}
