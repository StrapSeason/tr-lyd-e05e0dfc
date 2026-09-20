/* INTRO slide as a scroll-driven scene (user's reference: the Capture One opener — small frames flashing around
 * the middle while you scroll, everything settling into the title at the end).
 *
 * The slide is pinned for a few screens of scroll; the scroll position drives the reveal order the user asked for
 * («сначала по буквам, потом гифки и текст») on the slide's own black field:
 *   1) 0.00–0.58  cards: the treatment's own frames flash in and out around the centre;
 *   2) 0.42–0.65  the giant word arrives letter by letter;
 *   3) 0.62–0.86  the paper card, then the four frames on it;
 *   4) 0.80–0.99  the text blocks, one after another.
 * At the end the slide is EXACTLY its approved layout — the scene only animates its way there.
 * Off for QA views (?solo, ?cmp, ?raw, ?noscene) and for reduced motion (slide shown as is). */
(() => {
  const q = new URLSearchParams(location.search);
  if (['solo', 'cmp', 'raw', 'noscene'].some(k => q.has(k))) return;
  const sec = document.querySelector('section.slide.s02');
  const frame = sec && sec.parentElement;
  if (!sec || !frame || !frame.classList.contains('slide-frame')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── the frames that flash: posters of the treatment's loops, this slide's own ones last
  const posters = [];
  for (const v of document.querySelectorAll('section.slide video[poster]')) {
    const p = v.getAttribute('poster');
    if (p && !posters.includes(p)) posters.push(p);
  }
  if (posters.length < 6) return;
  const mine = [...sec.querySelectorAll('video[poster]')].map(v => v.getAttribute('poster'));
  const pool = [...posters.filter(p => !mine.includes(p)), ...mine];

  const style = document.createElement('style');
  style.textContent = `
  /* On phones the page snaps slide by slide (gate.js: scroll-snap-type: y mandatory). The scene is taller than
     the screen, so giving IT the snap point — and taking it off the pinned frame — makes it an oversized snap
     area: every position inside it is a valid resting place, i.e. the scene scrolls freely instead of being
     skipped, and a fling still stops on it. */
  .scene { position: relative; scroll-snap-align: center; scroll-snap-stop: always; }
  .scene > .slide-frame { position: sticky; scroll-snap-align: none !important; scroll-snap-stop: normal !important; }
  .s02-cards { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
  .s02-card { position: absolute; background: #16171b center / cover no-repeat; opacity: 0;
    box-shadow: 0 18px 50px rgba(0,0,0,.45); will-change: transform, opacity; }
  `;
  document.head.appendChild(style);

  // ── pin the slide
  const scene = document.createElement('div');
  scene.className = 'scene';
  frame.replaceWith(scene);
  scene.appendChild(frame);
  sec.dataset.scene = 'intro';           // anim.js leaves this slide alone

  // ── cards: a cluster around the middle, in canvas px (they scale with the slide)
  let seed = 20260920;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const N = Math.min(16, pool.length);
  const layer = document.createElement('div');
  layer.className = 's02-cards';
  layer.setAttribute('aria-hidden', 'true');
  const cards = [];
  for (let i = 0; i < N; i++) {
    const portrait = rnd() < 0.4;
    const w = portrait ? 150 + rnd() * 120 : 230 + rnd() * 210;
    const h = portrait ? w * 1.35 : w * 0.5625;
    const cx = 960 + (rnd() - 0.5) * 1180, cy = 540 + (rnd() - 0.5) * 680;
    const el = document.createElement('div');
    el.className = 's02-card';
    el.style.cssText = `left:${(cx - w / 2).toFixed(1)}px; top:${(cy - h / 2).toFixed(1)}px; width:${w.toFixed(1)}px; height:${h.toFixed(1)}px; background-image:url('${pool[i % pool.length]}')`;
    const a = 0.02 + (i / N) * 0.38;      // when it flashes in
    cards.push({ el, a, b: a + 0.09 + rnd() * 0.05, dx: (rnd() - 0.5) * 60, dy: (rnd() - 0.5) * 50 });
    layer.appendChild(el);
  }
  sec.append(layer);                       // the slide's own field is already black

  // ── the slide's own parts, in the reveal order the user asked for: letters → frames → text
  // each letter of the giant word gets its own inline span (inline: no layout change at all)
  const letters = [];
  for (const g of sec.querySelectorAll('.gl')) {
    const text = g.textContent;
    g.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.textContent = ch;
      g.appendChild(s);
      letters.push(s);
    }
  }
  const texts = [...sec.querySelectorAll('p.mt')];
  const cells = [sec.querySelector('.bg'), ...sec.querySelectorAll('.win')].filter(Boolean);
  const plate = sec.querySelector('.card');          // the pin's paper card behind the frames
  [...letters, ...texts, ...cells, plate].filter(Boolean).forEach(el => { el.style.willChange = 'opacity, transform'; });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => 1 - Math.pow(1 - t, 3);

  function draw(p) {
    // 1 · cards
    for (const c of cards) {
      const t = span(p, c.a, c.b);
      const vis = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;       // in and out
      c.el.style.opacity = (vis * (p < 0.50 ? 1 : clamp((0.58 - p) / 0.08))).toFixed(3);
      c.el.style.transform = `translate(${(c.dx * t).toFixed(1)}px, ${(c.dy * t).toFixed(1)}px) scale(${(0.92 + 0.12 * t).toFixed(3)})`;
    }
    // 2 · the giant word, letter by letter (inline spans: opacity only, so nothing can shift)
    letters.forEach((el, i) => {
      el.style.opacity = ease(span(p, 0.42 + i * 0.035, 0.51 + i * 0.035)).toFixed(3);
    });
    // 3 · the paper card, then the four frames in it
    if (plate) {
      const t = ease(span(p, 0.62, 0.71));
      plate.style.opacity = t.toFixed(3);
      plate.style.transform = `scale(${(0.97 + 0.03 * t).toFixed(3)})`;
    }
    cells.forEach((el, i) => {
      const t = ease(span(p, 0.65 + i * 0.04, 0.74 + i * 0.04));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `scale(${(0.93 + 0.07 * t).toFixed(3)})`;
    });
    // 4 · the running text, block by block
    texts.forEach((el, i) => {
      const t = ease(span(p, 0.80 + i * 0.038, 0.875 + i * 0.038));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `translateY(${((1 - t) * 22).toFixed(1)}px)`;
    });
  }

  const PHONE = matchMedia('(pointer: coarse)').matches;
  function layout() {
    const vh = innerHeight, fh = frame.getBoundingClientRect().height;
    const travel = PHONE ? vh * 1.6 : Math.max(vh * 2, 1400);   // a thumb-length of drag on phones, ~3 screens on desktop
    scene.style.height = Math.round(vh + travel) + 'px';
    frame.style.top = Math.max(0, Math.round((vh - fh) / 2)) + 'px';
  }

  let shown = 0, target = 0, ticking = false;
  const measure = () => {
    const r = scene.getBoundingClientRect();
    const travel = scene.offsetHeight - innerHeight;
    target = clamp(travel > 0 ? -r.top / travel : 1);
  };
  const frameLoop = () => {
    shown += (target - shown) * 0.16;
    if (Math.abs(target - shown) < 0.002) shown = target;
    draw(shown);
    ticking = shown !== target;
    if (ticking) requestAnimationFrame(frameLoop);
  };
  const kick = () => { measure(); if (!ticking) { ticking = true; requestAnimationFrame(frameLoop); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { layout(); kick(); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    layout(); draw(0); kick();
  });
  layout(); draw(0);
})();
