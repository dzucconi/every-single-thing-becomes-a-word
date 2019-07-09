import randomColor from "./color";

export const zip = rows => rows[0].map((_, i) => rows.map(row => row[i]));

export default ({ input, ouputColor }) => {
  if (!input) return "";

  const tokens = input.split(/\s/g);
  const upTo = tokens.reduce((a, b) => (a.length > b.length ? a : b)).length;
  const normalized = tokens.map(
    token => token + Array(upTo - (token.length - 1)).join(" ")
  );
  const leaves = normalized.map(token => token.split(""));

  const braids = leaves.map(leaf => {
    if (ouputColor) {
      const color = randomColor();
      return leaf.map(
        letter => `<span style='color: ${color};'>${letter}</span>`
      );
    }
    return leaf;
  });

  return zip(braids)
    .map(token => token.join(""))
    .join("");
};
