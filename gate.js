/* Phones: the treatment is viewed held sideways only.
 *  - Portrait → a full-screen «rotate to view» opener: a 3D ring of the treatment's own frames spins, a phone
 *    outline turns on its side, big ROTATE TO VIEW in the deck's yellow. The deck is hidden behind it.
 *  - Landscape → every slide fits the screen whole (deck.js) and the page snaps slide by slide.
 *  - Phones that never turn the page (rotation lock on, portrait-only in-app browsers like Instagram's): the opener
 *    offers «Экран не поворачивается?». A tap switches the tab to ROTATED MODE (deck.js): the deck is laid out
 *    landscape and turned 90° inside a sideways scroller, so the phone held on its side (top to the right, as the
 *    icon shows) reads it upright. On Android a phone held that way for 1.5 s while the page stays portrait switches
 *    by itself (iOS gives motion data only after a permission prompt, so there it is the tap).
 * Desktop and QA views (?solo, ?cmp, ?raw) are untouched. */
(() => {
  const q = new URLSearchParams(location.search);
  if (['solo', 'cmp', 'raw'].some(k => q.has(k))) return;
  const phone = matchMedia('(pointer: coarse)').matches;
  if (!phone) return;
  const ROT = document.documentElement.classList.contains('rg-rot');   // set by deck.js

  // one frame per slide: the poster of its first loop (or its first image), no repeats
  const frames = [];
  for (const s of document.querySelectorAll('section.slide')) {
    const m = s.querySelector('video[poster], img[src]');
    const src = m && (m.getAttribute('poster') || m.getAttribute('src'));
    if (src && !frames.includes(src)) frames.push(src);
  }
  const N = frames.length;

  const css = `
  .rot-gate { position: fixed; inset: 0; z-index: 9999; display: none; flex-direction: column; align-items: center;
    justify-content: space-between; padding: max(22px, env(safe-area-inset-top)) 22px max(26px, env(safe-area-inset-bottom));
    background: radial-gradient(120% 70% at 50% 45%, #1b1c1f 0%, #0b0b0b 62%); color: #f9fe00; overflow: hidden;
    font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  @media (orientation: portrait) {
    html:not(.rg-rot) .rot-gate { display: flex; }
    html.rg-on, html.rg-on body { overflow: hidden; height: 100%; }
    /* rotated mode: a sideways scroller; the page inside is the landscape deck turned 90° clockwise-to-read
       (content rotated -90°, so the phone's top goes to the right). Its logical width = the screen height. */
    html.rg-rot .rg-rot-scroll { position: fixed; inset: 0; overflow-x: auto; overflow-y: hidden; background: #111;
      overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory; }
    html.rg-rot .rg-rot-page { position: absolute; left: 0; top: 0; width: var(--rg-lw, 100vh);
      transform-origin: 0 0; transform: rotate(-90deg) translateX(-100%); }
    html.rg-rot .rg-rot-page > .slide-frame { scroll-snap-align: center; scroll-snap-stop: always; }
  }
  @media (orientation: landscape) {
    html.rg-on { scroll-snap-type: y mandatory; }
    html.rg-on .slide-frame { scroll-snap-align: center; scroll-snap-stop: always; }
  }
  .rg-top { width: 100%; display: flex; justify-content: space-between; font-size: 11px; line-height: 1.35;
    letter-spacing: .12em; text-transform: uppercase; color: #f9fe00; }
  .rg-top b { font-weight: 600; }
  .rg-stage { position: relative; width: 100%; flex: 1; display: flex; align-items: center; justify-content: center;
    perspective: 650px; perspective-origin: 50% 35%; }
  .rg-tilt { transform-style: preserve-3d; transform: rotateX(-13deg); }
  .rg-ring { position: relative; width: var(--pw); height: calc(var(--pw) * 1.28); transform-style: preserve-3d;
    animation: rg-spin 26s linear infinite; }
  .rg-ring > i { position: absolute; inset: 0; background: #222 center / cover no-repeat; border-radius: 3px;
    transform: rotateY(calc(var(--i) * 360deg / var(--n))) translateZ(var(--r)); backface-visibility: hidden;
    -webkit-backface-visibility: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,.06); }
  @keyframes rg-spin { to { transform: rotateY(-360deg); } }
  .rg-foot { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
  .rg-phone { width: 26px; height: 46px; border: 2.5px solid #f9fe00; border-radius: 6px; position: relative;
    animation: rg-turn 3.2s cubic-bezier(.6,0,.25,1) infinite; }
  .rg-phone::after { content: ''; position: absolute; left: 50%; bottom: 3px; width: 6px; height: 2px; margin-left: -3px;
    background: #f9fe00; border-radius: 1px; }
  /* turns clockwise (top to the right) — the same way rotated mode reads */
  @keyframes rg-turn { 0%, 22% { transform: rotate(0); } 50%, 78% { transform: rotate(90deg); } 100% { transform: rotate(0); } }
  .rg-title { font-family: 'Inter Tight', sans-serif; font-weight: 600; font-size: min(17vw, 92px); line-height: .9;
    letter-spacing: -.045em; text-transform: uppercase; color: #f9fe00; margin: 0; }
  .rg-sub { font-size: 14px; line-height: 1.35; color: #d8d8d0; margin: 0; }
  .rg-lock { margin-top: 6px; padding: 12px 18px; border: 1.5px solid rgba(249,254,0,.75); border-radius: 999px;
    background: transparent; color: #f9fe00; font: 500 14px/1.2 'Inter', sans-serif; letter-spacing: .01em;
    -webkit-tap-highlight-color: transparent; cursor: pointer; }
  .rg-lock:active { background: rgba(249,254,0,.14); }
  @media (prefers-reduced-motion: reduce) { .rg-ring, .rg-phone { animation: none; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  document.documentElement.classList.add('rg-on');

  // after turning the phone, re-fit (deck.js listens to resize) and land on the nearest slide
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 250));
  if (ROT) return;                                      // rotated mode: no opener, the deck is already sideways

  const enterRotated = () => {
    try { sessionStorage.setItem('rg-rot', '1'); } catch (e) { location.hash = 'rot'; }
    scrollTo(0, 0);
    location.reload();
  };

  const gate = document.createElement('div');
  gate.className = 'rot-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-label', 'Поверните телефон горизонтально, чтобы смотреть тритмент');
  const pw = 20; // panel width, vw
  const r = (N * (pw + 3)) / (2 * Math.PI); // ring radius so panels sit edge to edge with small gaps
  gate.innerHTML = `
    <div class="rg-top"><span><b>Victor Lyapakhin</b><br>Director’s treatment</span><span style="text-align:right"><b>Cloud.ru</b><br>2026</span></div>
    <div class="rg-stage"><div class="rg-tilt"><div class="rg-ring" style="--pw:${pw}vw; --n:${N}; --r:${r.toFixed(2)}vw">
      ${frames.map((f, i) => `<i style="--i:${i}; background-image:url('${f}')"></i>`).join('')}
    </div></div></div>
    <div class="rg-foot">
      <div class="rg-phone" aria-hidden="true"></div>
      <p class="rg-title">Rotate<br>to view</p>
      <p class="rg-sub">Поверните телефон горизонтально</p>
      <button class="rg-lock" type="button">Экран не поворачивается? Нажмите</button>
    </div>`;
  document.body.appendChild(gate);
  gate.querySelector('.rg-lock').addEventListener('click', enterRotated);

  // Android: held on its side (top to the right) for 1.5 s while the page is still portrait = the screen is locked
  if (/Android/i.test(navigator.userAgent) && 'DeviceMotionEvent' in window) {
    const portrait = matchMedia('(orientation: portrait)');
    let since = 0;
    addEventListener('devicemotion', e => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x == null || !portrait.matches) { since = 0; return; }
      const sideways = g.x < -7 && Math.abs(g.y) < 4;    // spec axes: top to the right → gravity along −x
      if (!sideways) { since = 0; return; }
      if (!since) since = performance.now();
      else if (performance.now() - since > 1500) { since = Infinity; enterRotated(); }
    });
  }
})();
