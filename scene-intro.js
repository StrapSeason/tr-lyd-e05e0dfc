/* INTRO slide as a scroll-driven scene (user's reference: the Capture One opener — small frames flashing around
 * the middle while you scroll, everything settling into the title at the end).
 *
 * The slide is pinned for a few screens of scroll; the scroll position drives three phases:
 *   1) 0.00–0.58  cards: the treatment's own frames flash in and out around the centre on black;
 *   2) 0.45–0.70  the slide's own footage fades in, the giant letters I·N·T·R·O land one by one;
 *   3) 0.66–1.00  the text blocks and the small windows reveal one after another.
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
  .scene { position: relative; }
  .scene > .slide-frame { position: sticky; scroll-snap-align: none !important; }
  .s02-cards { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
  .s02-card { position: absolute; background: #16171b center / cover no-repeat; opacity: 0;
    box-shadow: 0 18px 50px rgba(0,0,0,.45); will-change: transform, opacity; }
  .s02-veil { position: absolute; inset: 0; background: #0b0b0b; z-index: 2; pointer-events: none; }`;
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
    const a = 0.02 + (i / N) * 0.46;      // when it flashes in
    cards.push({ el, a, b: a + 0.10 + rnd() * 0.06, dx: (rnd() - 0.5) * 60, dy: (rnd() - 0.5) * 50 });
    layer.appendChild(el);
  }
  const veil = document.createElement('div');   // black field the cards fly on
  veil.className = 's02-veil';
  veil.setAttribute('aria-hidden', 'true');
  sec.append(veil, layer);

  // ── the slide's own parts, in reveal order
  const letters = [...sec.querySelectorAll('.gl')];
  const texts = [...sec.querySelectorAll('p.mt')];
  const wins = [...sec.querySelectorAll('.win')];
  const bg = sec.querySelector('.bg');
  const staged = [...letters, ...texts, ...wins, bg].filter(Boolean);
  staged.forEach(el => { el.style.willChange = 'opacity, transform'; });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => 1 - Math.pow(1 - t, 3);

  function draw(p) {
    // 1 · cards
    for (const c of cards) {
      const t = span(p, c.a, c.b);
      const vis = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;       // in and out
      c.el.style.opacity = (vis * (p < 0.62 ? 1 : clamp((0.7 - p) / 0.08))).toFixed(3);
      c.el.style.transform = `translate(${(c.dx * t).toFixed(1)}px, ${(c.dy * t).toFixed(1)}px) scale(${(0.92 + 0.12 * t).toFixed(3)})`;
    }
    // 2 · footage and the giant letters
    const bgIn = ease(span(p, 0.45, 0.66));
    veil.style.opacity = (1 - bgIn).toFixed(3);
    if (bg) { bg.style.opacity = bgIn.toFixed(3); bg.style.transform = `scale(${(1.06 - 0.06 * bgIn).toFixed(3)})`; }
    letters.forEach((el, i) => {
      const t = ease(span(p, 0.52 + i * 0.045, 0.64 + i * 0.045));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `translateY(${((1 - t) * 40).toFixed(1)}px)`;
    });
    // 3 · text blocks, then the small windows
    texts.forEach((el, i) => {
      const t = ease(span(p, 0.66 + i * 0.07, 0.80 + i * 0.07));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `translateY(${((1 - t) * 26).toFixed(1)}px)`;
    });
    wins.forEach((el, i) => {
      const t = ease(span(p, 0.74 + i * 0.06, 0.88 + i * 0.06));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `scale(${(0.94 + 0.06 * t).toFixed(3)})`;
    });
  }

  function layout() {
    const vh = innerHeight, fh = frame.getBoundingClientRect().height;
    scene.style.height = Math.round(vh + Math.max(vh * 2, 1400)) + 'px';   // ~3 screens of scroll
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
