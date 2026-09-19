/* Entrance motion for the treatment site (deck-danya).
 * Each <section class="slide"> plays once when it scrolls into view:
 *   pictures open with a wipe and settle from a slight zoom → big headings rise out of a mask →
 *   running text fades up. The END state is the slide's own CSS — nothing is left transformed —
 *   so the gated layout is exactly what stays on screen.
 * Uses only the Web Animations API with the individual `translate` / `scale` properties, so it
 * never fights a slide's own `transform`. Off for QA views (?solo, ?cmp, ?raw, ?noanim) and for
 * prefers-reduced-motion. */
(() => {
  const q = new URLSearchParams(location.search);
  if (['solo', 'cmp', 'raw', 'noanim'].some(k => q.has(k))) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('animate' in Element.prototype)) return;

  const EASE = 'cubic-bezier(.19,.8,.22,1)';          // expo-ish out
  const HEAD_PX = 60;                                  // font-size at or above this = heading
  const px = el => parseFloat(getComputedStyle(el).fontSize) || 0;
  const hasOwnText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());

  function targets(slide) {
    const media = [], heads = [], body = [];
    const taken = new Set();
    // pictures: animate the smallest box that holds only this picture (a cell / card), else the element
    for (const m of slide.querySelectorAll('video, img')) {
      let box = m;
      const p = m.parentElement;
      if (p && p !== slide && p.querySelectorAll('video, img').length === 1 && !hasOwnText(p)) box = p;
      if (taken.has(box)) continue;
      taken.add(box);
      const r = box.getBoundingClientRect(), s = slide.getBoundingClientRect();
      media.push({ el: box, inner: m, area: r.width * r.height, full: r.width * r.height > 0.6 * s.width * s.height });
    }
    // text blocks: the outermost element that carries text directly
    const walk = el => {
      for (const c of el.children) {
        if (taken.has(c) || c.matches('video, img, source, script, style, svg')) continue;
        if (c.closest('[aria-hidden="true"]') && !c.textContent.trim()) continue;
        if (hasOwnText(c) || (c.children.length && [...c.children].every(k => /^(B|I|EM|STRONG|SPAN|BR|SUP|SUB|A)$/.test(k.tagName)) && c.textContent.trim())) {
          (px(c) >= HEAD_PX ? heads : body).push({ el: c });
          taken.add(c);
        } else walk(c);
      }
    };
    walk(slide);
    const top = e => e.el.getBoundingClientRect().top;
    media.sort((a, b) => b.area - a.area);
    heads.sort((a, b) => top(a) - top(b));
    body.sort((a, b) => top(a) - top(b));
    return { media, heads, body };
  }

  function build(slide) {
    const { media, heads, body } = targets(slide);
    const anims = [];
    const add = (el, kf, delay, dur) => {
      const a = el.animate(kf, { duration: dur, delay, easing: EASE, fill: 'backwards' });
      a.pause(); a.currentTime = 0; anims.push(a);
    };
    media.forEach((m, i) => {
      const d = i * 90;
      if (m.full) {
        add(m.el, [{ opacity: 0 }, { opacity: 1 }], 0, 900);
        add(m.inner, [{ scale: '1.08' }, { scale: '1' }], 0, 2200);
      } else {
        add(m.el, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], d, 1100);
        if (m.inner !== m.el) add(m.inner, [{ scale: '1.15' }, { scale: '1' }], d, 1600);
      }
    });
    const hStart = media.length ? 180 : 0;
    heads.forEach((h, i) => add(h.el, [
      { translate: '0 0.35em', opacity: 0 },
      { translate: '0 0', opacity: 1 }], hStart + i * 110, 1100));
    const bStart = hStart + Math.min(heads.length, 3) * 110 + 250;
    body.forEach((b, i) => add(b.el, [{ translate: '0 24px', opacity: 0 }, { translate: '0 0', opacity: 1 }],
      bStart + Math.min(i, 10) * 55, 800));
    return anims;
  }

  function init() {
    const slides = [...document.querySelectorAll('section.slide')];
    const plans = new Map();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const anims = plans.get(e.target);
        if (!anims) continue;
        plans.delete(e.target); io.unobserve(e.target);
        anims.forEach(a => { a.play(); a.finished.then(() => a.cancel(), () => {}); });
      }
    }, { threshold: 0.35 });
    for (const s of slides) {
      // slides already on screen at load still animate (they start from their first frame)
      plans.set(s, build(s));
      io.observe(s);
    }
    // 3D rings / strips marked data-sway drift slowly left↔right around the vertical axis, forever.
    // `rotate` composes with the element's own transform (its 3D placement stays intact).
    for (const el of document.querySelectorAll('[data-sway]')) {
      const deg = parseFloat(el.dataset.sway) || 5;
      // starts and loops through the rest pose (0°), so the approved static layout is where it begins
      const k = (d) => ({ rotate: `y ${d}deg`, easing: 'ease-in-out' });
      el.animate([k(0), k(-deg), k(0), k(deg), k(0)], { duration: 18000, iterations: Infinity });
    }
  }
  // wait for layout (fonts decide text boxes) before measuring
  const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(init));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
