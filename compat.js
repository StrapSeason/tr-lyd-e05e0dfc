/* Fallback for browsers without CSS `text-box` (cap-height trimming): older iOS Safari (< 18.2), older Android
 * browsers, Firefox. _compat-bake.mjs measured in Chrome, for every trimmed element:
 *   data-tb-mt / data-tb-mb — margins that reproduce the trimmed box in normal flow,
 *   data-tb-y               — where its text sits when trimmed (px from the slide's top, canvas units).
 * Step 1 applies the margins; step 2 (after fonts load) nudges any element whose text still sits elsewhere —
 * margin collapsing with a parent can make margins alone differ from a trim.
 * Modern browsers return immediately and use the native trim. Load before deck.js/anim.js. */
(() => {
  const force = new URLSearchParams(location.search).has('tbfallback');   // QA: simulate an old browser
  if (!force && window.CSS && CSS.supports && CSS.supports('text-box', 'trim-both cap alphabetic')) return;
  const els = [...document.querySelectorAll('[data-tb-mt]')];
  for (const el of els) {
    if (force) el.style.setProperty('text-box-trim', 'none');
    el.style.marginTop = el.dataset.tbMt + 'px';
    el.style.marginBottom = el.dataset.tbMb + 'px';
    if (el.dataset.tbClip) el.style.clipPath = el.dataset.tbClip;      // clip measured from the moved box top
  }
  const textTop = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().top; };
  const settle = () => {
    for (const el of els) {
      const sec = el.closest('section.slide');
      const sr = sec.getBoundingClientRect();
      const k = sr.height / (sec.offsetHeight || sr.height) || 1;            // deck.js scale
      const d = parseFloat(el.dataset.tbY) - (textTop(el) - sr.top) / k;    // canvas px still to move
      if (Math.abs(d) < 0.25) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.position === 'fixed') el.style.marginTop = (parseFloat(cs.marginTop) + d) + 'px';
      else { if (cs.position === 'static') el.style.position = 'relative'; el.style.top = ((parseFloat(cs.top) || 0) + d) + 'px'; }
    }
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(settle));
})();
