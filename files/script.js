'use strict';
/* ===== Data definitions ===== */
const KEY = 'rrbTrackerV1';
const SUBJ = {ms:'Basic Science & Mathematics', di:'Data Interpretation', lc:'Logical Capability', mr:'Mental Reasoning', cbat:'CBAT / Psycho-technical'};
const SYL = {
 ms:{Mathematics:['Number System','BODMAS','LCM and HCF','Fractions and Decimals','Ratio and Proportion','Percentages','Averages','Profit and Loss','Discount','Time and Work','Speed, Time and Distance','Algebra','Linear Equations','Arithmetic Progression','Geometry','Trigonometry','Area and Perimeter','Volume and Surface Area','Probability','Statistics'],
  'Basic Science':['Units and Measurements','Mass, Weight and Density','Work, Power and Energy','Kinetic Energy','Friction','Speed and Velocity','Relative Velocity','Heat and Temperature','Basic Electricity','Levers and Simple Machines']},
 di:{'Data Analysis':['Tables','Bar Graphs','Pie Charts','Line Graphs','Scatter Plots','Statistical Curve Distribution','Venn Diagrams','Data Sufficiency','Data Arrangement','Multi-source Data Analysis','Textual Data Interpretation','Data Inference']},
 lc:{'Logical Capability':['Binary Logic','Syllogisms','Clocks','Calendars','Assumptions','Blood Relations','Family Trees','Logic Puzzles','English Reading Comprehension','Main Idea Identification','Supporting Ideas','Logical Structure of Passages']},
 mr:{'Mental Reasoning':['Analogy','Relationships Between Items','Series Completion','Number Patterns','Coding and Decoding','Ranking','Arrangement Problems']},
 cbat:{'CBAT':['Concentration and Attention','Memory and Recall','Spatial Ability','Direction Sense','Observation Skills','Pattern Recognition','Speed and Accuracy','Decision Making','Information Processing','Timed Aptitude Exercises','Mixed Aptitude Practice']}
};
const TOPICS = [];
Object.entries(SYL).forEach(([s, groups]) => Object.entries(groups).forEach(([g, list]) => list.forEach(n => TOPICS.push({id:'t' + TOPICS.length, name:n, subject:s, group:g}))));
const TOPIC = id => TOPICS.find(t => t.id === id);
const MOCK_DAYS = [7,19,31,35,41,43];
const ALLOC = [['Mathematics & Science',45],['Data Interpretation',40],['Logical Capability',40],['Mental Reasoning & English',25],['CBAT',20],['Revision',10]];
const PAGES = [['dash','📊 Dashboard'],['plan','📅 45-Day Planner'],['syl','📚 Complete Syllabus'],['track','✅ Topic Tracker'],['mock','📝 Mock Tests'],['rev','🔁 Revision Manager'],['cbat','🧠 CBAT Practice'],['timer','⏱ Study Timer'],['notes','🗒 Notes & Mistakes'],['ana','📈 Analytics'],['set','⚙ Settings']];

/* ===== Helpers ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => new Date().toLocaleDateString('en-CA');
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(+v) ? +v : a));
const num = v => Math.max(0, Math.floor(+v || 0));
const bar = (p, cls = '') => `<div class="bar"><i class="${cls}" style="width:${p}%"></i></div>`;
const stCls = s => s === 'Completed' ? 'g' : s === 'In Progress' ? 'y' : 'n';
const badge = s => `<span class="badge ${s.split(' ')[0]}">${s}</span>`;

/* ===== State (always persisted to localStorage) ===== */
const blankTopic = () => ({status:'Not Started', pct:0, start:'', done:'', mins:0, conf:0, q:0, correct:0, notes:'', rev:false});
function defaultState() {
  const s = {v:1, start:todayISO(), theme:'light', topics:{}, days:{}, plan:{}, mocks:{}, rev:[], notes:[]};
  TOPICS.forEach(t => s.topics[t.id] = blankTopic());
  for (let d = 1; d <= 45; d++) { s.days[d] = {done:false, actual:0, notes:''}; s.plan[d] = []; }
  // spread each subject evenly over days 1-40 (days 41-45 are final revision/mocks)
  Object.keys(SUBJ).forEach(k => { const l = TOPICS.filter(t => t.subject === k); l.forEach((t, i) => s.plan[Math.floor(i * 40 / l.length) + 1].push(t.id)); });
  MOCK_DAYS.forEach((d, i) => s.mocks[i + 1] = {day:d, date:'', saved:false});
  return s;
}
function loadState() {
  const base = defaultState();
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.topics) return mergeState(base, raw); } catch (e) {}
  return base;
}
function mergeState(base, raw) { // keeps old progress, fills anything missing
  const s = Object.assign(base, raw);
  TOPICS.forEach(t => s.topics[t.id] = Object.assign(blankTopic(), raw.topics[t.id]));
  for (let d = 1; d <= 45; d++) { s.days[d] = Object.assign({done:false, actual:0, notes:''}, raw.days?.[d]); s.plan[d] = raw.plan?.[d] || base.plan[d]; }
  return s;
}
let S = loadState();
function save(msg = 'Saved ✓') { localStorage.setItem(KEY, JSON.stringify(S)); if (msg) toast(msg); }
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toast.h); toast.h = setTimeout(() => t.className = '', 2200); }

/* ===== Derived stats ===== */
const currentDay = () => clamp(Math.floor((new Date(todayISO()) - new Date(S.start)) / 864e5) + 1, 1, 45);
function stats() {
  const xs = TOPICS.map(t => S.topics[t.id]), cur = currentDay();
  const completed = xs.filter(x => x.status === 'Completed').length;
  const mins = Object.values(S.days).reduce((a, d) => a + d.actual, 0);
  let streak = 0, d = S.days[cur].actual > 0 ? cur : cur - 1;
  while (d >= 1 && S.days[d].actual > 0) { streak++; d--; }
  const doneDays = Object.values(S.days).filter(x => x.done).length;
  return {cur, completed, mins, streak, doneDays, pct:Math.round(xs.reduce((a, x) => a + x.pct, 0) / TOPICS.length)};
}
const subjPct = k => { const l = TOPICS.filter(t => t.subject === k); return Math.round(l.reduce((a, t) => a + S.topics[t.id].pct, 0) / l.length); };
const pendingRevs = () => S.rev.flatMap(r => r.due.map((d, i) => ({r, i, d, done:r.done[i]}))).filter(x => !x.done).sort((a, b) => a.d.localeCompare(b.d));

/* ===== Topic update logic ===== */
function applyTopic(x, st, pct) {
  const t = todayISO(); pct = clamp(pct, 0, 100);
  if (st !== x.status) { if (st === 'Completed') pct = 100; else if (st === 'Not Started') pct = 0; else if (pct === 0 || pct === 100) pct = 50; }
  st = pct >= 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started';
  x.pct = pct; x.status = st;
  x.start = st === 'Not Started' ? '' : (x.start || t);
  x.done = st === 'Completed' ? (x.done || t) : '';
}
function addRevision(tid) {
  if (S.rev.some(r => r.tid === tid && r.done.includes(false))) return false;
  const b = todayISO(); S.rev.push({id:Date.now() + Math.random(), tid, base:b, due:[addDays(b, 1), addDays(b, 3), addDays(b, 7)], done:[false, false, false]});
  S.topics[tid].rev = true; return true;
}

/* ===== Charts (inline SVG) ===== */
function barChart(labels, vals, max, color = 'var(--accent)') {
  const n = vals.length, w = Math.max(n * 24, 320), h = 130, m = Math.max(max, 1), bw = w / n;
  return `<svg class="chart" viewBox="0 0 ${w} ${h + 20}">${vals.map((v, i) => `<rect x="${i * bw + 2}" y="${h - v / m * h}" width="${bw - 4}" height="${v / m * h}" rx="3" fill="${color}"><title>${labels[i]}: ${v}</title></rect><text x="${i * bw + bw / 2}" y="${h + 14}" font-size="9" text-anchor="middle" fill="currentColor">${labels[i]}</text>`).join('')}</svg>`;
}
function lineChart(labels, vals, max) {
  const n = vals.length, w = 420, h = 140, m = Math.max(max, 1), step = n > 1 ? (w - 40) / (n - 1) : 0;
  const pts = vals.map((v, i) => [20 + i * step, h - v / m * h + 5]);
  return `<svg class="chart" viewBox="0 0 ${w} ${h + 30}"><polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--accent)"><title>${labels[i]}: ${vals[i]}</title></circle><text x="${p[0]}" y="${h + 22}" font-size="10" text-anchor="middle" fill="currentColor">${labels[i]}</text><text x="${p[0]}" y="${p[1] - 9}" font-size="10" text-anchor="middle" fill="currentColor">${vals[i]}</text>`).join('')}</svg>`;
}
const subjBars = () => Object.entries(SUBJ).map(([k, n]) => `<div class="row"><span>${n}</span><b>${subjPct(k)}%</b></div>${bar(subjPct(k), 'g')}`).join('');

/* ===== Pages ===== */
let page = location.hash.slice(1) || 'dash';
const F = {q:'', subj:'', status:'', sort:'name'}; // topic filters
const N = {q:'', subj:'', type:''};                // note filters

function render() {
  document.documentElement.dataset.theme = S.theme;
  $('#nav').innerHTML = PAGES.map(([k, n]) => `<button class="${k === page ? 'on' : ''}" data-act="go" data-id="${k}">${n}</button>`).join('');
  const fn = {dash, plan, syl, track, mock, rev, cbat, timer, notes, ana, set}[page] || dash;
  $('#page').innerHTML = fn();
  if (page === 'track' || page === 'cbat') updateRows();
  if (page === 'notes') updateNotes();
  if (page === 'timer') tickDisplay();
}

function dash() {
  const s = stats(), pr = pendingRevs().slice(0, 6), today = todayISO();
  const card = (v, l) => `<div class="card stat"><b>${v}</b><span>${l}</span></div>`;
  const days = Array.from({length:45}, (_, i) => S.days[i + 1].actual);
  return `<h2>Dashboard</h2><div class="grid">
   ${card(45, 'Total preparation days')}${card(s.doneDays, 'Completed days')}${card(45 - s.doneDays, 'Remaining days')}
   ${card(s.pct + '%', 'Overall syllabus completion')}${card((s.mins / 60).toFixed(1) + ' h', 'Study hours completed')}${card('3 h', 'Daily study target')}
   ${card('Day ' + s.cur, 'Current preparation day')}${card('🔥 ' + s.streak, 'Study streak (days)')}${card(s.completed, 'Topics completed')}${card(TOPICS.length - s.completed, 'Topics remaining')}</div>
   <div class="grid w"><div class="card"><h3>Subject-wise progress</h3>${subjBars()}</div>
   <div class="card"><h3>Upcoming revision topics</h3>${pr.length ? pr.map(x => `<div class="row"><span>${esc(TOPIC(x.r.tid).name)} <small class="muted">(R${x.i + 1})</small></span><span class="${x.d < today ? 'over' : ''}">${x.d < today ? 'Overdue · ' : ''}${x.d}</span></div>`).join('') : '<p class="empty">No pending revisions 🎉</p>'}</div></div>
   <div class="card"><h3>Daily study minutes (target 180)</h3>${barChart(days.map((_, i) => i + 1), days, 180)}</div>`;
}

function plan() {
  const cur = currentDay();
  return `<h2>45-Day Planner</h2><div class="card muted">Default daily split: ${ALLOC.map(a => a[0] + ' ' + a[1] + 'm').join(' · ')} = 180 min.</div><div class="grid w">${Array.from({length:45}, (_, i) => {
    const d = i + 1, x = S.days[d], mi = MOCK_DAYS.indexOf(d);
    return `<div class="card day ${x.done ? 'done' : ''} ${d === cur ? 'today' : ''}"><div class="row"><b>Day ${d}</b><span class="muted">${addDays(S.start, i)}</span></div>
    ${mi >= 0 ? `<div class="chip">📝 Mock Test ${mi + 1}</div>` : ''}
    <div>${S.plan[d].map(id => { const t = TOPIC(id); return `<span class="chip ${S.topics[id].status.split(' ')[0]}" title="${SUBJ[t.subject]}">${esc(t.name)}</span>`; }).join('') || '<span class="muted">No topics</span>'}</div>
    <div class="row"><span class="muted">${x.actual}/180 min</span><label><input type="checkbox" data-act="daydone" data-id="${d}" ${x.done ? 'checked' : ''}> Done</label><button class="btn sm ghost" data-act="editday" data-id="${d}">Edit</button></div>
    ${bar(Math.min(100, x.actual / 1.8), x.done ? 'g' : 'y')}${x.notes ? `<small class="muted">${esc(x.notes)}</small>` : ''}</div>`;
  }).join('')}</div>`;
}

function syl() {
  return `<h2>Complete Syllabus</h2>` + Object.entries(SYL).map(([k, groups]) => `<details class="card" open><summary><b>${SUBJ[k]}</b> — ${subjPct(k)}%</summary>${bar(subjPct(k), 'g')}${Object.entries(groups).map(([g, l]) => `<h3 style="margin-top:12px">${g}</h3>` + TOPICS.filter(t => t.subject === k && t.group === g).map(t => { const x = S.topics[t.id]; return `<div class="row"><span>${esc(t.name)}</span><span>${badge(x.status)} ${x.pct}% <button class="btn sm ghost" data-act="edittopic" data-id="${t.id}">Edit</button></span></div>`; }).join('')).join('')}</details>`).join('');
}

function toolbar(fixedSubj) {
  return `<div class="tools"><input id="fq" placeholder="Search topics…" value="${esc(F.q)}" data-chg="filt">
  ${fixedSubj ? '' : `<select id="fs" data-chg="filt"><option value="">All subjects</option>${Object.entries(SUBJ).map(([k, n]) => `<option value="${k}" ${F.subj === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`}
  <select id="fst" data-chg="filt"><option value="">All statuses</option>${['Not Started', 'In Progress', 'Completed'].map(s => `<option ${F.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
  <select id="fo" data-chg="filt">${[['name', 'Sort: name'], ['progress', 'Sort: progress ↑'], ['progressd', 'Sort: progress ↓']].map(([v, n]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div id="rows"></div>`;
}
const track = () => `<h2>Topic Tracker</h2>${toolbar(false)}`;
function cbat() {
  const l = TOPICS.filter(t => t.subject === 'cbat');
  return `<h2>CBAT Practice</h2><div class="card"><div class="row"><b>CBAT progress</b><b>${subjPct('cbat')}%</b></div>${bar(subjPct('cbat'), 'g')}<p class="muted">Track each psycho-technical skill individually. Daily target: 20 minutes.</p></div>${toolbar(true)}`;
}
function updateRows() {
  const fixed = page === 'cbat' ? 'cbat' : F.subj;
  let l = TOPICS.filter(t => (!fixed || t.subject === fixed) && (!F.status || S.topics[t.id].status === F.status) && t.name.toLowerCase().includes(F.q.toLowerCase()));
  l.sort((a, b) => F.sort === 'progress' ? S.topics[a.id].pct - S.topics[b.id].pct : F.sort === 'progressd' ? S.topics[b.id].pct - S.topics[a.id].pct : a.name.localeCompare(b.name));
  $('#rows').innerHTML = !l.length ? '<p class="empty">No topics match your filters.</p>' : `<div class="card tw"><table><thead><tr><th>✓</th><th>Topic</th><th>Subject</th><th>Status</th><th>Progress</th><th>Min</th><th>Conf.</th><th>Accuracy</th><th></th></tr></thead><tbody>${l.map(t => { const x = S.topics[t.id];
   return `<tr><td><input type="checkbox" data-act="quick" data-id="${t.id}" ${x.status === 'Completed' ? 'checked' : ''}></td><td>${esc(t.name)}</td><td>${SUBJ[t.subject].split(' ')[0]}</td><td>${badge(x.status)}</td><td style="min-width:110px">${x.pct}%${bar(x.pct, stCls(x.status))}</td><td>${x.mins}</td><td>${x.conf || '–'}</td><td>${x.q ? Math.round(x.correct / x.q * 100) + '%' : '–'}</td><td><button class="btn sm" data-act="edittopic" data-id="${t.id}">Edit</button></td></tr>`; }).join('')}</tbody></table></div>`;
}

function mock() {
  const done = Object.entries(S.mocks).filter(([, m]) => m.saved);
  return `<h2>Mock Tests</h2><div class="card"><h3>Net score improvement</h3>${done.length ? lineChart(done.map(([i]) => 'M' + i), done.map(([, m]) => m.net), Math.max(...done.map(([, m]) => m.total), 1)) : '<p class="empty">Save a mock test result to see the graph.</p>'}</div>
  <div class="grid w">${Object.entries(S.mocks).map(([i, m]) => `<div class="card"><div class="row"><b>Mock Test ${i} – Day ${m.day}</b>${badge(m.saved ? 'Completed' : 'Not Started')}</div>
  ${m.saved ? `<p>Date: ${m.date || '–'}<br>Net score: <b>${m.net}</b> / ${m.total} · Accuracy: <b>${m.acc}%</b><br>Attempted ${m.attempted} · Correct ${m.correct} · Wrong ${m.wrong} · Unattempted ${m.total - m.attempted}<br>Time: ${m.time} min · Weakest: ${m.weak ? SUBJ[m.weak] : '–'}</p>${m.sections ? `<small class="muted">Sections: ${esc(m.sections)}</small><br>` : ''}${m.notes ? `<small class="muted">${esc(m.notes)}</small>` : ''}` : '<p class="muted">Not attempted yet.</p>'}
  <button class="btn sm" data-act="editmock" data-id="${i}">${m.saved ? 'Edit' : 'Enter'} result</button></div>`).join('')}</div>`;
}

function rev() {
  const today = todayISO(), low = TOPICS.filter(t => { const c = S.topics[t.id].conf; return c >= 1 && c <= 2; });
  const opts = TOPICS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  return `<h2>Revision Manager</h2><div class="card"><h3>Schedule a revision (after 1, 3 and 7 days)</h3><div class="tools"><select id="rtopic">${opts}</select><button class="btn" data-act="addrev">Schedule</button><button class="btn ghost" data-act="revcompleted">Schedule all completed topics</button></div></div>
  <div class="card"><h3>⚠ Low-confidence topics (1–2)</h3>${low.length ? low.map(t => `<span class="chip low">${esc(t.name)} (${S.topics[t.id].conf}) <a href="#" data-act="addrev2" data-id="${t.id}">+rev</a></span>`).join('') : '<p class="empty">None.</p>'}</div>
  <div class="card tw"><h3>Scheduled revisions</h3>${S.rev.length ? `<table><thead><tr><th>Topic</th><th>Rev 1</th><th>Rev 2</th><th>Rev 3</th><th></th></tr></thead><tbody>${S.rev.map(r => `<tr class="${S.topics[r.tid].conf >= 1 && S.topics[r.tid].conf <= 2 ? 'low' : ''}"><td>${esc(TOPIC(r.tid).name)}</td>${r.due.map((d, i) => `<td class="${!r.done[i] && d < today ? 'over' : ''}"><input type="date" value="${d}" data-chg="revdate" data-id="${r.id}" data-i="${i}"> <input type="checkbox" data-chg="revdone" data-id="${r.id}" data-i="${i}" ${r.done[i] ? 'checked' : ''}></td>`).join('')}<td><button class="btn sm red" data-act="delrev" data-id="${r.id}">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No revisions scheduled yet.</p>'}</div>`;
}

/* ===== Study timer ===== */
const T = {kind:'focus', total:1500, left:1500, run:false, end:0, h:null};
function timer() {
  const pre = [[25, 'focus', '25 min focus'], [5, 'break', '5 min break'], [50, 'focus', '50 min focus'], [10, 'break', '10 min break']];
  return `<h2>Study Timer</h2><div class="card"><div class="tools">${pre.map(p => `<button class="btn ghost" data-act="preset" data-m="${p[0]}" data-k="${p[1]}">${p[2]}</button>`).join('')}<input id="cm" type="number" min="1" max="300" placeholder="Custom min" style="width:120px"><button class="btn ghost" data-act="custom">Set</button></div>
  <div class="timer" id="tdisp"></div><p class="muted" style="text-align:center" id="tkind"></p>
  <div class="tools" style="justify-content:center"><button class="btn" data-act="tstart" id="tbtn">Start</button><button class="btn ghost" data-act="treset">Reset</button><button class="btn ghost" data-act="tfinish">Finish &amp; save to topic</button></div></div>`;
}
function tickDisplay() {
  if (!$('#tdisp')) return;
  $('#tdisp').textContent = String(Math.floor(T.left / 60)).padStart(2, '0') + ':' + String(T.left % 60).padStart(2, '0');
  $('#tkind').textContent = (T.kind === 'focus' ? '🎯 Focus' : '☕ Break') + ' session';
  $('#tbtn').textContent = T.run ? 'Pause' : 'Start';
}
function timerTick() {
  T.left = Math.max(0, Math.round((T.end - Date.now()) / 1000)); tickDisplay();
  if (T.left === 0) { stopTimer(); toast('Session finished!'); if (T.kind === 'focus') finishDialog(); }
}
function stopTimer() { clearInterval(T.h); T.run = false; tickDisplay(); }
function finishDialog() {
  const m = Math.max(1, Math.round((T.total - T.left) / 60));
  openModal(`<h3>Save study time</h3><form data-form="session"><div class="f"><label>Minutes studied<input name="m" type="number" min="1" max="600" value="${m}" required></label><label>Topic<select name="t">${TOPICS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label></div><div class="row"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-act="close">Cancel</button></div></form>`);
}

/* ===== Notes ===== */
const NTYPES = ['Note', 'Formula', 'Mistake', 'Difficult concept'];
function notes() {
  return `<h2>Notes &amp; Mistake Notebook</h2><div class="card"><form data-form="note"><div class="f"><label>Type<select name="type">${NTYPES.map(t => `<option>${t}</option>`).join('')}</select></label><label>Topic<select name="t">${TOPICS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label class="full">Content<textarea name="text" required placeholder="Write a note, formula, mistake or difficult concept…"></textarea></label></div><button class="btn" type="submit">Save note</button></form></div>
  <div class="tools"><input id="nq" placeholder="Search notes…" data-chg="nfilt"><select id="ns" data-chg="nfilt"><option value="">All subjects</option>${Object.entries(SUBJ).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><select id="nt" data-chg="nfilt"><option value="">All types</option>${NTYPES.map(t => `<option>${t}</option>`).join('')}</select></div><div id="nlist"></div>`;
}
function updateNotes() {
  const l = S.notes.filter(n => (!N.subj || TOPIC(n.tid)?.subject === N.subj) && (!N.type || n.type === N.type) && (n.text + (TOPIC(n.tid)?.name || '')).toLowerCase().includes(N.q.toLowerCase())).reverse();
  $('#nlist').innerHTML = l.length ? l.map(n => `<div class="card"><div class="row"><span><span class="chip">${n.type}</span><b>${esc(TOPIC(n.tid)?.name || '')}</b> <small class="muted">${n.date}</small></span><button class="btn sm red" data-act="delnote" data-id="${n.id}">✕</button></div><div style="white-space:pre-wrap">${esc(n.text)}</div></div>`).join('') : '<p class="empty">No notes found.</p>';
}

/* ===== Analytics & Settings ===== */
function ana() {
  const s = stats(), done = Object.entries(S.mocks).filter(([, m]) => m.saved);
  const weeks = Array.from({length:7}, (_, w) => { let t = 0; for (let d = w * 7 + 1; d <= Math.min(45, w * 7 + 7); d++) t += S.days[d].actual; return Math.round(t / 60 * 10) / 10; });
  const days = Array.from({length:45}, (_, i) => S.days[i + 1].actual);
  const col = c => c === 0 ? 'var(--grey)' : c <= 2 ? 'var(--red)' : c === 3 ? 'var(--yellow)' : 'var(--green)';
  return `<h2>Analytics</h2><div class="grid"><div class="card stat"><b>${s.pct}%</b><span>Overall completion</span></div><div class="card stat"><b>🔥 ${s.streak}</b><span>Study streak</span></div><div class="card stat"><b>${pendingRevs().length}</b><span>Revisions pending</span></div></div>
  <div class="grid w"><div class="card"><h3>Subject-wise completion</h3>${subjBars()}</div><div class="card"><h3>Weekly productivity (hours)</h3>${barChart(weeks.map((_, i) => 'W' + (i + 1)), weeks, 21, 'var(--green)')}</div></div>
  <div class="card"><h3>Daily study time (min)</h3>${barChart(days.map((_, i) => i + 1), days, 180)}</div>
  <div class="card"><h3>Mock test net score</h3>${done.length ? lineChart(done.map(([i]) => 'M' + i), done.map(([, m]) => m.net), Math.max(...done.map(([, m]) => m.total), 1)) : '<p class="empty">No mock results yet.</p>'}</div>
  <div class="card"><h3>Topic-wise confidence <small class="muted">(grey = unrated, red 1–2, yellow 3, green 4–5)</small></h3>${TOPICS.map(t => `<span class="chip" style="border-left:6px solid ${col(S.topics[t.id].conf)}">${esc(t.name)} ${S.topics[t.id].conf || ''}</span>`).join('')}</div>`;
}
function set() {
  return `<h2>Settings</h2><div class="card"><h3>Preparation start date (Day 1)</h3><input type="date" value="${S.start}" data-chg="start"><p class="muted">Changing this does not affect your saved progress.</p></div>
  <div class="card"><h3>Data</h3><div class="tools"><button class="btn" data-act="export">⬇ Export JSON</button><button class="btn ghost" data-act="import">⬆ Import JSON</button><button class="btn red" data-act="reset">Reset all progress</button></div></div>`;
}

/* ===== Modals ===== */
function openModal(h) { $('#dlgBody').innerHTML = h; $('#dlg').showModal(); }
const closeModal = () => $('#dlg').close();
const field = (l, n, v, a = '') => `<label>${l}<input name="${n}" value="${esc(v)}" ${a}></label>`;

function topicModal(id) {
  const t = TOPIC(id), x = S.topics[id];
  openModal(`<h3>${esc(t.name)} <small class="muted">${SUBJ[t.subject]}</small></h3><form data-form="topic" data-id="${id}"><div class="f">
  <label>Status<select name="status">${['Not Started', 'In Progress', 'Completed'].map(s => `<option ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
  ${field('Completion %', 'pct', x.pct, 'type=number min=0 max=100')}${field('Date started', 'start', x.start, 'type=date')}${field('Date completed', 'done', x.done, 'type=date')}
  ${field('Time spent (min)', 'mins', x.mins, 'type=number min=0')}<label>Confidence (1–5)<select name="conf"><option value="0">Not rated</option>${[1, 2, 3, 4, 5].map(c => `<option ${x.conf === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
  ${field('Questions practised', 'q', x.q, 'type=number min=0')}${field('Correct answers', 'correct', x.correct, 'type=number min=0')}
  <label>Revision required<select name="rev"><option value="no">No</option><option value="yes" ${x.rev ? 'selected' : ''}>Yes</option></select></label>
  <label class="full">Personal notes<textarea name="notes">${esc(x.notes)}</textarea></label></div><div class="row"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-act="close">Cancel</button></div></form>`);
}
function dayModal(d) {
  const x = S.days[d];
  openModal(`<h3>Day ${d} – ${addDays(S.start, d - 1)}</h3><form data-form="day" data-id="${d}"><div class="f">${field('Actual study time (min)', 'actual', x.actual, 'type=number min=0 max=1440')}<label class="full">Notes<textarea name="notes">${esc(x.notes)}</textarea></label></div>
  <h3 style="margin-top:14px">Topics for this day</h3><div>${S.plan[d].map(id => `<span class="chip">${esc(TOPIC(id).name)} <a href="#" data-act="rmtopic" data-id="${d}" data-t="${id}">✕</a></span>`).join('') || '<span class="muted">None</span>'}</div>
  <div class="tools" style="margin-top:8px"><select id="addt">${TOPICS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn ghost" type="button" data-act="addtopic" data-id="${d}">Add topic</button></div>
  <div class="row"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-act="close">Close</button></div></form>`);
}
function mockModal(i) {
  const m = S.mocks[i];
  openModal(`<h3>Mock Test ${i} – Day ${m.day}</h3><form data-form="mock" data-id="${i}"><div class="f">${field('Test date', 'date', m.date || todayISO(), 'type=date')}${field('Total questions', 'total', m.total ?? '', 'type=number min=1 required')}${field('Attempted', 'attempted', m.attempted ?? '', 'type=number min=0 required')}${field('Correct', 'correct', m.correct ?? '', 'type=number min=0 required')}${field('Wrong', 'wrong', m.wrong ?? '', 'type=number min=0 required')}${field('Time taken (min)', 'time', m.time ?? '', 'type=number min=0')}
  <label>Weakest subject<select name="weak"><option value="">–</option>${Object.entries(SUBJ).map(([k, n]) => `<option value="${k}" ${m.weak === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${field('Section-wise marks', 'sections', m.sections || '', 'placeholder="Maths 20, DI 12, …"')}
  <label class="full">Mistakes &amp; observations<textarea name="notes">${esc(m.notes || '')}</textarea></label></div><p class="muted">Unattempted, Net Score (Correct − Wrong/3) and Accuracy are calculated automatically.</p><div class="row"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-act="close">Cancel</button></div></form>`);
}

/* ===== Event handling ===== */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  if (el.tagName === 'A') e.preventDefault();
  switch (a) {
    case 'go': page = id; location.hash = id; $('#sidebar').classList.remove('open'); render(); break;
    case 'theme': S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(''); render(); break;
    case 'close': closeModal(); break;
    case 'edittopic': topicModal(id); break;
    case 'quick': applyTopic(S.topics[id], el.checked ? 'Completed' : 'In Progress', S.topics[id].pct); save(); render(); break;
    case 'daydone': S.days[id].done = el.checked; save(); render(); break;
    case 'editday': dayModal(id); break;
    case 'addtopic': { const t = $('#addt').value; if (!S.plan[id].includes(t)) S.plan[id].push(t); save('Topic added'); dayModal(id); break; }
    case 'rmtopic': S.plan[id] = S.plan[id].filter(t => t !== el.dataset.t); save('Topic removed'); dayModal(id); break;
    case 'editmock': mockModal(id); break;
    case 'addrev': toast(addRevision($('#rtopic').value) ? 'Revision scheduled ✓' : 'Already has pending revision', false); save(''); render(); break;
    case 'addrev2': addRevision(id); save('Revision scheduled ✓'); render(); break;
    case 'revcompleted': { let n = 0; TOPICS.forEach(t => { if (S.topics[t.id].status === 'Completed' && addRevision(t.id)) n++; }); save(n + ' topic(s) scheduled'); render(); break; }
    case 'delrev': S.rev = S.rev.filter(r => String(r.id) !== id); save('Removed'); render(); break;
    case 'delnote': S.notes = S.notes.filter(n => String(n.id) !== id); save('Note deleted'); updateNotes(); break;
    case 'preset': stopTimer(); Object.assign(T, {kind:el.dataset.k, total:el.dataset.m * 60, left:el.dataset.m * 60}); tickDisplay(); break;
    case 'custom': { const m = +$('#cm').value; if (!(m >= 1 && m <= 300)) return toast('Enter 1–300 minutes', true); stopTimer(); Object.assign(T, {kind:'focus', total:m * 60, left:m * 60}); tickDisplay(); break; }
    case 'tstart': if (T.run) { stopTimer(); } else { T.end = Date.now() + T.left * 1000; T.run = true; T.h = setInterval(timerTick, 500); tickDisplay(); } break;
    case 'treset': stopTimer(); T.left = T.total; tickDisplay(); break;
    case 'tfinish': stopTimer(); if (T.total - T.left < 30) return toast('Run the timer first', true); finishDialog(); break;
    case 'export': { const b = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'}), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'rrb-tracker-' + todayISO() + '.json'; l.click(); URL.revokeObjectURL(u); toast('Exported ✓'); break; }
    case 'import': $('#importFile').click(); break;
    case 'reset': if (confirm('Reset ALL progress, mock tests, notes and revisions? This cannot be undone.')) { S = defaultState(); save('Progress reset'); render(); } break;
  }
});
document.addEventListener('change', e => {
  const el = e.target, c = el.dataset.chg; if (!c) return;
  if (c === 'filt') { F.q = $('#fq').value; F.subj = $('#fs')?.value || ''; F.status = $('#fst').value; F.sort = $('#fo').value; updateRows(); }
  if (c === 'nfilt') { N.q = $('#nq').value; N.subj = $('#ns').value; N.type = $('#nt').value; updateNotes(); }
  if (c === 'start') { if (!el.value) return; S.start = el.value; save('Start date saved'); }
  if (c === 'revdate' || c === 'revdone') { const r = S.rev.find(r => String(r.id) === el.dataset.id), i = +el.dataset.i; if (c === 'revdate') { if (!el.value) return; r.due[i] = el.value; } else r.done[i] = el.checked; save(); render(); }
});
document.addEventListener('input', e => { if (e.target.dataset.chg === 'filt' && e.target.id === 'fq') { F.q = e.target.value; updateRows(); } if (e.target.id === 'nq') { N.q = e.target.value; updateNotes(); } });
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target, k = f.dataset.form, v = Object.fromEntries(new FormData(f)), id = f.dataset.id;
  if (k === 'topic') {
    const x = S.topics[id], pct = +v.pct, q = num(v.q), c = num(v.correct);
    if (!(pct >= 0 && pct <= 100)) return toast('Completion must be 0–100', true);
    if (c > q) return toast('Correct answers cannot exceed questions practised', true);
    applyTopic(x, v.status, pct);
    if (v.start && x.status !== 'Not Started') x.start = v.start; if (v.done && x.status === 'Completed') x.done = v.done;
    Object.assign(x, {mins:num(v.mins), conf:clamp(v.conf, 0, 5), q, correct:c, notes:v.notes, rev:v.rev === 'yes'});
    if (x.rev) addRevision(id);
    save('Topic saved ✓'); closeModal(); render();
  } else if (k === 'day') {
    const a = +v.actual; if (!(a >= 0 && a <= 1440)) return toast('Enter 0–1440 minutes', true);
    S.days[id].actual = Math.floor(a); S.days[id].notes = v.notes; save('Day saved ✓'); closeModal(); render();
  } else if (k === 'mock') {
    const m = {total:num(v.total), attempted:num(v.attempted), correct:num(v.correct), wrong:num(v.wrong)};
    if (m.attempted > m.total) return toast('Attempted cannot exceed total', true);
    if (m.correct + m.wrong > m.attempted) return toast('Correct + wrong cannot exceed attempted', true);
    Object.assign(S.mocks[id], m, {date:v.date, time:num(v.time), weak:v.weak, sections:v.sections, notes:v.notes, saved:true,
      net:Math.round((m.correct - m.wrong / 3) * 100) / 100, acc:m.attempted ? Math.round(m.correct / m.attempted * 1000) / 10 : 0});
    save('Mock test saved ✓'); closeModal(); render();
  } else if (k === 'session') {
    const m = +v.m; if (!(m >= 1 && m <= 600)) return toast('Enter 1–600 minutes', true);
    S.topics[v.t].mins += Math.floor(m); S.days[currentDay()].actual += Math.floor(m);
    if (S.topics[v.t].status === 'Not Started') applyTopic(S.topics[v.t], 'In Progress', 10);
    save('Time saved to topic ✓'); closeModal(); T.left = T.total; render();
  } else if (k === 'note') {
    S.notes.push({id:Date.now(), type:v.type, tid:v.t, text:v.text.trim(), date:todayISO()}); save('Note saved ✓'); f.reset(); updateNotes();
  }
});
$('#importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (!d.topics || !d.days) throw 0; S = mergeState(defaultState(), d); save('Data imported ✓'); render(); } catch (x) { toast('Invalid backup file', true); } };
  r.readAsText(file); e.target.value = '';
});
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#dlg').addEventListener('click', e => { if (e.target.id === 'dlg') closeModal(); });
window.addEventListener('hashchange', () => { page = location.hash.slice(1) || 'dash'; render(); });
render();
