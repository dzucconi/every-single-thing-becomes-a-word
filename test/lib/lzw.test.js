import { compress, decompress } from "../../src/lib/lzw";

const string = `
  Every single thing becomes a word
  in a language that Someone or Something, night and day,
  writes down in a never-ending scribble,
  which is the history of the world, embracing
  Rome, Carthage, you, me, everyone,
  my life, which I do not understand, this anguish
  of being enigma, accident, and puzzle,
  and all the discordant languages of Babel.
  Behind each name lies that which has no name.
  Today I feel its nameless shadow tremble
  in the blue clarity of the compass needle,
  whose rule extends as far as the far seas,
  something like a clock glimpsed in a dream
  or a bird that stirs suddenly in its sleep.
`;

describe("compress/decompress", () => {
  it("compresses/decompresses losslessly", () => {
    const compressed = compress(string);
    expect(compressed.length).toBe(381);
    expect(string.length).toBe(630);
    expect(decompress(compressed)).toEqual(string);
  });
});
