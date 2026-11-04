// What a page gate measures in a real browser (0.22.0; the measurements come from taste-skill's inspector, written for the kit). measure()
// runs in the page, with no dependencies: `const facts = await page.evaluate(measure)` in Playwright, at each width. judge(facts) lists what fails.
// It is a floor, beside axe: `prove-page` says how to build the gate around it.
export function measure() {
  const vw = document.documentElement.clientWidth;
  const seen = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const lines = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].filter((r) => r.width > 1).map((r) => Math.round(r.top / 4))).size;
  };
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(seen);
  const texts = [...document.querySelectorAll('p,li,td,th,a,button,label,span')].filter((el) => seen(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const levels = headings.map((h) => Number(h.tagName[1]));
  const blocks = [...document.body.children].filter(seen).map((el) => el.getBoundingClientRect());
  return {
    width: vw,
    h1s: headings.filter((h) => h.tagName === 'H1').length,
    skippedHeading: levels.some((l, i) => i > 0 && l > levels[i - 1] + 1),
    overflowX: document.documentElement.scrollWidth > vw + 1,
    overflowing: [...document.querySelectorAll('body *')].filter((el) => seen(el) && el.getBoundingClientRect().right > vw + 1).slice(0, 5).map((el) => el.tagName.toLowerCase()),
    longHeadlines: headings.filter((h) => lines(h) > 2).map((h) => h.textContent.trim().slice(0, 60)),
    tinyText: texts.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).slice(0, 5).map((el) => el.textContent.trim().slice(0, 40)),
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? ''),
    hiddenAtRest: texts.filter((el) => parseFloat(getComputedStyle(el).opacity) === 0).length,
    margins: blocks.length ? [Math.round(Math.min(...blocks.map((b) => b.left))), Math.round(vw - Math.max(...blocks.map((b) => b.right)))] : [0, 0],
  };
}

const LAWS = {
  h1s: (f) => f.h1s !== 1 && `${f.h1s} h1 on the page; one says what this is`,
  skippedHeading: (f) => f.skippedHeading && 'a heading level is skipped',
  overflowX: (f) => f.overflowX && `the page scrolls sideways at ${f.width}px (${f.overflowing.join(', ')})`,
  longHeadlines: (f) => f.longHeadlines.length > 0 && `headline over two lines: ${f.longHeadlines[0]}`,
  tinyText: (f) => f.tinyText.length > 0 && `text under 12px: ${f.tinyText[0]}`,
  brokenImages: (f) => f.brokenImages.length > 0 && `broken image: ${f.brokenImages[0]}`,
  hiddenAtRest: (f) => f.hiddenAtRest > 0 && `${f.hiddenAtRest} text element(s) hidden at rest`,
  margins: (f) => Math.abs(f.margins[0] - f.margins[1]) > 2 && `unequal page margins: ${f.margins.join(' and ')}px`,
};

export const judge = (facts) => Object.values(LAWS).map((law) => law(facts)).filter(Boolean);
