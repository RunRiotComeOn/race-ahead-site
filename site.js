// Race Ahead project page: every graphic is drawn here from the run's data (data.js) and the recorded laps
// (laps.js: zengarden stages, laps-unseen.js: snowmountain). Videos are game footage only.
(() => {
  const D = window.EVOLVE_DEMO, $ = id => document.getElementById(id);
  { const bg = document.querySelector('.bg video'), go = () => { if (bg && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) bg.play().catch(() => {}); };
    go(); document.addEventListener('visibilitychange', go); }   // muted autoplay; browsers pause it in hidden tabs, resume when shown
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);

  /* ---------- plain names ---------- */
  const START = { 'crude 1': 'Start A', 'crude 2': 'Start B', 'crude 3': 'Start C' };
  const startName = k => START[k] || k, repeatName = sd => 'repeat ' + sd.replace(/\D/g, '');
  const LAPNAMES = { r00: ['First version', 'round 0'], r07: ['Round 7', 'higher target speeds'], r11: ['Round 11', 'slows only as much as a curve needs'],
    r14: ['Round 14', 'flat out on straights'], r40: ['Final version', 'after 40 rounds'], oracle: ["Game's own AI", 'knows the whole track'] };
  for (const L of [window.LAPS, window.UNSEEN]) if (L) for (const [k, [a, b]] of Object.entries(LAPNAMES)) if (L[k]) { L[k].label = a; L[k].note = b; }

  /* ---------- key facts, starting bars ---------- */
  const res = D.results, runs = res.runs;
  const U = window.UNSEEN, gap = U ? (U.r00.lap - U.r40.lap) / (U.r00.lap - U.oracle.lap) : null;
  $('facts').innerHTML = [
    ['2 models', 'one drives the kart, the other rewrites its driving program between laps', ''],
    U ? [`${U.r00.lap.toFixed(0)} s → ${U.r40.lap.toFixed(0)} s`, 'one lap on a snowy track it never practiced on: the first version, and the version after 40 rounds', 'y'] : null,
    U ? [`${Math.round(gap * 100)} %`, `of the distance to the game's own AI closed there (the game's AI, which knows the track: ${U.oracle.lap.toFixed(0)} s)`, 'c'] : null]
    .filter(Boolean).map(([v, k, c]) => `<div><b class="${c}">${v}</b><span>${k}</span></div>`).join('');
  {
    const starts = [...new Map(runs.map(r => [r.start, r.start_test_s])).entries()];
    const rows = [...starts.map(([k, v]) => [startName(k), v, 'var(--ghost)']), ["Game's own AI", res.oracle_test_s, 'var(--oracle)']];
    const mx = Math.max(...rows.map(r => r[1]));
    $('startBars').innerHTML = '<p class="px small">Total time · 4 tracks never used for practice</p>' + rows.map(([k, v, c]) =>
      `<div class="hb"><span class="px">${k}</span><div><span class="tr"><i style="width:${(v / mx * 100).toFixed(1)}%;background:${c}"></i></span><b>${v.toFixed(0)} s</b></div></div>`).join('');
  }

  /* ---------- round-0 speed meter on the hook footage ---------- */
  {
    const U = window.UNSEEN, l = U && U.r00, v = $('hookLap')?.querySelector('video'), m = $('hookMeter');
    if (l && v && m) {
      m.innerHTML = '<div class="cells">' + Array.from({ length: 30 }, () => '<i></i>').join('') + '<u style="left:' + (16 / 30 * 100) + '%"></u></div><span class="mono">0.0 m/s</span>';
      const cells = [...m.querySelectorAll('i')], out = m.querySelector('span'), dt = l.t[1] - l.t[0];
      const draw = () => { const k = Math.min(l.v.length - 1, Math.max(0, Math.round(v.currentTime / dt))), s = l.v[k];
        cells.forEach((c, i) => c.className = i < Math.round(s) ? (i >= 15 ? 'hi' : 'on') : ''); out.textContent = s.toFixed(1) + ' m/s'; };
      const loop = () => { draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    }
  }

  /* ---------- system diagram: details on hover / focus / tap ---------- */
  const TIPS = {
    rt0: ['A section is coming', 'The decision model sees the shape of the track ahead, the kart’s speed and any suggestions from the driving rules.'],
    rt1: ['Driving rules', 'Rules offer suggestions, such as braking early for a tight turn.'],
    rt2: ['Driving questions', 'The questions give the decision model choices about speed, where to steer and how to brake.'],
    rt3: ['Decision model', 'The decision model chooses how to approach the upcoming stretch of track.'],
    rt4: ['Control code', 'The driving program turns those choices into steering, throttle and braking.'],
    rt5: ['Lap record', 'The system records how the kart drove, how long it took and where it went off the track.'],
    c1: ['1 · Drive the best version', 'The best version so far runs on the practice tracks.'],
    c2: ['2 · An LLM proposes changes', 'The LLM reads lap records and past decisions, tries ideas if needed, and explains the changes it suggests.'],
    c3: ['3 · Check it runs', 'The system checks that the new version can run on the practice tracks. Crashes are recorded for the next round.'],
    c4: ['4 · Test the changes', 'The system drives laps with different combinations of changes to see which ones help.'],
    c5: ['5 · A reviewer decides', 'The reviewer looks at how the changes performed and explains which ones to keep or reject.'],
    c6: ['6 · Drive again', 'The system tests the selected changes together. A faster version becomes the new best.'],
    trial: ['Try first', 'The LLM can compare an idea with the current version on a stretch of track or a full lap.'],
    branch: ['Big redesigns', 'The system tests larger redesigns separately. A redesign can join the main program once it beats the best version.'],
    editlog: ['Memory of past changes', 'The system consults past changes, their results and the reviewer’s decisions before suggesting new ideas.'],
  };
  {
    // the system as a circuit: one lap along the top straight, one round of evolution once around the track
    const C = { fast: css('--fast'), slow: css('--slow'), best: css('--best'), faster: css('--faster'), slower: css('--slower'), chalk: css('--chalk'), c2: css('--chalk-2'), c3: css('--chalk-3'), rule: css('--rule'), bg: '#102c36' };
    const F = { px: css('--f-pixel'), disp: css('--f-display'), body: css('--f-body') };
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gx = [110, 306, 502, 698, 894, 1090];
    const GATES = [['rt0', 'Track ahead', 'A section', 'Its shape, the kart\'s speed', C.c2], ['rt1', 'Suggest', 'Rules', 'Suggest an answer', C.slow],
      ['rt2', 'Ask', 'Questions', 'How fast? Which line?', C.slow], ['rt3', 'Choose', 'Decision model', 'Picks one answer each', C.fast],
      ['rt4', 'At the wheel', 'Control code', 'Answers → steering', C.slow], ['rt5', 'Afterwards', 'Lap record', 'Times, speeds, answers', C.c2]];
    const ST = [['c1', 360, 420, 'Start', 'Drive', C.fast, -1], ['c2', 600, 420, 'LLM', 'Propose', C.slow, -1],
      ['c3', 840, 420, 'Checks', 'Run it', C.c2, -1], ['c4', 840, 720, 'On track', 'Measure', C.fast, 1],
      ['c5', 600, 720, 'Reviewer model', 'Decide', C.slow, 1], ['c6', 360, 720, 'Finish line', 'Drive again', C.faster, 1]];
    const T = (x, y, t, f, size, fill, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" font-family='${f}' font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`;
    const kart = col => `<g><rect x="-15" y="-8" width="30" height="16" rx="3" fill="${col}"/><rect x="-4" y="-5" width="10" height="10" fill="#111d25"/><rect x="-13" y="-12" width="8" height="4" fill="#0b0f14"/><rect x="5" y="-12" width="8" height="4" fill="#0b0f14"/><rect x="-13" y="8" width="8" height="4" fill="#0b0f14"/><rect x="5" y="8" width="8" height="4" fill="#0b0f14"/><rect x="15" y="-5" width="3" height="10" fill="${C.chalk}"/></g>`;
    let s = `<svg viewBox="0 0 1200 840" class="sysvg" role="img" aria-label="Race Ahead system: run time and one round of evolution">
      <defs><marker id="au" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.slow}"/></marker>
      <marker id="ag" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.c3}"/></marker>
      <marker id="ab" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.best}"/></marker>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
    // ---- top straight: one section of a lap
    s += T(20, 30, 'ON TRACK', F.px, 14, C.fast, 'start', 'letter-spacing="2"') + T(128, 30, '· EVERY PART OF A LAP', F.px, 14, C.c2, 'start', 'letter-spacing="2"') + T(1180, 30, 'SUPERTUXKART', F.px, 11, C.c3, 'end', 'letter-spacing="2"');
    s += `<rect x="0" y="170" width="1200" height="44" fill="#1b414d"/><path d="M0 170H1200M0 214H1200" stroke="#416672" stroke-width="2"/><path d="M0 192H1200" stroke="${C.c3}" stroke-width="2" stroke-dasharray="16 14" opacity=".6"/>`;
    GATES.forEach(([id, k, t, sub, col, tag], i) => {
      const x = gx[i];
      s += `<g class="hot" data-tip="${id}" tabindex="0" role="button" aria-label="${esc(t)}">
        <rect x="${x - 92}" y="46" width="184" height="182" fill="transparent"/>
        <path d="M${x} 162V222" stroke="${col}" stroke-width="2" stroke-dasharray="4 4"/><rect x="${x - 3}" y="158" width="6" height="12" fill="${col}"/><rect x="${x - 3}" y="214" width="6" height="12" fill="${col}"/>
        ${T(x, 70, k.toUpperCase(), F.px, 11, C.c3, 'middle', 'letter-spacing="1.5"')}${T(x, 100, t, F.disp, 27, col === C.c2 ? C.chalk : col, 'middle', 'font-weight="600"')}
        ${T(x, 122, sub, F.body, 14, C.c2, 'middle')}
        ${tag ? `<rect x="${x - 44}" y="132" width="88" height="17" fill="${C.slow}"/>${T(x, 145, tag.toUpperCase(), F.px, 10, '#111d25', 'middle')}` : ''}</g>`;
      if (i < 5) s += T((x + gx[i + 1]) / 2, 197, '›', F.disp, 22, C.c3, 'middle');
    });
    s += `<g class="kart">${kart(C.fast)}${still ? '' : '<animateMotion dur="7s" repeatCount="indefinite" path="M-60 192H1260"/>'}</g>`;
    // links between the bands: lap logs feed the loop; the loop rewrites the three harness files
    s += `<path d="M1090 228V296" fill="none" stroke="${C.c3}" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#ag)"/>${T(1076, 292, 'LAP RECORDS FEED THE LOOP', F.px, 10, C.c3, 'end', 'letter-spacing="1"')}`;
    s += `<path d="M600 286V252M306 252H894" fill="none" stroke="${C.slow}" stroke-width="2" stroke-dasharray="6 6"/>` +
      [306, 502, 894].map(x => `<path d="M${x} 252V232" stroke="${C.slow}" stroke-width="2" marker-end="url(#au)"/>`).join('') +
      T(612, 278, 'THE DRIVING PROGRAM IMPROVES BETWEEN LAPS', F.px, 10, C.slow, 'start', 'letter-spacing="1"');
    // ---- the circuit: one round of evolution
    s += T(20, 300, 'BETWEEN LAPS', F.px, 14, C.slow, 'start', 'letter-spacing="2"') + T(178, 300, '· ONE ROUND', F.px, 14, C.c2, 'start', 'letter-spacing="2"');
    const track = 'M300 420H900A150 150 0 0 1 900 720H300A150 150 0 0 1 300 420Z';
    s += `<path d="M300 382A188 188 0 0 0 300 758" fill="none" stroke="${C.chalk}" stroke-width="7" opacity=".85"/><path d="M300 382A188 188 0 0 0 300 758" fill="none" stroke="${C.slower}" stroke-width="7" stroke-dasharray="16 16"/>
      <path d="M900 382A188 188 0 0 1 900 758" fill="none" stroke="${C.chalk}" stroke-width="7" opacity=".85"/><path d="M900 382A188 188 0 0 1 900 758" fill="none" stroke="${C.slower}" stroke-width="7" stroke-dasharray="16 16"/>
      <path d="${track}" fill="none" stroke="#416672" stroke-width="50"/><path d="${track}" fill="none" stroke="#1b414d" stroke-width="44"/><path d="${track}" fill="none" stroke="${C.c3}" stroke-width="2" stroke-dasharray="16 14" opacity=".6"/>`;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) s += `<rect x="${128 + c * 7.4}" y="${563 + r * 7.4}" width="7.4" height="7.4" fill="${(r + c) % 2 ? C.chalk : '#0b0f14'}"/>`;
    s += T(186, 560, 'NEW BEST', F.px, 12, C.faster, 'start', 'letter-spacing="1.5"') + T(186, 578, 'VERSION', F.px, 12, C.faster, 'start', 'letter-spacing="1.5"');
    // infield: trial runs and the edit log feed the proposer; big redesigns go down the pit lane
    s += `<path d="M470 512C520 500 560 480 586 448" fill="none" stroke="${C.c3}" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#ag)"/>
      <path d="M730 512C680 500 640 480 614 448" fill="none" stroke="${C.c3}" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#ag)"/>
      <path d="M600 444V584M600 652V694" fill="none" stroke="${C.best}" stroke-width="3" marker-end="url(#ab)"/>`;
    const IN = [['trial', 400, 530, 'Before proposing', 'Try first', 'Test an idea on one section or lap', C.chalk], ['editlog', 800, 530, 'Memory', 'Past edits', 'Every decision and its reason', C.chalk],
      ['branch', 600, 604, 'Pit lane', 'Big redesigns', 'Tested separately', C.best]];
    for (const [id, x, y, k, t, sub, col] of IN) s += `<g class="hot" data-tip="${id}" tabindex="0" role="button" aria-label="${esc(t)}">
      <rect x="${x - 120}" y="${y - 26}" width="240" height="${id === 'branch' ? 70 : 72}" rx="6" fill="${id === 'branch' ? 'rgba(255,136,130,.10)' : 'rgba(233,238,243,.03)'}" stroke="${id === 'branch' ? C.best : '#2e3a48'}" stroke-dasharray="${id === 'branch' ? '' : '5 5'}"/>
      ${T(x, y - 8, k.toUpperCase(), F.px, 10, C.c3, 'middle', 'letter-spacing="1.5"')}${T(x, y + 16, t, F.disp, 22, col, 'middle', 'font-weight="600"')}${T(x, y + 34, sub, F.body, 12.5, C.c2, 'middle')}</g>`;
    s += `<g class="kart">${kart(C.slow)}${still ? '' : `<animateMotion dur="12s" repeatCount="indefinite" rotate="auto" path="${track}"/>`}</g>`;
    for (const [id, x, y, k, t, col, side] of ST) {
      const ly = side < 0 ? y - 86 : y + 50;
      s += `<g class="hot st" data-tip="${id}" tabindex="0" role="button" aria-label="${esc(t)}">
        <rect x="${x - 105}" y="${side < 0 ? y - 106 : y - 26}" width="210" height="132" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="24" fill="${col}" opacity=".25" filter="url(#glow)"/>
        <circle cx="${x}" cy="${y}" r="17" fill="#111d25" stroke="${col}" stroke-width="3"/>${T(x, y + 6, ST.findIndex(q => q[0] === id) + 1, F.px, 16, col, 'middle')}
        ${T(x, ly, k.toUpperCase(), F.px, 10, C.c3, 'middle', 'letter-spacing="1.5"')}${T(x, ly + 26, t, F.disp, 26, col === C.c2 ? C.chalk : col, 'middle', 'font-weight="600"')}</g>`;
    }
    s += '</svg>';
    const art = $('sysArt'), tip = $('sysTip'), sys = $('sys');
    art.innerHTML = s;
    const svg = art.querySelector('svg'), hots = [...svg.querySelectorAll('.hot')];
    const show = g => {
      hots.forEach(h => h.classList.toggle('on', h === g)); svg.classList.toggle('focus', !!g);
      if (!g) { tip.classList.remove('vis'); return; }
      const [h, b] = TIPS[g.dataset.tip], r = g.getBoundingClientRect(), o = sys.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(h)}</b><span>${esc(b)}</span>`; tip.classList.add('vis');
      const w = tip.offsetWidth, hgt = tip.offsetHeight, cx = r.left + r.width / 2 - o.left;
      const below = r.top - o.top < o.height * .45;
      tip.style.left = Math.max(8, Math.min(o.width - w - 8, cx - w / 2)) + 'px';
      tip.style.top = (below ? r.bottom - o.top + 6 : r.top - o.top - hgt - 6) + 'px';
    };
    hots.forEach(g => { g.addEventListener('mouseenter', () => show(g)); g.addEventListener('focus', () => show(g)); g.addEventListener('click', e => { e.stopPropagation(); show(g); }); });
    svg.addEventListener('mouseleave', () => show(null)); document.addEventListener('click', () => show(null));
    // phone: the same stops as a list, details always visible
    const item = (id, col, k) => `<li style="--c:${col}"><small>${esc(k)}</small><b>${esc(TIPS[id][0])}</b><span>${esc(TIPS[id][1])}</span></li>`;
    $('sysList').innerHTML = `<li class="h px">On track · every part of a lap</li>` + GATES.map(g => item(g[0], g[4] === C.c2 ? C.chalk : g[4], g[1])).join('') +
      `<li class="h px">Between laps · one round</li>` + ST.map(q => item(q[0], q[6] === C.c2 ? C.chalk : q[6], q[3])).join('') + IN.map(q => item(q[0], q[6], q[3])).join('');
  }

  /* ---------- synced game footage ---------- */
  function race(root, L, ids, col, opt = {}) {
    if (!root || !L) return;
    const T = Math.max(...ids.map(i => L[i].lap));
    root.innerHTML = `<div class="grid g${ids.length}"></div><div class="board"></div>
      <div class="bar"><button class="btn primary play">▶ Play all</button><button class="btn rst" aria-label="restart">↺</button>
      <select class="rate" aria-label="playback speed">${[1, 2, 4].map(r => `<option value="${r}"${r === (opt.rate || 1) ? ' selected' : ''}>${r}×</option>`).join('')}</select>
      <input class="scrub" type="range" min="0" max="${T.toFixed(2)}" step="0.01" value="0" aria-label="race time"><span class="clock mono">0.0 s</span></div>` +
      (opt.chart ? `<div class="chart"><p class="px small">Speed along the lap <span>m/s along the lap · dashed: 16 m/s, where the first version tops out</span></p><svg class="speed" viewBox="0 0 1000 260" role="img" aria-label="Speed against distance"></svg></div>` : '');
    const grid = root.querySelector('.grid'), cells = {};
    for (const id of ids) {
      const l = L[id], e = document.createElement('div'); e.className = 'lap';
      e.innerHTML = `<video muted playsinline preload="auto" src="${opt.src(id)}"></video>
        <div class="hd"><span class="px" style="color:${col[id]}">${l.label}</span><small>${l.note}</small></div>
        <div class="spd"><span>0.0</span> <small>m/s</small></div><div class="fin">Finish ${l.lap.toFixed(1)} s</div>`;
      grid.appendChild(e); cells[id] = { e, v: e.querySelector('video'), s: e.querySelector('.spd span') };
    }
    root.querySelector('.board').innerHTML = ids.map(id => `<span><i style="background:${col[id]}"></i>${L[id].label} <b>${L[id].lap.toFixed(1)} s</b></span>`).join('');
    const at = (l, t) => Math.min(l.t.length - 1, Math.max(0, Math.round(t / (l.t[1] - l.t[0]))));
    let dots = {}, x, y;
    if (opt.chart) {
      const svg = root.querySelector('.speed'), W = 1000, H = 260, P = { l: 34, r: 8, t: 10, b: 22 };
      const Dm = Math.max(...ids.map(i => L[i].d.at(-1))), VM = 34;
      x = d => P.l + (W - P.l - P.r) * d / Dm; y = v => H - P.b - (H - P.t - P.b) * v / VM;
      let s = '';
      for (const v of [0, 10, 20, 30]) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="#38606a"/><text x="4" y="${y(v) + 4}" fill="#6f7c8c" font-size="11" font-family="IBM Plex Mono">${v}</text>`;
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(16)}" y2="${y(16)}" stroke="#ff5f5f" stroke-dasharray="6 5" opacity=".7"/>`;
      for (const id of ids) { const l = L[id]; s += `<polyline points="${l.d.map((d, k) => `${x(d).toFixed(1)},${y(l.v[k]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col[id]}" stroke-width="${id === 'r40' ? 2.2 : 1.5}"><title>${l.label} · ${l.lap.toFixed(1)} s</title></polyline>`; }
      for (const id of ids) s += `<circle data-id="${id}" r="5" fill="${col[id]}" stroke="#111d25" stroke-width="2"/>`;
      s += `<text x="${W - P.r}" y="${H - 6}" fill="#6f7c8c" font-size="11" font-family="IBM Plex Mono" text-anchor="end">distance along the lap →</text>`;
      svg.innerHTML = s; ids.forEach(id => dots[id] = svg.querySelector(`circle[data-id="${id}"]`));
    }
    const play = root.querySelector('.play'), scrub = root.querySelector('.scrub'), clock = root.querySelector('.clock'), rate = root.querySelector('.rate');
    let t = 0, playing = false, last = 0;
    function draw(seek) {
      const r = +rate.value;
      for (const id of ids) {
        const l = L[id], c = cells[id], tt = Math.min(t, l.lap), k = at(l, tt), done = t >= l.lap - 0.02;
        c.s.textContent = l.v[k].toFixed(1); c.e.classList.toggle('done', done);
        if (dots[id]) { dots[id].setAttribute('cx', x(l.d[k])); dots[id].setAttribute('cy', y(l.v[k])); }
        const vt = Math.min(tt, Math.max(0, (c.v.duration || l.lap) - 0.04));
        c.v.playbackRate = r;
        if (seek || !playing || done) { if (Math.abs(c.v.currentTime - vt) > 0.03) c.v.currentTime = vt; c.v.pause(); }
        else { if (c.v.paused) c.v.play().catch(() => {}); if (Math.abs(c.v.currentTime - vt) > 0.25 * r) c.v.currentTime = vt; }
      }
      scrub.value = t; clock.textContent = t.toFixed(1) + ' s';
    }
    function tick(now) {
      if (!playing) return;
      t = Math.min(T, t + (now - last) / 1000 * +rate.value); last = now; draw(false);
      if (t >= T) { set(false); return; }
      requestAnimationFrame(tick);
    }
    function set(p) {
      playing = p; play.textContent = p ? '❚❚ Pause' : '▶ Play all';
      if (p) { if (t >= T) t = 0; draw(true); last = performance.now(); requestAnimationFrame(tick); } else draw(true);
    }
    play.onclick = () => set(!playing);
    root.querySelector('.rst').onclick = () => { t = 0; draw(true); if (!playing) set(true); };
    scrub.oninput = () => { t = +scrub.value; draw(true); };
    rate.onchange = () => { last = performance.now(); draw(true); };
    draw(true);
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); if (!playing && t === 0) set(true); } }, { threshold: .15 });
    io.observe(grid);
  }
  race($('raceEvo'), window.LAPS, ['r00', 'r07', 'r11', 'r14', 'r40', 'oracle'],
    { r00: '#8e99a8', r07: '#ffc2b4', r11: '#5ecaa3', r14: '#ff8882', r40: '#6fc8cf', oracle: '#f4f1e8' }, { chart: true, src: id => `media/lap-${id}.mp4` });
  race($('raceUnseen'), window.UNSEEN, ['r00', 'r40', 'oracle'], { r00: '#8e99a8', r40: '#6fc8cf', oracle: '#f4f1e8' },
    { rate: 2, src: id => `media/sm-${id}.mp4` });

  /* ---------- inside a round ---------- */
  const R = D.rounds;
  const OUT = { adopted: ['edits kept', '--faster'], branch_merged: ['redesign joined', '--best'], nothing_admitted: ['nothing kept', '--chalk-3'], confirm_failed: ['kept edits failed the re-check', '--slower'],
    no_valid_proposal: ['no usable proposal', '--chalk-3'], branch_opened: ['bigger redesign started', '--slow'], branch_not_improved: ['redesign repaired, not faster yet', '--slow'], branch_improved: ['redesign improved', '--slow'],
    branch_merge_rejected: ['faster, but the reviewer refused to let it join', '--chalk-2'], branch_merge_blocked: ['faster, held back to fix a flaw', '--chalk-2'] };
  const outLabel = o => (OUT[o.split('+')[0]] || [o.replace(/_/g, ' ')])[0] + (o.includes('+branch_dropped') ? ' · redesign dropped' : '');
  const kind = r => r.crash ? '--slower' : r.outcome === 'adopted' ? '--faster' : r.outcome === 'branch_merged' ? '--best' : r.branch ? '--slow' : '--chalk-3';
  let cur = R.findIndex(r => r.round === 15), focus = 's2_steer_body';
  $('curveLegend').innerHTML = [['--faster', 'edits kept'], ['--best', 'bigger redesign joined'], ['--slow', 'working on a bigger redesign'], ['--slower', 'new version crashed'], ['--chalk-3', 'nothing kept']]
    .map(([c, t]) => `<span><i style="background:var(${c})"></i>${t}</span>`).join('');
  function curve() {
    const svg = $('curve'), W = Math.max(320, svg.getBoundingClientRect().width), H = W < 600 ? 200 : 230; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px'; svg.innerHTML = '';
    const n = R.length, L = 44, Rm = 12, Tm = 14, B = 24, x = i => L + (W - L - Rm) * (i + .5) / n;
    const after = R.map(r => r.new_s ?? r.champion_s), all = [R[0].champion_s, ...after], lo = Math.min(...all) - 30, hi = Math.max(...all) + 30, y = v => Tm + (H - Tm - B) * (hi - v) / (hi - lo);
    for (const v of [500, 600, 700, 800, 900, 1000]) if (v > lo && v < hi) { el('line', { x1: L, x2: W - Rm, y1: y(v), y2: y(v), stroke: css('--rule'), 'stroke-dasharray': '2 5' }, svg); el('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', fill: css('--chalk-3'), 'font-size': 11, 'font-family': css('--f-data') }, svg).textContent = v; }
    for (const k of [1, 10, 20, 30, 40]) el('text', { x: x(k - 1), y: H - 6, 'text-anchor': 'middle', fill: css('--chalk-3'), 'font-size': 11, 'font-family': css('--f-data') }, svg).textContent = k;
    let d = `M${x(-.5)},${y(R[0].champion_s)}`; R.forEach((r, i) => { d += `H${x(i)}V${y(after[i])}`; }); d += `H${x(n - .5)}`;
    el('path', { d, fill: 'none', stroke: css('--fast'), 'stroke-width': 2.5 }, svg);
    el('rect', { x: x(cur) - (W - L - Rm) / n / 2, y: Tm - 6, width: (W - L - Rm) / n, height: H - Tm - B + 8, fill: 'rgba(233,238,243,.06)', stroke: css('--chalk-2'), 'stroke-width': 1.5 }, svg);
    R.forEach((r, i) => {
      const g = el('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': `Round ${r.round}: ${outLabel(r.outcome)}` }, svg), c = css(kind(r)), yy = y(after[i]), s = Math.min(6, (W - L - Rm) / n * .32);
      el('title', {}, g).textContent = `Round ${r.round} · ${outLabel(r.outcome)}` + (r.new_s ? ` · ${r.champion_s.toFixed(1)} → ${r.new_s.toFixed(1)} s` : '');
      el('rect', { x: x(i) - (W - L - Rm) / n / 2, y: Tm, width: (W - L - Rm) / n, height: H - Tm - B, fill: 'transparent' }, g);
      if (r.crash) el('path', { d: `M${x(i) - s},${yy - s}l${2 * s},${2 * s}m0,${-2 * s}l${-2 * s},${2 * s}`, stroke: c, 'stroke-width': 3 }, g);
      else el('rect', { x: x(i) - s, y: yy - s, width: 2 * s, height: 2 * s, fill: c, stroke: css('--panel'), 'stroke-width': 1.5 }, g);
      const go = () => { cur = i; focus = null; curve(); detail(); };
      g.addEventListener('click', go); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  // plain-language view of a round (captions written for general readers, demo_export.py --plain); the full record stays one click away
  const secs = v => Math.abs(v) < 0.05 ? null : Math.abs(v).toFixed(1) + ' s';
  const meas = (label, v, kind) => {
    if (v == null) return '';
    const s = secs(v), txt = !s ? 'no difference' : kind === 'without' ? (v > 0 ? `${s} slower` : `${s} faster`) : (v > 0 ? `${s} faster` : `${s} slower`);
    const good = s && (kind === 'without' ? v > 0 : v > 0), bad = s && !good;
    return `<div class="m"><span>${label}</span><b class="${good ? 'g' : bad ? 'r' : ''}">${txt}</b></div>`;
  };
  const modelNames = t => String(t ?? '').replace(/\bJev\b/gi, 'the decision model').replace(/\bDeepSeek\b/gi, 'LLM');
  const plainWords = t => modelNames(t).replace(/\bThe proposer\b/g, 'The system').replace(/\bthe proposer\b/g, 'the system').replace(/\bproposer\b/g, 'system');
  const NOVALID = 'No usable proposal this round: the proposed edits were invalid, so nothing was driven on track.';
  function detail() {
    const r = R[cur], o = OUT[r.outcome.split('+')[0]] || [outLabel(r.outcome), r.branch ? '--slow' : '--chalk-3'];
    const d = r.new_s ? r.champion_s - r.new_s : null;
    const times = r.new_s ? `Total time ${r.champion_s.toFixed(1)} → ${r.new_s.toFixed(1)} s · ${d.toFixed(1)} s faster` : r.crash ? 'The new version crashed, so nothing changed' : 'The best version stays the same';
    const noticed = r.outcome === 'no_valid_proposal' ? NOVALID : plainWords(r.plain);
    const items = r.items.map(it => {
      const branchWork = it.all_s == null;
      const st = branchWork ? null : r.outcome === 'confirm_failed' ? ['Not kept', 'n'] : it.admitted === true ? ['Kept', 'g'] : ['Rejected', 'r'];
      return `<div class="item${it.id === focus ? ' focus' : ''}${st ? ' ' + st[1] : ''}" data-id="${esc(it.id)}">
        <div class="ih"><p class="chg">${esc(plainWords(it.plain) || it.id)}</p>${st ? `<span class="px st ${st[1]}">${st[0]}</span>` : ''}</div>
        ${branchWork ? '' : `<div class="meas">${meas('All edits together', it.all_s, 'with')}${meas('Without this edit', it.loo_s, 'without')}${meas('This edit alone', it.alone_s, 'with')}</div>`}
        ${it.plain_why && !branchWork ? `<p class="ver ${st[1]}"><span class="px">Reviewer</span>${esc(plainWords(it.plain_why))}</p>` : ''}</div>`;
    }).join('');
    const record = (r.hypothesis ? `<p><b>Second model's hypothesis.</b> ${esc(modelNames(r.hypothesis))}</p>` : '') + r.items.map(it => `<div class="rec"><p class="mono">${esc(it.id)} · ${esc(it.part)}</p>
        ${it.rationale ? `<p><b>Rationale.</b> ${esc(modelNames(it.rationale))}</p>` : ''}${it.verdict ? `<p><b>Reviewer.</b> ${esc(modelNames(it.verdict))}</p>` : ''}${it.diff ? `<pre>${esc(modelNames(it.diff))}</pre>` : ''}</div>`).join('');
    $('rDetail').innerHTML = `<div class="rh"><h3 class="px" style="color:var(${r.crash ? '--slower' : o[1]})">Round ${r.round} · ${esc(o[0])}</h3><span>${times}</span></div>
      ${r.outcome === 'confirm_failed' ? `<div class="alert"><span class="px">Re-check</span> The reviewer's choice was driven again as a whole and was not faster than the best version, so nothing was kept.</div>` : ''}
      ${r.crash ? `<div class="alert"><span class="px">Crash</span> The new version failed on ${r.crash_tracks} of 10 tracks. The error message goes back to the second model for the next round.</div>` : ''}
      <p class="noticed"><span class="px y">What the second model saw and tried</span>${esc(noticed)}</p>
      ${items ? `<p class="px sub">The edits${r.items.some(it => it.all_s == null) ? ' <span>work on a big redesign aside: judged together when it asks to join</span>' : ' <span>each one driven on all 10 practice tracks</span>'}</p><div class="items">${items}</div>` : ''}
      ${record ? `<details class="record"><summary class="px">Full record: the models' own words and the code</summary>${record}</details>` : ''}`;
  }
  curve(); detail();

  /* ---------- branches ---------- */
  const END = { merged: ['Joined the main line', '--best'], dropped: ['Given up', '--slower'], rejected: ['Refused by the reviewer', '--chalk-2'], open: ['Still open when the run ended', '--slow'] };
  let bSel = D.branches.findIndex(b => b.opened === 20); if (bSel < 0) bSel = 0;
  function lineage() {
    const svg = $('lineage'), W = Math.max(520, svg.getBoundingClientRect().width), H = 240; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
    const n = R.length, Lm = 24, Rm = 20, x = r => Lm + (W - Lm - Rm) * (r - .5) / n, lanes = 3, gap = 62, mainY = 60, laneY = k => mainY + gap * (k + 1);
    for (let r = 5; r <= n; r += 5) { el('line', { x1: x(r), x2: x(r), y1: mainY - 20, y2: H - 26, stroke: css('--rule'), 'stroke-dasharray': '2 6' }, svg); el('text', { x: x(r), y: H - 8, 'text-anchor': 'middle', fill: css('--chalk-3'), 'font-size': 11, 'font-family': css('--f-data') }, svg).textContent = r; }
    el('line', { x1: x(.5), x2: x(n + .5), y1: mainY, y2: mainY, stroke: css('--fast'), 'stroke-width': 5 }, svg);
    el('text', { x: x(.5), y: mainY - 26, fill: css('--fast'), 'font-size': 11, 'font-family': css('--f-pixel') }, svg).textContent = 'BEST SO FAR';
    R.forEach(r => { if (!r.new_s) return; el('rect', { x: x(r.round) - 6, y: mainY - 6, width: 12, height: 12, fill: css(r.outcome === 'branch_merged' ? '--best' : '--faster'), stroke: css('--panel'), 'stroke-width': 2 }, svg);
      el('text', { x: x(r.round), y: mainY - 11, 'text-anchor': 'middle', fill: css('--chalk-2'), 'font-size': 10, 'font-family': css('--f-data') }, svg).textContent = Math.round(r.new_s); });
    const busy = Array(lanes).fill(-1);
    D.branches.forEach((b, i) => {
      const first = b.opened, last = b.rounds.at(-1)[0]; let k = busy.findIndex(e => e < first - 0.5); if (k < 0) k = i % lanes; busy[k] = last + 1; const yy = laneY(k);
      const endC = css(b.end === 'merged' ? '--best' : b.end === 'dropped' ? '--slower' : b.end === 'rejected' ? '--chalk-3' : '--slow'), sel = i === bSel;
      const g = el('g', { style: 'cursor:pointer', opacity: sel ? 1 : .6, tabindex: 0, role: 'button', 'aria-label': `Redesign started in round ${first}: ${END[b.end][0]}` }, svg);
      const go = () => { bSel = i; lineage(); };
      g.addEventListener('click', go); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      el('title', {}, g).textContent = `Redesign started in round ${first} · ${END[b.end][0]}`;
      el('path', { d: `M${x(first)},${mainY}V${yy}H${x(last)}` + (b.end === 'merged' ? `V${mainY}` : ''), fill: 'none', stroke: endC, 'stroke-width': sel ? 4 : 2.5 }, g);
      for (const [r, , crash] of b.rounds) { if (crash) { const s = 6; el('path', { d: `M${x(r) - s},${yy - s}l${2 * s},${2 * s}m0,${-2 * s}l${-2 * s},${2 * s}`, stroke: css('--slower'), 'stroke-width': 3 }, g); }
        else el('rect', { x: x(r) - 5, y: yy - 5, width: 10, height: 10, fill: css('--panel'), stroke: endC, 'stroke-width': 2.5 }, g); }
      el('rect', { x: x(first) - 10, y: Math.min(mainY, yy) - 4, width: x(last) - x(first) + 20, height: Math.abs(yy - mainY) + 20, fill: 'transparent' }, g);
    });
    const b = D.branches[bSel], [endTxt, endCol] = END[b.end];
    const rows = b.rounds.map(([r, c, crash, o]) => `<div class="row"><span>Round ${r} · ${esc(outLabel(o))}</span><span class="mono" style="color:${crash ? 'var(--slower)' : ''}">${crash ? `crashed on ${(R.find(q => q.round === r) || {}).crash_tracks ?? '?'} of 10 tracks` : c != null && c < 2000 ? 'total ' + c.toFixed(1) + ' s' : '—'}</span></div>`).join('');
    const champ = (R.find(r => r.round === b.opened) || {}).champion_s;
    $('bDetail').innerHTML = `<div class="rh"><h3 class="px" style="color:var(${endCol})">${endTxt}</h3><span>started in round ${b.opened}${champ ? ` · the best version then: ${champ.toFixed(1)} s` : ''}</span></div>
      <p class="noticed"><span class="px y">What the redesign tried</span>${esc(plainWords((R.find(r => r.round === b.opened) || {}).plain))}</p>
      <p class="px sub">Round by round</p>${rows}`;
  }
  lineage();

  /* ---------- results ---------- */
  {
    const svg = $('gRounds'), W = 640, H = 360, Lm = 52, Rm = 20, T = 20, B = 34, x = k => Lm + (W - Lm - Rm) * k / 40, lo = 420, hi = 1160, y = v => T + (H - T - B) * (hi - v) / (hi - lo);
    for (const tk of [500, 700, 900, 1100]) { el('line', { x1: Lm, x2: W - Rm, y1: y(tk), y2: y(tk), stroke: css('--rule'), 'stroke-dasharray': '2 4' }, svg); el('text', { x: Lm - 8, y: y(tk) + 4, 'text-anchor': 'end', fill: css('--chalk-3'), 'font-size': 12, 'font-family': css('--f-data') }, svg).textContent = tk; }
    for (const tk of [0, 10, 20, 30, 40]) el('text', { x: x(tk), y: H - 12, 'text-anchor': 'middle', fill: css('--chalk-3'), 'font-size': 12, 'font-family': css('--f-data') }, svg).textContent = tk;
    el('line', { x1: Lm, x2: W - Rm, y1: y(res.oracle_train_s), y2: y(res.oracle_train_s), stroke: css('--oracle'), 'stroke-dasharray': '6 4' }, svg);
    el('text', { x: W - Rm, y: y(res.oracle_train_s) + 16, 'text-anchor': 'end', fill: css('--oracle'), 'font-size': 11, 'font-family': css('--f-pixel') }, svg).textContent = `GAME'S OWN AI ${res.oracle_train_s.toFixed(0)} S`;
    const cs = { 'crude 1': css('--fast'), 'crude 2': css('--slow'), 'crude 3': css('--best') }, cap = $('gRoundsCap'), base = cap.textContent, paths = [];
    for (const r of runs) {
      const d = r.curve.map((v, k) => (k ? `H${x(k)}V${y(v)}` : `M${x(0)},${y(v)}`)).join(''), shown = r.start === 'crude 2' && r.seed === 's1';
      const p = el('path', { d, fill: 'none', stroke: cs[r.start], 'stroke-width': shown ? 3 : 1.8, 'stroke-opacity': .9, style: 'cursor:pointer' }, svg); paths.push(p);
      const hit = el('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 12, style: 'cursor:pointer' }, svg);
      el('title', {}, hit).textContent = `${startName(r.start)}, ${repeatName(r.seed)}: ${r.start_train_s.toFixed(0)} → ${r.train_s.toFixed(0)} s`;
      hit.addEventListener('mouseenter', () => { paths.forEach(q => q.setAttribute('stroke-opacity', q === p ? 1 : .2)); cap.textContent = `${startName(r.start)}, ${repeatName(r.seed)}: ${r.start_train_s.toFixed(1)} → ${r.train_s.toFixed(1)} s on the practice tracks; ${r.start_test_s.toFixed(0)} → ${r.test_s.toFixed(0)} s on the tracks it never practiced on (${Math.floor(r.gap_closed * 100)} % of the distance to the game's own AI closed).` + (shown ? ' This is the run shown on this page.' : ''); });
      hit.addEventListener('mouseleave', () => { paths.forEach(q => q.setAttribute('stroke-opacity', .9)); cap.textContent = base; });
    }
    Object.entries(cs).forEach(([k, c], i) => el('text', { x: x(27), y: T + 16 + i * 16, fill: c, 'font-size': 11, 'font-family': css('--f-pixel') }, svg).textContent = startName(k).toUpperCase());
  }
  {
    const svg = $('gGap'), W = 440, H = 360, Lm = 78, Rm = 46, T = 14, rowH = (H - T - 34) / runs.length, x = v => Lm + (W - Lm - Rm) * v;
    for (const v of [0, .5, 1]) { el('line', { x1: x(v), x2: x(v), y1: T, y2: H - 30, stroke: css('--rule'), 'stroke-dasharray': '2 4' }, svg); el('text', { x: x(v), y: H - 12, 'text-anchor': 'middle', fill: css('--chalk-3'), 'font-size': 12, 'font-family': css('--f-data') }, svg).textContent = (v * 100) + '%'; }
    runs.forEach((r, i) => {
      const yy = T + i * rowH, c = css('--fast'), g = el('g', {}, svg);
      el('title', {}, g).textContent = `${startName(r.start)}, ${repeatName(r.seed)}: ${r.start_test_s.toFixed(1)} → ${r.test_s.toFixed(1)} s on the tracks it never practiced on (game's own AI ${res.oracle_test_s.toFixed(1)} s)`;
      el('text', { x: Lm - 10, y: yy + rowH * .62, 'text-anchor': 'end', fill: css('--chalk-2'), 'font-size': 11, 'font-family': css('--f-pixel') }, g).textContent = `${startName(r.start).replace('Start ', '')}${r.seed.replace(/\D/g, '')}`;
      el('rect', { x: x(0), y: yy + rowH * .18, width: x(r.gap_closed) - x(0), height: rowH * .64, fill: c }, g);
      el('text', { x: x(r.gap_closed) + 6, y: yy + rowH * .64, fill: c, 'font-size': 12, 'font-family': css('--f-data') }, g).textContent = Math.floor(r.gap_closed * 100) + '%';
    });
  }

  // the 2:30 video plays in a dialog on the page (the link still opens the file without JavaScript)
  { const box = $('vidBox'), v = $('demoVideo'), open = $('openVideo');
    if (box && v && open && box.showModal) {
      const close = () => { v.pause(); box.close(); };
      open.addEventListener('click', e => { e.preventDefault(); box.showModal(); v.play().catch(() => {}); });
      $('closeVideo').addEventListener('click', close);
      box.addEventListener('click', e => { if (e.target === box) close(); });
      box.addEventListener('close', () => v.pause());
    } }

  // cite: copy the whole BibTeX entry
  const cb = $('copyBib');
  if (cb) cb.addEventListener('click', async () => {
    const text = $('bib').textContent, label = cb.querySelector('span');
    try { await navigator.clipboard.writeText(text); }
    catch { const r = document.createRange(); r.selectNodeContents($('bib')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); }
    cb.classList.add('done'); label.textContent = 'Copied'; setTimeout(() => { cb.classList.remove('done'); label.textContent = 'Copy'; }, 1600);
  });

  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { curve(); lineage(); }, 120); });
})();

// Hero title: a pixel kart corkscrews along "Race Ahead" in 3D, left to right. The word is the axis of the
// coil; the kart is drawn in front of the letters on the near side of each turn and behind them on the far side.
(() => {
  const h1 = document.getElementById('title'), back = document.getElementById('orbitBack'), front = document.getElementById('orbitFront');
  if (!h1 || !back || !front) return;
  const NS = 'http://www.w3.org/2000/svg', el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  // 8x6 top-down kart, nose pointing +x: [x, y, w, h, fill]
  const SPRITE = [[0,0,2,1,'#e9eef3'],[5,0,2,1,'#e9eef3'],[0,5,2,1,'#e9eef3'],[5,5,2,1,'#e9eef3'],
    [0,1,1,4,'#a3afbd'],[1,1,6,4,'#6fc8cf'],[7,2,1,2,'#6fc8cf'],[3,2,2,2,'#ffc2b4']];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SEGS = 34, FADE = .04;                                   // trail pieces; share of the run spent fading in/out
  let g = {}, kart, segs = [], raf = 0, t0 = 0;

  function build() {
    const w = h1.offsetWidth, h = h1.offsetHeight, fs = parseFloat(getComputedStyle(h1).fontSize);
    const turns = Math.max(2, Math.round(w / (fs * 1.7)));       // ~one coil per two letters
    g = { x0: fs * .3, x1: w - fs * .3, cy: h * .5, ry: h * .45, turns, size: Math.max(16, fs * .25),
          lap: turns * 1500, trail: .7 / turns };
    for (const s of [back, front]) { s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.replaceChildren(); }
    // Faint wire of the whole coil, so the 3D path reads even where the kart is not.
    const n = turns * 60;
    for (let i = 0; i < n; i++) {
      const a = at(i / n), b = at((i + 1) / n), z = (a.z + b.z) / 2;
      (z > 0 ? front : back).appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'guide',
        'stroke-width': 1 + .6 * z, 'stroke-opacity': (z > 0 ? .28 : .12) * fade(i / n) }));
    }
    segs = Array.from({ length: SEGS }, () => el('line', {}));
    kart = el('g', { 'shape-rendering': 'crispEdges' });
    for (const [x, y, ww, hh, f] of SPRITE) kart.appendChild(el('rect', { x, y, width: ww, height: hh, fill: f }));
  }

  const fade = u => Math.max(0, Math.min(1, u / FADE, (1 - u) / FADE));
  // u in [0,1] along the run -> screen point and depth z in [-1,1] (+1 nearest the viewer).
  function at(u) {
    const phi = u * g.turns * 2 * Math.PI;
    return { x: g.x0 + (g.x1 - g.x0) * u, y: g.cy - g.ry * Math.cos(phi), z: Math.sin(phi) };
  }

  function draw(u) {
    segs.forEach((ln, i) => {
      const ua = u - g.trail * (i + 1) / SEGS, ub = u - g.trail * i / SEGS;
      if (ua < 0) { ln.remove(); return; }
      const a = at(ua), b = at(ub), z = (a.z + b.z) / 2, k = 1 - i / SEGS;
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.setAttribute('stroke-width', g.size * .3 * (1 + .3 * z) * (.4 + .6 * k));
      ln.setAttribute('stroke-opacity', (z > 0 ? .85 : .4) * k * fade(ub));
      (z > 0 ? front : back).appendChild(ln);
    });
    const p = at(u), q = at(Math.min(1, u + .0005)), r = at(u - .0005);
    const ang = Math.atan2(q.y - r.y, q.x - r.x) * 180 / Math.PI;
    const s = g.size * (1 + .3 * p.z) / 6;                       // nearer = bigger
    kart.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${ang}) scale(${s}) translate(-4,-3)`);
    kart.setAttribute('opacity', (p.z > 0 ? 1 : .6 + .3 * (1 + p.z)) * fade(u));
    (p.z > 0 ? front : back).appendChild(kart);
  }

  function frame(t) { if (!t0) t0 = t; draw(((t - t0) % g.lap) / g.lap); raf = requestAnimationFrame(frame); }
  function start() {
    build(); cancelAnimationFrame(raf); t0 = 0;
    if (still) { draw(.3); segs.forEach(l => l.remove()); return; }
    raf = requestAnimationFrame(frame);
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(start, 120); });
})();
