// Runs inside the page (see shoot.mjs). Walks every screen state and calls snap(label), which
// waits for a screenshot and records geometry issues for that state.
(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const S = () => window.__gradientLab.state;
  const desktop = innerWidth >= 900;
  const SEL = 'button, input, select, label, h1, h2, h3, p, img, video, summary, .tab, .chip, .note, .card, .eq, .tab-count, .score, .stat, .badge, .mission-dot, output, .pill';
  const name = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''}${t ? ` "${t}"` : ''}`;
  };
  const shown = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })
    && !el.closest('#graph, .sr-only, .wt-block, [aria-hidden=true] .sr-only') && el.getBoundingClientRect().width > 1 && el.getBoundingClientRect().height > 1;
  const issues = () => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) out.push(`horizontal page scroll: ${de.scrollWidth} > ${innerWidth}`);
    if (desktop && de.scrollHeight > innerHeight + 1) out.push(`vertical page scroll: ${de.scrollHeight} > ${innerHeight}`);
    const panel = $('#panel');
    if (desktop && panel && shown(panel) && panel.scrollHeight > panel.clientHeight + 2) out.push(`panel scrolls by ${panel.scrollHeight - panel.clientHeight}px`);
    const top = document.querySelector('.opener') || document; // an overlay hides what is beneath it
    const els = [...top.querySelectorAll(SEL)].filter(shown);
    // text blocks are measured by their glyphs, not their full-width box
    const box = (e) => {
      if (/^(h1|h2|h3|p|label)$/i.test(e.tagName) && e.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); if (r.width) return r; }
      return e.getBoundingClientRect();
    };
    const R = new Map(els.map((e) => [e, box(e)]));
    for (const e of els) {
      const r = R.get(e);
      if (r.right > innerWidth + 1 || r.left < -1) out.push(`off-screen x: ${name(e)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      if (desktop && r.bottom > innerHeight + 1 && !e.closest('#panel')) out.push(`below fold: ${name(e)} bottom ${Math.round(r.bottom)}`);
      const cs = getComputedStyle(e);
      if (/^(p|h1|h2|h3|label|button|span|summary|output)$/i.test(e.tagName) && e.textContent.trim()) {
        if (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1) out.push(`text clipped x: ${name(e)} (${e.scrollWidth}>${e.clientWidth})`);
        if (cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 2 && e.id !== 'panel') out.push(`text clipped y: ${name(e)} (${e.scrollHeight}>${e.clientHeight})`);
      }
    }
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.closest('label') === b.closest('label') && a.closest('label')) continue;
      const ra = R.get(a), rb = R.get(b);
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 2 && oy > 2) out.push(`overlap ${Math.round(ox)}x${Math.round(oy)}: ${name(a)} / ${name(b)}`);
      else {
        const inter = /^(button|input|select|summary)$/i;
        if (inter.test(a.tagName) && inter.test(b.tagName) && a.parentElement?.closest('.tabs') == null) {
          const gap = Math.max(-ox, -oy);
          if ((ox > 0 || oy > 0) && gap >= 0 && gap < 4) out.push(`touching (${Math.round(gap)}px): ${name(a)} / ${name(b)}`);
        }
      }
    }
    return [...new Set(out)];
  };
  const snap = (label, settle = 1100) => new Promise(async (res) => {
    await w(settle);
    window.__snapDone = res;
    window.__snapBinding(JSON.stringify({ label, issues: issues() }));
  });
  const tab = (l) => $(`.tab[data-level=${l}]`).click();
  const slide = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const type = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

  // first visit: opener, then the walkthrough
  if ($('.opener')) { await snap('00_opener', 900); $('.opener-skip').click(); }
  await w(900);
  if ($('.wt')) {
    if (window.__auditWT) { for (let k = 0; k < 7; k++) { await snap(`01_walk_${k}`, k ? 6000 : 3500); } }
    $('#wt-skip')?.click();
  }
  await w(600);
  if (S().screen !== 'welcome') $('#brand').click();
  await snap('02_welcome', 1800);

  tab('beginner'); const B = S().beginner;
  $('[data-mission="2"]').click(); $('[data-mission="1"]').click();
  await snap('10_B_entry');
  slide('b-m', 0.5); await snap('11_B_moved');
  ($('[data-action=hint]') || $('#fitila')).click(); await snap('12_B_hint');
  slide('b-m', 1); slide('b-m', 1.5); await snap('13_B_success');
  $('#b-opts')?.setAttribute('open', ''); $('#b-why')?.setAttribute('open', ''); await snap('14_B_options_why');
  $('#fitila').click(); await snap('15_B_fitila_tap', 1400);

  tab('intermediate');
  $('[data-mission="2"]').click(); $('[data-mission="1"]').click();
  await snap('20_I_entry');
  ($('[data-action=hint]') || $('#fitila')).click(); await snap('21_I_hint');
  if (!$('#i-eq').checked) $('#i-eq').click();
  $('#i-predict').click(); type('i-pred', '7'); $('#i-check').click(); await snap('22_I_predict_feedback');
  $('[data-mission="4"]').click(); await snap('23_I_mission4');

  tab('advanced');
  for (const t of ['read', 'two', 'missing', 'targets']) {
    $(`[data-type=${t}]`).click(); await snap(`3_A_${t}_fresh`);
    if (t === 'missing') type('a-v', '999'); else if (t !== 'targets') { type('a-m', '99'); type('a-c', '99'); }
    $('#a-check').click(); await snap(`3_A_${t}_wrong1`);
    $('#a-check').click(); await snap(`3_A_${t}_similar`);
    $('[data-action=ex-next]')?.click(); $('[data-action=ex-next]')?.click(); await snap(`3_A_${t}_similar_step3`, 700);
    $('#a-check').click(); await snap(`3_A_${t}_revealed`);
    $('[data-action=next-challenge]')?.click();
    const c2 = S().advanced.challenge;
    if (t === 'targets') { /* answered by dragging; skip */ continue; }
    if (t === 'missing') type('a-v', String(c2.answer)); else { type('a-m', String(c2.m)); type('a-c', String(c2.c)); }
    $('#a-check').click(); await snap(`3_A_${t}_correct`);
  }
  return 'ok';
})();
