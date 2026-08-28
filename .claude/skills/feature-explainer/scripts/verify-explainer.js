#!/usr/bin/env node
/**
 * Renders an explainer page in both themes and fails on the mistakes that are
 * invisible in source: sideways page scroll, a silently-fallen-back handwriting
 * font, a JS error, or a diagram wider than its container (right-hand boxes
 * clipped behind a scrollbar).
 *
 *   node .claude/skills/feature-explainer/scripts/verify-explainer.js <file.html>
 *
 * Screenshots are written beside the HTML. Exit code 0 is necessary, not
 * sufficient: open them.
 */
const path = require('path');
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('usage: verify-explainer.js <file.html>');
  process.exit(2);
}
const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error('no such file: ' + abs);
  process.exit(2);
}
const dir = path.dirname(abs);
const base = path.basename(abs, '.html');

// Resolve Playwright from the project being documented, not from wherever this runs.
let chromium;
try {
  const resolved = require.resolve('@playwright/test', { paths: [process.cwd(), __dirname, dir] });
  ({ chromium } = require(resolved));
} catch (e) {
  console.error('Could not resolve @playwright/test. Run from the project root.');
  process.exit(2);
}

(async () => {
  const failures = [];
  const browser = await chromium.launch();

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('file://' + abs, { waitUntil: 'networkidle' });

    const report = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      // Only diagrams must fit. A code block scrolling inside .panel is by design.
      const clipped = [...document.querySelectorAll('.board')]
        .filter((el) => el.scrollWidth - el.clientWidth > 2)
        .map((el) => (el.className || 'el') + ' +' + (el.scrollWidth - el.clientWidth) + 'px');
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return { overflow, clipped, bodyBg };
    });

    // document.fonts.check() is useless here: for an unknown family it falls back
    // to a system font and still returns true. Enumerate the loaded faces instead.
    const fontsOk = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
      return ['Architects Daughter', 'Caveat'].every((f) => loaded.includes(f));
    });

    await page.screenshot({ path: path.join(dir, base + '-' + scheme + '.png'), fullPage: true });
    const board = page.locator('.board').first();
    if (await board.count()) {
      await board.screenshot({ path: path.join(dir, base + '-board-' + scheme + '.png') });
    }

    const transparent = /rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(report.bodyBg);
    if (report.overflow > 0) failures.push(`[${scheme}] page scrolls sideways by ${report.overflow}px`);
    if (report.clipped.length) failures.push(`[${scheme}] content clipped: ${report.clipped.join(', ')}`);
    if (!fontsOk) failures.push(`[${scheme}] handwriting font did not load`);
    if (errors.length) failures.push(`[${scheme}] JS error: ${errors[0]}`);
    if (transparent) failures.push(`[${scheme}] body has no explicit background, it borrows the host theme`);

    console.log(
      `${scheme.padEnd(5)} | overflow ${String(report.overflow).padStart(3)}px | clipped ${report.clipped.length} | fonts ${fontsOk ? 'ok ' : 'NO '} | js errors ${errors.length}`
    );
    await ctx.close();
  }

  await browser.close();

  console.log('\nscreenshots -> ' + dir);
  if (failures.length) {
    console.error('\nFAILED:');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('checks passed. Now OPEN the screenshots: overlapping SVG text and stray strokes are not detectable here.');
})();
