import type { PlaybackStep } from "./types.ts";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const neighbors: Readonly<Record<string, string>> = {
  q: "wa", w: "qeas", e: "wrsd", r: "etdf", t: "ryfg", y: "tugh",
  u: "yihj", i: "uojk", o: "ipkl", p: "ol", a: "qwsz", s: "awedxz",
  d: "serfcx", f: "drtgvc", g: "ftyhbv", h: "gyujnb", j: "huikmn",
  k: "jiolm", l: "kop", z: "asx", x: "zsdc", c: "xdfv", v: "cfgb",
  b: "vghn", n: "bhjm", m: "njk",
};

/** Each step waits, then replaces the source, including visible corrections.
 * A generator keeps long compositions from allocating every intermediate string. */
export function* typingSteps(text: string, random: () => number = Math.random): Generator<PlaybackStep, void> {
  const between = (min: number, max: number) => min + random() * (max - min);
  let value = "";
  let previous = "";
  let burstRemaining = 0;
  let pace = 100;
  let sinceMistake = 0;

  for (const { segment: character } of segmenter.segment(text)) {
    if (burstRemaining-- <= 0) {
      burstRemaining = Math.floor(between(3, 9));
      pace = between(55, 125);
    }

    let delay = pace * between(0.65, 1.4);
    if (!value) delay += between(350, 700);
    else if (/\n/u.test(previous)) delay += between(650, 1200);
    else if (/[.!?]/u.test(previous)) delay += between(350, 800);
    else if (/[,;:—]/u.test(previous)) delay += between(180, 400);
    else if (/\s/u.test(previous)) {
      delay += between(40, 140);
      if (random() < 0.18) delay += between(250, 650);
    }

    const nearby = neighbors[character.toLowerCase()];
    if (nearby && sinceMistake > 12 && random() < 0.025) {
      let wrong = nearby.charAt(Math.floor(random() * nearby.length));
      if (character !== character.toLowerCase()) wrong = wrong.toUpperCase();
      yield { value: value + wrong, delay };
      // Notice the mistake, backspace, then resume with the intended character.
      yield { value, delay: between(220, 450) };
      delay = between(100, 200);
      sinceMistake = 0;
    }

    value += character;
    yield { value, delay };
    sinceMistake++;
    previous = character;
  }
}
