/* Phones: the treatment is viewed held sideways only.
 *  - Portrait → a full-screen «rotate to view» opener: a 3D ring of the treatment's own frames spins, a phone
 *    outline turns on its side, big ROTATE TO VIEW in the deck's yellow. The deck is hidden behind it.
 *  - Landscape → every slide fits the screen whole (deck.js) and the page snaps slide by slide.
 * Desktop and QA views (?solo, ?cmp, ?raw) are untouched. */
(() => {
  const q = new URLSearchParams(location.search);
  if (['solo', 'cmp', 'raw'].some(k => q.has(k))) return;
  const phone = matchMedia('(pointer: coarse)').matches;
  if (!phone) return;

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
  @media (orientation: portrait) { .rot-gate { display: flex; } html.rg-on, html.rg-on body { overflow: hidden; height: 100%; } }
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
  @keyframes rg-turn { 0%, 22% { transform: rotate(0); } 50%, 78% { transform: rotate(-90deg); } 100% { transform: rotate(0); } }
  .rg-title { font-family: 'Inter Tight', sans-serif; font-weight: 600; font-size: min(17vw, 92px); line-height: .9;
    letter-spacing: -.045em; text-transform: uppercase; color: #f9fe00; margin: 0; }
  .rg-sub { font-size: 14px; line-height: 1.35; color: #d8d8d0; margin: 0; }
  @media (prefers-reduced-motion: reduce) { .rg-ring, .rg-phone { animation: none; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  document.documentElement.classList.add('rg-on');

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
    </div>`;
  document.body.appendChild(gate);

  // after turning the phone, re-fit (deck.js listens to resize) and land on the nearest slide
  addEventListener('orientationchange', () => setTimeout(() => dispatchEvent(new Event('resize')), 250));
})();
