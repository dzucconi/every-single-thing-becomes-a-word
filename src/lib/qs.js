export const parse = search =>
  search
    .slice(search.indexOf("?") + 1)
    .split("&")
    .reduce((memo, pair) => {
      const [key, value] = pair.split("=");
      if (!key) return memo;
      memo[key] = value ? decodeURIComponent(value) : null;
      return memo;
    }, {});
