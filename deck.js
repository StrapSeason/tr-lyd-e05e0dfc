// Deck runtime: fixed-size slide canvases scaled to the viewport + reference compare mode.
//
// Every <section class="slide" data-ref="PIN_ID"> is laid out at its own canvas size —
// CSS vars --w / --h (px) on the section, falling back to <html> — and scaled with a
// transform, so each slide is written in absolute canvas px exactly like its reference
// and still fits any screen. Slides may differ in height (each keeps its pin's aspect);
// on the site they are simply sections.
//
// Reference image: data-ref-src (a crop of the pin, path from the server root) wins over
// data-ref (pin id → /design-refs/board.json → /design-refs/pins/<file>).
//
// URL params (for the build → compare loop):
//   ?solo=N              only slide N, fitted to the viewport (screenshots)
//   ?cmp=side|overlay|diff|ref|off   compare the solo slide with its reference
//   ?op=0.5              overlay opacity
//   ?raw=1               with solo: scale 1 at 0,0 — for shoot.mjs
// Keys: ← → slide · 1 side · 2 overlay · 3 diff · 4 ref only · 0 off · G grid
(() => {
  const qs = new URLSearchParams(location.search);
  const root = document.documentElement;
  const slides = [...document.querySelectorAll('.slide')];
  let solo = qs.has('solo') ? Math.max(1, Math.min(slides.length, +qs.get('solo'))) : 0;
  let cmp = qs.get('cmp') || 'off';
  const op = qs.get('op') || '0.5';
  const raw = qs.has('raw') && !!solo;
  // Rotated mode — for phones that never turn the page (rotation lock on, or a portrait-only in-app browser):
  // gate.js offers it and remembers it for the tab. The deck is laid out landscape and turned 90° inside a
  // sideways scroller, so the phone held on its side reads it upright. In real landscape it is the normal site.
  const ROT = !solo && matchMedia('(pointer: coarse)').matches && (() => {
    try { if (sessionStorage.getItem('rg-rot') === '1') return true; } catch (e) {}
    return location.hash === '#rot';
  })();
  if (ROT) root.classList.add('rg-rot');

  const sizeOf = s => { const cs = getComputedStyle(s);
    return [parseFloat(cs.getPropertyValue('--w')) || 1920, parseFloat(cs.getPropertyValue('--h')) || 1080]; };

  const boardUrl = root.dataset.board || '/design-refs/board.json';
  let board = null;
  const boardReady = fetch(boardUrl).then(r => r.ok ? r.json() : null).then(j => (board = j)).catch(() => null);
  const refSrc = s => {
    if (s.dataset.refSrc) return s.dataset.refSrc;
    const p = board?.pins.find(p => p.id === s.dataset.ref);
    if (!p) return null;
    return p.cached ? `/design-refs/pins/${p.file}` : p.orig;
  };

  slides.forEach((s, i) => {
    s.dataset.n = i + 1;
    const wrap = document.createElement('div');
    wrap.className = 'slide-frame';
    s.replaceWith(wrap);
    wrap.appendChild(s);
  });
  if (ROT && slides.length) {
    const sc = document.createElement('div'); sc.className = 'rg-rot-scroll';
    const pg = document.createElement('div'); pg.className = 'rg-rot-page';
    sc.appendChild(pg);
    slides[0].parentElement.before(sc);
    slides.forEach(s => pg.appendChild(s.parentElement));
  }

  function fit() {
    // rotated mode held upright-portrait: the logical page is the screen turned on its side
    const rotP = ROT && matchMedia('(orientation: portrait)').matches;
    const vw = rotP ? innerHeight : innerWidth, vh = rotP ? innerWidth : innerHeight;
    if (ROT) root.style.setProperty('--rg-lw', vw + 'px');
    slides.forEach((s, i) => {
      const frame = s.parentElement;
      const on = !solo || solo === i + 1;
      frame.hidden = !on;
      if (!on) return;
      const [W, H] = sizeOf(s);
      const sideBySide = solo && cmp === 'side';
      const availW = sideBySide ? vw / 2 : vw;
      // phones held sideways: each slide fits the screen whole (the site snaps slide by slide, see gate.js)
      const phoneLand = !solo && (rotP || matchMedia('(pointer: coarse) and (orientation: landscape)').matches);
      const k = raw ? 1 : solo ? Math.min(availW / W, vh / H) : phoneLand ? Math.min(vw / W, vh / H) : vw / W;
      s.style.transform = `scale(${k})`;
      frame.style.width = W * k + 'px';
      frame.style.height = H * k + 'px';
      frame.style.marginRight = sideBySide ? W * k + 'px' : '';
    });
  }

  async function compare() {
    document.querySelectorAll('.ref-layer').forEach(e => e.remove());
    root.dataset.cmp = solo ? cmp : 'off';
    if (!solo || cmp === 'off') return fit();
    await boardReady;
    const s = slides[solo - 1];
    const src = refSrc(s);
    if (!src) { console.warn('no ref for slide', solo); return fit(); }
    const img = new Image();
    img.className = 'ref-layer';
    img.src = src;
    img.style.setProperty('--op', op);
    s.parentElement.appendChild(img);
    fit();
  }

  addEventListener('resize', fit);
  addEventListener('keydown', e => {
    const modes = { '1': 'side', '2': 'overlay', '3': 'diff', '4': 'ref', '0': 'off' };
    if (modes[e.key]) { cmp = modes[e.key]; if (!solo) solo = 1; compare(); }
    if (e.key === 'ArrowRight' && solo) { solo = Math.min(slides.length, solo + 1); compare(); }
    if (e.key === 'ArrowLeft' && solo) { solo = Math.max(1, solo - 1); compare(); }
    if (e.key === 'g' || e.key === 'G') root.classList.toggle('show-grid');
  });

  document.fonts.ready.then(compare);
  compare();
  window.deck = { slides, go: n => { solo = n; compare(); }, mode: m => { cmp = m; compare(); } };
})();

// Loops: play GIF loops (video.loop with <source data-src>) while on screen. Skipped for ?raw shots so the gate sees the poster.
(() => {
  if (new URLSearchParams(location.search).has('raw')) return;
  const vids = [...document.querySelectorAll('video.loop, video[data-claim], .slide video')];
  const start = (v) => {
    let changed = false;
    v.querySelectorAll('source[data-src]').forEach(s => { if (!s.getAttribute('src')) { s.setAttribute('src', s.dataset.src); changed = true; } });
    if (changed) v.load();
    v.muted = true; v.playsInline = true; v.loop = true;
    const p = v.play(); if (p) p.catch(() => {});
  };
  if (!('IntersectionObserver' in window)) { vids.forEach(start); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) start(e.target); else e.target.pause(); }), { rootMargin: '300px' });
  vids.forEach(v => io.observe(v));
})();
