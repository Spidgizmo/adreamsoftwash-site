import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/app/page.tsx", import.meta.url);
const binPath = new URL("../src/app/bin-cleaning/page.tsx", import.meta.url);
const cssPath = new URL("../src/app/globals.css", import.meta.url);
const headerPath = new URL("../src/components/SiteHeader.tsx", import.meta.url);
const footerPath = new URL("../src/components/SiteFooter.tsx", import.meta.url);

test("homepage uses ADS-owned gallery assets without forcing a slider", async () => {
  const home = await readFile(homePath, "utf8");

  assert.match(home, /\/gallery\/before-after-house-1\.JPG/);
  assert.match(home, /\/gallery\/before-after-roof-1\.JPG/);
  assert.match(home, /\/gallery\/before-after-drive\.JPG/);
  assert.match(home, /No stock-photo pretending/);
  assert.doesNotMatch(home, /BeforeAfterSlider|comparison slider/i);
});

test("bin-specific motion stays on the bin page and has no sound or fireworks", async () => {
  const [home, bin] = await Promise.all([
    readFile(homePath, "utf8"),
    readFile(binPath, "utf8"),
  ]);

  assert.match(bin, /<BinCleaningHeroGraphic \/>/);
  assert.doesNotMatch(home, /BinCleaningHeroGraphic/);
  assert.doesNotMatch(`${home}\n${bin}`, /<audio|<video|autoplay|fireworks/i);
});

test("motion is lightweight and respects reduced-motion preferences", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.marketing-hero/);
  assert.match(css, /\.bubble-field/);
  assert.match(css, /@keyframes cleanSweep/);
  assert.match(css, /animation-iteration-count: 1 !important/);
});

test("shared chrome uses darker ADS styling and red-blue accents", async () => {
  const [header, footer] = await Promise.all([
    readFile(headerPath, "utf8"),
    readFile(footerPath, "utf8"),
  ]);

  assert.match(header, /bg-\[#071b3b\]/);
  assert.match(header, /from-red-600 via-sky-400 to-cyan-300/);
  assert.match(footer, /bg-\[#06162f\]/);
  assert.match(footer, /from-cyan-300 via-sky-500 to-red-600/);
});
