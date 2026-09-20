/* Opening screen of the site (user's reference: the «100 best movies» intro — stills flying across a black field).
 * A black full-screen section is inserted before the first slide: about half of the treatment's own frames fly
 * through it one after another, then the title settles at the bottom. Scrolling continues into the deck as usual.
 * Off for QA views (?solo, ?cmp, ?raw, ?nointro). Reduced motion: no flight, just the title and one still. */
(() => {
  const q = new URLSearchParams(location.search);
  if (['solo', 'cmp', 'raw', 'nointro'].some(k => q.has(k))) return;
  const slides = [...document.querySelectorAll('section.slide')];
  if (!slides.length || document.querySelector('.intro')) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // frames: posters of the treatment's own loops, one per slide first, then the rest — about half of them all
  const all = [];
  for (const s of slides) for (const m of s.querySelectorAll('video[poster], img[src]')) {
    const src = m.getAttribute('poster') || m.getAttribute('src');
    if (src && !all.includes(src)) all.push(src);
  }
  const firstPerSlide = slides.map(s => { const m = s.querySelector('video[poster], img[src]'); return m && (m.getAttribute('poster') || m.getAttribute('src')); }).filter(Boolean);
  const pick = [...new Set([...firstPerSlide, ...all])].slice(0, Math.max(6, Math.round(all.length / 2)));

  const STEP = 420;                        // ms between two frames taking off
  const FLY = 2600;                        // ms one frame needs to cross the screen
  const total = (pick.length - 1) * STEP + FLY;

  const css = `
  .intro { position: relative; height: 100svh; min-height: 420px; background: #0b0b0b; overflow: hidden;
    display: flex; align-items: flex-end; justify-content: center; scroll-snap-align: center;
    font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .intro-stage { position: absolute; inset: 0; }
  .intro-card { position: absolute; left: 50%; top: 50%; width: clamp(300px, 46vw, 980px); aspect-ratio: 16 / 9; translate: -50% -50%;
    background: #15161a center / cover no-repeat; border-radius: 2px; opacity: 0;
    box-shadow: 0 30px 80px rgba(0,0,0,.55); will-change: transform, opacity; }
  .intro.play .intro-card { animation: intro-fly var(--fly) cubic-bezier(.33,0,.24,1) var(--d) both; }
  @keyframes intro-fly {
    0%   { opacity: 0; transform: translate(var(--x0), var(--y0)) rotate(var(--r0)) scale(1.14); }
    12%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { opacity: 0; transform: translate(var(--x1), var(--y1)) rotate(var(--r1)) scale(.92); }
  }
  .intro-last { position: absolute; left: 50%; top: 44%; width: clamp(320px, 52vw, 1100px); aspect-ratio: 16 / 9; translate: -50% -50%;
    background: #15161a center / cover no-repeat; border-radius: 2px; opacity: 0; box-shadow: 0 30px 90px rgba(0,0,0,.6); }
  .intro.play .intro-last { animation: intro-land 1400ms cubic-bezier(.19,.8,.22,1) var(--d) both; }
  @keyframes intro-land { from { opacity: 0; transform: translate(12vw, 14vh) scale(1.2); } to { opacity: 1; transform: none; } }
  .intro-foot { position: relative; z-index: 2; width: 100%; padding: 0 40px 48px; display: flex; align-items: flex-end;
    justify-content: space-between; gap: 24px; color: #f9fe00; opacity: 0; }
  .intro.play .intro-foot { animation: intro-up 900ms cubic-bezier(.19,.8,.22,1) var(--dfoot) both; }
  @keyframes intro-up { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
  .intro-name { font-family: 'Inter Tight', sans-serif; font-weight: 600; font-size: clamp(34px, 7.2vw, 132px);
    line-height: .92; letter-spacing: -.045em; text-transform: uppercase; margin: 0; }
  .intro-meta { text-align: right; font-size: clamp(11px, 1.05vw, 16px); line-height: 1.5; letter-spacing: .1em;
    text-transform: uppercase; color: #e9e9e2; margin: 0; }
  .intro-scroll { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); font-size: 11px;
    letter-spacing: .18em; text-transform: uppercase; color: #8b8b84; opacity: 0; z-index: 2; }
  .intro.play .intro-scroll { animation: intro-up 900ms ease var(--dscroll) both; }
  @media (orientation: landscape) and (pointer: coarse) { .intro-foot { padding: 0 24px 26px; } }
  @media (prefers-reduced-motion: reduce) {
    .intro.play .intro-card { animation: none; }
    .intro.play .intro-last, .intro.play .intro-foot, .intro.play .intro-scroll { animation-duration: 1ms; }
  }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // flight paths: each frame enters off one edge, crosses the middle and leaves on the other side
  const paths = [
    ['-120vw', '18vh', '120vw', '-14vh'], ['120vw', '-16vh', '-120vw', '12vh'],
    ['-115vw', '-20vh', '115vw', '16vh'], ['118vw', '20vh', '-118vw', '-18vh'],
    ['-125vw', '4vh', '125vw', '-4vh'], ['125vw', '-6vh', '-125vw', '6vh'],
  ];
  const cards = pick.slice(0, -1).map((src, i) => {
    const p = paths[i % paths.length];
    const r0 = (i % 2 ? -1 : 1) * (4 + (i % 3) * 3), r1 = -r0;
    return `<div class="intro-card" style="--x0:${p[0]}; --y0:${p[1]}; --x1:${p[2]}; --y1:${p[3]}; --r0:${r0}deg; --r1:${r1}deg;
      --fly:${FLY}ms; --d:${i * STEP}ms; background-image:url('${src}')"></div>`;
  }).join('');

  const intro = document.createElement('section');
  intro.className = 'intro';
  intro.setAttribute('aria-label', 'Victor Lyapakhin — режиссёрский тритмент для Cloud.ru');
  intro.style.setProperty('--dfoot', (total - 900) + 'ms');
  intro.style.setProperty('--dscroll', (total - 300) + 'ms');
  intro.innerHTML = `
    <div class="intro-stage" aria-hidden="true">
      ${cards}
      <div class="intro-last" style="--d:${(pick.length - 1) * STEP}ms; background-image:url('${pick[pick.length - 1]}')"></div>
    </div>
    <div class="intro-foot">
      <p class="intro-name">Victor<br>Lyapakhin</p>
      <p class="intro-meta">Director’s treatment<br>Cloud.ru — 2026</p>
    </div>
    <div class="intro-scroll" aria-hidden="true">Scroll</div>`;
  document.body.insertBefore(intro, document.body.firstChild);

  // start once the flying frames are decoded, so nothing pops in mid-flight
  const warm = pick.slice(0, 6).map(src => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = src; }));
  Promise.race([Promise.all(warm), new Promise(r => setTimeout(r, 2500))])
    .then(() => requestAnimationFrame(() => intro.classList.add('play')));
  if (calm) intro.classList.add('play');
})();
