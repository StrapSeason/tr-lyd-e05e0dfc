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

  // Phones / narrow screens: several scaled-down slides are on screen at once, so time-based entrances all fire
  // together. There the motion is SCROLL-LINKED instead: each slide's timeline is scrubbed by how far the slide
  // has travelled into the viewport (smoothed), so its pictures, headings and text arrive one after another as
  // you scroll. Desktop keeps time-based entrances, but slides that enter together start one after another.
  const SCRUB = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const SPREAD = SCRUB ? 1.7 : 1;                      // more air between elements when scrubbed

  function build(slide) {
    const { media, heads, body } = targets(slide);
    const anims = [];
    let total = 0;
    const add = (el, kf, delay, dur) => {
      delay *= SPREAD;
      const a = el.animate(kf, { duration: dur, delay, easing: SCRUB ? 'cubic-bezier(.3,.55,.3,1)' : EASE, fill: 'backwards' });
      a.pause(); a.currentTime = 0; anims.push(a);
      total = Math.max(total, delay + dur);
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
    return { anims, total };
  }

  const finish = plan => plan.anims.forEach(a => a.cancel());   // back to the slide's own CSS

  function initTime(slides, plans) {
    let nextStart = 0;                                  // queue: slides entering together go one by one
    const io = new IntersectionObserver(entries => {
      const hits = entries.filter(e => e.isIntersecting && plans.has(e.target))
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      for (const e of hits) {
        const plan = plans.get(e.target);
        plans.delete(e.target); io.unobserve(e.target);
        const now = performance.now(), start = Math.max(now, nextStart);
        nextStart = start + 450;
        setTimeout(() => plan.anims.forEach(a => { a.play(); a.finished.then(() => a.cancel(), () => {}); }), start - now);
      }
    }, { threshold: 0.45, rootMargin: '0px 0px -10% 0px' });
    slides.forEach(s => io.observe(s));
  }

  function initScrub(slides, plans) {
    // progress 0 when the slide's top reaches the bottom of the screen, 1 when it reaches 25 % from the top
    const state = new Map(slides.map(s => [s, { target: 0, shown: 0 }]));
    let ticking = false;
    const measure = () => {
      const vh = innerHeight;
      for (const [s, st] of state) {
        const top = s.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.75)));
        st.target = Math.max(st.target, p);               // never un-reveal on scroll back
      }
    };
    const frame = () => {
      let busy = false;
      for (const [s, st] of state) {
        const plan = plans.get(s);
        if (!plan) continue;
        st.shown += (st.target - st.shown) * 0.09;        // smoothing: eases toward the scroll position
        if (st.target - st.shown < 0.002) st.shown = st.target;
        plan.anims.forEach(a => { a.currentTime = st.shown * plan.total; });
        if (st.shown >= 1) { finish(plan); plans.delete(s); state.delete(s); }
        else if (st.shown !== st.target) busy = true;
      }
      ticking = busy;
      if (busy) requestAnimationFrame(frame);
    };
    const kick = () => { measure(); if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    kick();
  }

  function init() {
    const slides = [...document.querySelectorAll('section.slide')].filter(s => !s.dataset.scene);   // scene-driven slides animate themselves
    const plans = new Map(slides.map(s => [s, build(s)]));   // every slide starts at its first frame
    (SCRUB ? initScrub : initTime)(slides, plans);
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
