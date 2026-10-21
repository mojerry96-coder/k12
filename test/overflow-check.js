// In-page check: does the level panel need scrolling in each reachable state?
// Paste into the console on dist/gradient-lab.html (desktop width). Resolves to a report.
(async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const S = () => window.__gradientLab.state;
  const out = [];
  const measure = async (label) => {
    await w(1100); // staged entry settles
    const p = $('#panel');
    const over = p.scrollHeight - p.clientHeight;
    out.push(`${over > 2 ? 'OVER ' + String(over).padStart(4) + 'px' : 'fits     '}  ${label}`);
  };
  const tab = async (l) => { $(`.tab[data-level=${l}]`).click(); };
  const slide = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const type = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

  await tab('beginner'); const B = S().beginner;
  B.hint = false; B.success = false; B.optionsOpen = false; B.whyOpen = false; S().session.moved = {};
  $('[data-mission="2"]').click(); $('[data-mission="1"]').click();
  await measure('B entry');
  slide('b-m', 0.5); await measure('B after first move (extras revealed)');
  ($('[data-action=hint]') || $('#fitila')).click(); await measure('B hint open');
  slide('b-m', 1); B.success = false; slide('b-m', 1.5); await measure('B hint + success');
  $('#b-opts')?.setAttribute('open', ''); $('#b-why')?.setAttribute('open', ''); await measure('B options + why open');

  await tab('intermediate'); const I = S().intermediate;
  I.hint = false; I.success = false;
  $('[data-mission="2"]').click(); $('[data-mission="1"]').click();
  await measure('I entry (working shown)');
  ($('[data-action=hint]') || $('#fitila')).click(); await measure('I hint open');
  if (!$('#i-eq').checked) $('#i-eq').click(); await measure('I equation on');
  $('#i-predict').click(); type('i-pred', '7'); $('#i-check').click(); await measure('I predict + feedback + working + equation');
  $('#i-predict').click(); $('#i-eq').click();
  $('[data-mission="4"]').click(); await measure('I mission 4');

  await tab('advanced');
  for (const t of ['read', 'two', 'missing', 'targets']) {
    $(`[data-type=${t}]`).click(); await measure(`A ${t} fresh`);
    const ch = S().advanced.challenge;
    if (t === 'targets') { $('#a-check').click(); await measure(`A ${t} not yet`); $('#a-check').click(); await measure(`A ${t} similar example`); $('#a-check').click(); await measure(`A ${t} answer revealed`); continue; }
    const bad = () => { if (t === 'missing') type('a-v', '999'); else { type('a-m', '99'); type('a-c', '99'); } };
    bad(); $('#a-check').click(); await measure(`A ${t} not yet`);
    $('#a-check').click(); await measure(`A ${t} similar example`);
    $('#a-check').click(); await measure(`A ${t} answer revealed`);
    $('[data-action=next-challenge]').click();
    const c2 = S().advanced.challenge;
    if (t === 'missing') type('a-v', String(c2.answer)); else { type('a-m', String(c2.m)); type('a-c', String(c2.c)); }
    $('#a-check').click(); await measure(`A ${t} correct`);
  }
  return out.join('\n');
})();
