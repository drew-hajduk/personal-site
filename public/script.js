(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let ticking = false;

  // Pages without the big hero show the full name in the top bar from the start.
  if (!hero) root.style.setProperty('--h', 1);

  function update() {
    ticking = false;
    const y = window.scrollY;
    root.style.setProperty('--nb', y > 8 ? 1 : 0);
    if (hero && !reduce) {
      const end = hero.offsetTop + hero.offsetHeight * 0.75;
      root.style.setProperty('--h', clamp(y / end, 0, 1).toFixed(4));
    }
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
  // Contact form: loads the Turnstile spam check only when the form is on the page, then sends via fetch.
  const form = document.getElementById('contact-form');
  if (form) {
    const status = document.getElementById('form-status');
    const send = form.querySelector('button[type="submit"]');
    form.elements.t.value = Date.now();
    const ts = document.createElement('script');
    ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    ts.async = true;
    document.head.appendChild(ts);
    const say = (text, error) => { status.textContent = text; status.classList.toggle('error', !!error); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      send.disabled = true; say('Sending…');
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) { form.reset(); form.elements.t.value = Date.now(); say('Thanks, your message is sent. I\'ll reply as soon as I can.'); }
        else { say(data.error || 'Something went wrong. Please try again.', true); }
      } catch (err) { say('Could not send. Please check your connection or message me on LinkedIn.', true); }
      if (window.turnstile) window.turnstile.reset();
      send.disabled = false;
    });
  }
})();
