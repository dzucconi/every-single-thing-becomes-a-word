import braid, { zip } from "../../src/lib/braid";

describe("zip", () => {
  it("zips the arrays", () => {
    expect(zip([["a", "b", "c"], ["x", "y", "z"]])).toEqual([
      ["a", "x"],
      ["b", "y"],
      ["c", "z"]
    ]);
  });
});

describe("braid", () => {
  it("braids the text", () => {
    expect(braid({ input: "foo bar baz" })).toEqual("fbboaaorz");
  });
});
