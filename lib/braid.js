export const zip = rows => rows[0].map((_, i) => rows.map(row => row[i]));

export default x => {
  const tokens = x.split(/\s/g);
  const upTo = tokens.reduce((a, b) => a.length > b.length ? a : b).length;
  const normalized = tokens.map(token => token + Array(upTo - (token.length - 1)).join(' '));
  const leaves = normalized.map(token => token.split(''));
  return zip(leaves).map(token => token.join('')).join('');
};
