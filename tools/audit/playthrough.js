// In-page playthrough for record.mjs: one mission per level, driven through the real controls
// with a visible pointer so a viewer can follow what is being pressed.
(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const S = () => window.__gradientLab.state;
  const cur = document.createElement('div');
  cur.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l15 11.5-6.5 1 3.6 6.8-2.6 1.4-3.7-6.9L4 20z" fill="#fff" stroke="#09223d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(cur.style, { position: 'fixed', left: 0, top: 0, zIndex: 999, pointerEvents: 'none', transition: 'transform 650ms cubic-bezier(.22,.8,.22,1)', transform: `translate(${innerWidth * .55}px, ${innerHeight * .6}px)`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' });
  document.body.appendChild(cur);
  const to = async (x, y, ms = 650) => { cur.style.transitionDuration = ms + 'ms'; cur.style.transform = `translate(${x - 4}px, ${y - 2}px)`; await w(ms + 60); };
  const toEl = (el, ms) => { const r = el.getBoundingClientRect(); return to(r.left + r.width / 2, r.top + r.height / 2, ms); };
  const press = async (el) => { await toEl(el); cur.animate([{ scale: 1 }, { scale: .8 }, { scale: 1 }], { duration: 220 }); await w(120); el.click(); await w(200); };
  const thumb = (input) => { const r = input.getBoundingClientRect(), p = (input.value - input.min) / (input.max - input.min); return [r.left + 14 + p * (r.width - 28), r.top + r.height / 2]; };
  const slide = async (id, values) => {
    const el = $('#' + id);
    await to(...thumb(el), 600);
    for (const v of values) {
      el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      await to(...thumb(el), 260);
      await w(120);
    }
  };
  const typeIn = async (id, text) => { const el = $('#' + id); await toEl(el, 500); el.focus(); el.value = ''; for (const ch of text) { el.value += ch; el.dispatchEvent(new Event('input', { bubbles: true })); await w(170); } };

  await w(600);
  // Beginner: tilt the line uphill, then send the hiker along it
  await press($('[data-go=beginner]') || $('.tab[data-level=beginner]'));
  await w(1500);
  if (S().beginner.mission !== 1) { await press($('[data-mission="1"]')); await w(1200); }
  await slide('b-m', [0.5, 1, 1.5, 2]);
  await w(2200);
  const walk = [...document.querySelectorAll('#panel button')].find((b) => /walk the line/i.test(b.textContent));
  if (walk) { await press(walk); await w(3600); }

  // Intermediate: raise B until the gradient is 2
  await press($('.tab[data-level=intermediate]'));
  await w(1600);
  const b = $('#g-points [data-pt=b]');
  if (b) {
    await toEl(b);
    b.focus();
    for (let k = 0; k < 4; k++) { b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await w(420); await toEl(b, 200); }
  }
  await w(2600);

  // Advanced: read the graph and answer
  await press($('.tab[data-level=advanced]'));
  await w(1600);
  const ch = S().advanced.challenge;
  if (ch && ch.type !== 'targets' && ch.type !== 'missing') {
    await typeIn('a-m', String(ch.m)); await w(250);
    await typeIn('a-c', String(ch.c)); await w(300);
    await press($('#a-check'));
  } else if (ch && ch.type === 'missing') {
    await typeIn('a-v', String(ch.answer)); await w(300); await press($('#a-check'));
  }
  await w(3200);
  await to(innerWidth * .82, innerHeight * .78, 800);
  await w(800);
  cur.remove();
  return 'ok';
})();
