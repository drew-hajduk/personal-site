(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  const ticks = [...document.querySelectorAll('.tick')];
  const score = document.getElementById('rail-score');
  const label = document.getElementById('rail-label');
  document.querySelectorAll('.article-body > h2').forEach(h => { if (!h.dataset.label) h.dataset.label = h.textContent.trim().split(' ').slice(0, 3).join(' '); });
  const sections = [...document.querySelectorAll('[data-label]')];
  const startLabel = label ? label.textContent : '';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let lastLabel = '', lastScore = '', ticking = false;

  // Pages without the big hero show the full name in the top bar from the start.
  if (!hero) root.style.setProperty('--h', 1);

  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(y / max, 0, 1);
    root.style.setProperty('--p', p.toFixed(4));
    root.style.setProperty('--nb', y > 8 ? 1 : 0);
    if (hero && !reduce) {
      const end = hero.offsetTop + hero.offsetHeight * 0.75;
      root.style.setProperty('--h', clamp(y / end, 0, 1).toFixed(4));
    }
    if (!score) return;
    const reached = Math.round(p * 10 * 1000) / 1000;
    ticks.forEach((t, i) => t.classList.toggle('on', i <= reached));
    const s = (5 + Math.round(p * 10) / 2).toFixed(1);
    if (s !== lastScore) { score.textContent = s; lastScore = s; }
    let current = startLabel;
    for (const sec of sections) if (sec.getBoundingClientRect().top < innerHeight * 0.45) current = sec.dataset.label;
    if (current !== lastLabel) { label.textContent = current; lastLabel = current; }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  const btn = document.getElementById('copy');
  const addr = document.getElementById('email');
  if (btn && addr) {
    btn.addEventListener('click', () => {
      const text = addr.textContent.trim();
      const done = () => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy email', 1600); };
      const fallback = () => {
        const r = document.createRange(); r.selectNodeContents(addr);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        btn.textContent = 'Selected, press copy';
      };
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
  }
})();
