/* MECSR Directory 2027 flat plan: the board, page statuses and locks, page notes, team chat, the production
   timeline, history and reports. Everything shared lives in Firebase (Firestore). Without a Firebase config the
   page runs as a practice copy that stays in this browser tab. */
(function () {
'use strict';

const FB_VERSION = '10.14.1';
const PLAN_ID = '2027';
const RELEASE = (window.TIMELINE_SEED && window.TIMELINE_SEED.release) || '2027-02-26';
const TYPE_COLOR = {"Cover":"#12365E","Ad":"#B8860B","Showcase":"#7A3E9D","Article":"#17795E","Country Profile":"#0E6FA8",
  "Feature":"#B03A5B","Message":"#C2703A","TOC":"#6E6A2F","Editorial":"#4A5568","Listing":"#8A9099","Index":"#5E7C8B"};
const TYPE_LABEL = {"Cover":"Cover","Ad":"Ad","Showcase":"DPS showcase","Article":"Expert View","Country Profile":"Country profile",
  "Feature":"Must-Visit","Message":"Message","TOC":"Contents and openers","Editorial":"Editorial","Listing":"Listings","Index":"Index"};
const ORDER = ["Cover","Ad","Showcase","Article","Country Profile","Feature","Message","TOC","Editorial","Listing","Index"];
const NOT_SPREADS = ["Listing","Index"];            // a two-page item of any other type must sit on one spread
const PREFIXES = ["DPS — ","Showcase — ","Expert Views — ","Expert View — ","Country Profiles — ","Must-Visit — ","The People Behind MECSR — "];
const SHORT = {"Media Kit — Advertise with MECSR":"Media Kit","A-Z Index of Properties":"A–Z Index",
  "Retail brands by category":"Retail brands","Service providers by category":"Service providers"};
const BREAKS = {"Azerbaijan":"Azer|baijan","Properties":"Proper|ties","Uzbekistan":"Uzbek|istan","Kyrgyzstan":"Kyrgyz|stan",
  "Kazakhstan":"Kazakh|stan","Chairman's":"Chair|man's","Investment":"Invest|ment","President's":"Presi|dent's",
  "Development":"Develop|ment","Afghanistan":"Afghan|istan","Representatives":"Represen|tatives","Acknowledgements":"Acknow|ledge|ments"};
const SAMPLE_PAGES = 384;
const TL_STATUS = ['Not started', 'In progress', 'Done', 'Delayed', 'On hold'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LOCK_SVG = '<svg class="lk" viewBox="0 0 10 12" aria-hidden="true"><path d="M2.6 5.2V3.7a2.4 2.4 0 0 1 4.8 0v1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="8" height="6.5" rx="1.3" fill="currentColor"/></svg>';

/* ---------------- helpers ---------------- */
const el = id => document.getElementById(id);
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const secName = s => String(s || '').replace(/^\d\d\s+/, '');
const pages = (a, b) => a === b ? String(a) : a + '–' + b;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (a, b) => b > 0 ? Math.round(a * 100 / b) + '%' : '–';
const DUBAI = {timeZone: 'Asia/Dubai'};
const fmtDate = d => d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', ...DUBAI});
const fmtTime = d => fmtDate(d) + ' ' + d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false, ...DUBAI});
function fileStamp(d){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', ...DUBAI})
    .formatToParts(d).map(x => [x.type, x.value]));
  return p.day + p.month.replace('.', '') + p.year;
}
const isoOk = s => /^\d{4}-\d\d-\d\d$/.test(String(s || ''));
const dLabel = s => isoOk(s) ? (+s.slice(8, 10)) + ' ' + MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '';
const dShort = s => isoOk(s) ? (+s.slice(8, 10)) + ' ' + MON[+s.slice(5, 7) - 1] : '';
const dayNum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
function todayISO(){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit', ...DUBAI})
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return p.year + '-' + p.month + '-' + p.day;
}
const tsMs = t => !t ? 0 : typeof t.toMillis === 'function' ? t.toMillis() : typeof t.toDate === 'function' ? +t.toDate()
  : t instanceof Date ? +t : (+t || 0);
function shortLabel(it){
  let s = SHORT[it.item] || it.item || '';
  for (const p of PREFIXES) if (s.indexOf(p) === 0) { s = s.slice(p.length); s = s.charAt(0).toUpperCase() + s.slice(1); break; }
  if (it.sponsor && it.sponsor !== 'OPEN' && s.toLowerCase().indexOf(it.sponsor.toLowerCase()) < 0) s += ' · ' + it.sponsor;
  return s;
}
const hyph = s => esc(s).replace(/[\w']+/g, w => (BREAKS[w] || w).split('|').join('&shy;'));
const newId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let toastTimer = null;
function toast(msg, err){
  const t = el('toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, err ? 6500 : 2600);
}
const loaded = {};
function loadScript(src){
  return loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => { delete loaded[src]; rej(new Error('could not load ' + src)); };
    document.head.appendChild(s);
  }));
}
function friendly(e){
  const code = (e && e.code) || '';
  if (/permission-denied/.test(code)) return 'the shared plan refused it. Reload the page and try again; if it keeps happening, this account may not be an editor';
  if (/unavailable|network/.test(code)) return 'no connection to the shared plan';
  if (/popup-closed|cancelled-popup/.test(code)) return 'sign-in window closed';
  if (/popup-blocked/.test(code)) return 'the browser blocked the sign-in window; allow pop-ups for this site';
  if (/unauthorized-domain/.test(code)) return 'this web address is not yet authorised in Firebase';
  return (e && e.message) || String(e);
}

/* ---------------- the IP address recorded with each change ---------------- */
let ipPromise = null;
function getIp(){
  if (!ipPromise) ipPromise = (async () => {
    for (const url of ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json']) {
      try {
        const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000);
        const r = await fetch(url, {signal: c.signal, cache: 'no-store'}); clearTimeout(t);
        if (r.ok) { const j = await r.json(); if (j && j.ip) return String(j.ip); }
      } catch (e) { /* try the next service */ }
    }
    ipPromise = null; return 'unknown';
  })();
  return ipPromise;
}

/* ---------------- the plan: items in book order; page numbers are always computed ---------------- */
function cleanItems(items){
  return items.map(x => {
    const pp = clamp(parseInt(x.pp, 10) || 1, 1, 400), locked = !!x.locked, lf = parseInt(x.lockedFrom, 10);
    return {id: String(x.id), section: String(x.section || ''), item: String(x.item || ''), type: String(x.type || 'Editorial'), pp,
      sponsor: String(x.sponsor || ''),
      sample: Array.isArray(x.sample) && x.sample.length === 2 ? [x.sample[0] | 0, x.sample[1] | 0] : null,
      note: String(x.note || ''),
      contentPages: clamp(parseInt(x.contentPages, 10) || 0, 0, pp),
      layoutPages: clamp(parseInt(x.layoutPages, 10) || 0, 0, pp),
      locked, lockedFrom: locked && lf > 0 ? lf : null};
  });
}
function tally(){ return {saleable: 0, open: 0, sold: 0, content: 0, layout: 0, locked: 0, lockedItems: 0}; }
function count(t, it){
  if (it.sponsor) { t.saleable += it.pp; if (it.open) t.open += it.pp; else t.sold += it.pp; }
  t.content += it.contentPages || 0; t.layout += it.layoutPages || 0;
  if (it.locked) { t.locked += it.pp; t.lockedItems++; }
}
function layout(items){
  let p = 1; const list = [];
  for (const it of items) {
    const pp = Math.max(1, parseInt(it.pp, 10) || 1);
    list.push(Object.assign({}, it, {pp, from: p, to: p + pp - 1, open: it.sponsor === 'OPEN'})); p += pp;
  }
  const total = p - 1, P2I = {}, secs = [], stats = tally();
  list.forEach(it => { for (let q = it.from; q <= it.to; q++) P2I[q] = it; });
  list.forEach(it => {
    let s = secs[secs.length - 1];
    if (!s || s.section !== it.section) secs.push(s = Object.assign({section: it.section, from: it.from, to: it.to, pp: 0, items: []}, tally()));
    s.to = it.to; s.pp += it.pp; s.items.push(it); count(s, it); count(stats, it);
  });
  const split = list.filter(it => it.pp === 2 && NOT_SPREADS.indexOf(it.type) < 0 && it.from % 2 === 1);
  const moved = list.filter(it => it.locked && it.lockedFrom && it.lockedFrom !== it.from);
  return {items: list, total, P2I, secs, stats, warnings: {split, odd: total % 2 === 1, moved}};
}
function findIdx(items, id){
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error('that item is no longer in the plan (someone else may have changed it)');
  return i;
}
function assertUnlocked(it, what){
  if (it && it.locked) throw new Error('"' + it.item + '" is locked. Unlock it first' + (what ? ' to ' + what : '') + '.');
}
/* Every change is one of these operations. Applied to the latest saved plan, so two people editing at
   once do not overwrite each other. A locked item cannot be moved, edited or deleted until it is unlocked. */
const OPS = {
  move(items, op){
    const i = findIdx(items, op.id); assertUnlocked(items[i], 'move it');
    const it = Object.assign({}, items[i], {section: op.section || items[i].section});
    const rest = items.filter((_, k) => k !== i);
    let at = op.beforeId ? rest.findIndex(x => x.id === op.beforeId) : -1;
    if (at < 0) { const last = rest.map(x => x.section).lastIndexOf(it.section); at = last >= 0 ? last + 1 : rest.length; }
    rest.splice(at, 0, it); return rest;
  },
  moveSection(items, op){
    const block = items.filter(x => x.section === op.section);
    if (!block.length) throw new Error('that section is no longer in the plan');
    const rest = items.filter(x => x.section !== op.section);
    let at = op.beforeSection ? rest.findIndex(x => x.section === op.beforeSection) : -1;
    if (at < 0) at = rest.length;
    rest.splice(at, 0, ...block); return rest;
  },
  update(items, op){
    const i = findIdx(items, op.id), cur = cleanItems([items[i]])[0], f = Object.assign({}, op.fields);
    if (cur.locked && f.locked !== false) {
      const changed = Object.keys(f).filter(k => k !== 'locked' && k !== 'lockedFrom' && JSON.stringify(f[k]) !== JSON.stringify(cur[k]));
      if (changed.length) throw new Error('"' + cur.item + '" is locked. Unlock it first.');
    }
    if ('locked' in f) {
      f.locked = !!f.locked;
      if (f.locked && !cur.locked) f.lockedFrom = layout(items).items[i].from;
      else if (!f.locked) f.lockedFrom = null;
      else delete f.lockedFrom;
    }
    const it = Object.assign({}, items[i], f);
    const out = items.slice(); out[i] = it;
    if (f.section && f.section !== items[i].section) {      // join the new section's pages
      out.splice(i, 1);
      const last = out.map(x => x.section).lastIndexOf(it.section);
      out.splice(last >= 0 ? last + 1 : i, 0, it);
    }
    return out;
  },
  insert(items, op){
    const out = items.slice(); let at = out.length;
    if (op.afterId) { const i = out.findIndex(x => x.id === op.afterId); if (i >= 0) at = i + 1; }
    out.splice(at, 0, op.item); return out;
  },
  remove(items, op){ const i = findIdx(items, op.id); assertUnlocked(items[i], 'delete it'); return items.filter(x => x.id !== op.id); },
  restore(items, op){ return op.items.map(x => Object.assign({}, x)); }
};
const statusText = it => it.sponsor === 'OPEN' ? 'OPEN' : it.sponsor ? 'sold to ' + it.sponsor : 'house';
function progressText(kind, b, a){
  const k = kind === 'content' ? 'contentPages' : 'layoutPages', name = kind === 'content' ? 'content' : 'layout';
  if (a[k] === b[k]) return '';
  if (a.pp !== b.pp && a[k] === Math.min(b[k], a.pp)) return '';      // only trimmed by a change of size
  if (a[k] >= a.pp) return kind === 'content' ? 'content done' : 'layout done';
  if (a[k] === 0) return kind === 'content' ? 'content not completed' : 'layout not done';
  return name + ' ' + a[k] + ' of ' + a.pp + ' pages';
}
function summarise(op, before, after){
  const B = layout(cleanItems(before)), A = layout(cleanItems(after));
  const fb = id => B.items.find(x => x.id === id), fa = id => A.items.find(x => x.id === id);
  const q = it => '"' + (it ? it.item : '?') + '"';
  let s = '';
  if (op.type === 'move') {
    const b = fb(op.id), a = fa(op.id);
    s = 'Moved ' + q(a) + ' from pp ' + pages(b.from, b.to) + ' to pp ' + pages(a.from, a.to);
    if (a.section !== b.section) s += ' (now in ' + secName(a.section) + ')';
  } else if (op.type === 'moveSection') {
    const x = A.secs.find(y => y.section === op.section); s = 'Moved the section ' + secName(op.section) + ' to pp ' + pages(x.from, x.to);
  } else if (op.type === 'update') {
    const b = fb(op.id), a = fa(op.id), ch = [];
    if (a.item !== b.item) ch.push('renamed from ' + q(b));
    if (a.pp !== b.pp) ch.push('pages ' + b.pp + ' → ' + a.pp);
    if (a.sponsor !== b.sponsor) ch.push(statusText(b) + ' → ' + statusText(a));
    if (a.type !== b.type) ch.push('type ' + (TYPE_LABEL[b.type] || b.type) + ' → ' + (TYPE_LABEL[a.type] || a.type));
    if (a.section !== b.section) ch.push('section ' + secName(b.section) + ' → ' + secName(a.section));
    if (JSON.stringify(a.sample) !== JSON.stringify(b.sample)) ch.push('sample page ' + (a.sample ? a.sample[0] : 'none'));
    if ((a.note || '') !== (b.note || '')) ch.push('note');
    [progressText('content', b, a), progressText('layout', b, a)].forEach(x => { if (x) ch.push(x); });
    if (a.locked !== b.locked) ch.push(a.locked ? 'locked at pp ' + pages(a.from, a.to) : 'unlocked');
    s = 'Edited ' + q(a) + ' pp ' + pages(a.from, a.to) + ': ' + (ch.join('; ') || 'no change');
  } else if (op.type === 'insert') {
    const a = fa(op.item.id); s = 'Added ' + q(a) + ' at pp ' + pages(a.from, a.to) + ' (' + secName(a.section) + ')';
  } else if (op.type === 'remove') {
    const b = fb(op.id); s = 'Deleted ' + q(b) + ' (was pp ' + pages(b.from, b.to) + ')';
  } else if (op.type === 'restore') {
    s = 'Restored the plan as it was' + (op.when ? ' on ' + op.when : '');
  }
  if (A.total !== B.total) s += '. Book now ' + A.total + ' pages';
  return s;
}

/* ---------------- the production timeline: rows in order, grouped by phase ---------------- */
function cleanRows(rows){
  return (rows || []).map(r => {
    let start = isoOk(r.start) ? r.start : isoOk(r.due) ? r.due : todayISO(), due = isoOk(r.due) ? r.due : start;
    if (start > due) due = start;
    let status = TL_STATUS.indexOf(r.status) >= 0 ? r.status : 'Not started';
    const done = r.done === true || status === 'Done'; if (done) status = 'Done';
    return {id: String(r.id || newId()), phase: String(r.phase || ''), task: String(r.task || ''), team: String(r.team || ''),
      start, due, status, done, notes: String(r.notes || ''), milestone: !!r.milestone};
  });
}
function findRow(rows, id){
  const i = rows.findIndex(r => r.id === id);
  if (i < 0) throw new Error('that task is no longer in the timeline (someone else may have changed it)');
  return i;
}
const TOPS = {
  update(rows, op){
    const i = findRow(rows, op.id), cur = rows[i], f = Object.assign({}, op.fields);
    if ('done' in f && !('status' in f)) f.status = f.done ? 'Done' : (cur.status === 'Done' ? 'In progress' : cur.status);
    if ('status' in f && !('done' in f)) f.done = f.status === 'Done';
    const r = Object.assign({}, cur, f);
    if (isoOk(r.start) && isoOk(r.due) && r.start > r.due) { if ('start' in f) r.due = r.start; else r.start = r.due; }
    const out = rows.slice(); out[i] = r; return out;
  },
  insert(rows, op){
    const out = rows.slice(); let at = out.length;
    if (op.afterId) { const i = out.findIndex(r => r.id === op.afterId); if (i >= 0) at = i + 1; }
    out.splice(at, 0, op.row); return out;
  },
  remove(rows, op){ findRow(rows, op.id); return rows.filter(r => r.id !== op.id); },
  move(rows, op){
    const i = findRow(rows, op.id), j = i + (op.dir < 0 ? -1 : 1);
    if (j < 0 || j >= rows.length) return rows;
    const out = rows.slice(), r = Object.assign({}, out[i], {phase: rows[j].phase});    // crossing a phase boundary joins that phase
    out.splice(i, 1); out.splice(j, 0, r); return out;
  },
  restore(rows, op){ return op.rows.map(r => Object.assign({}, r)); }
};
function tlSummarise(op, before, after){
  const fb = id => before.find(r => r.id === id), fa = id => after.find(r => r.id === id), q = r => '"' + (r ? r.task : '?') + '"';
  if (op.type === 'update') {
    const b = fb(op.id), a = fa(op.id), ch = [];
    if (a.task !== b.task) ch.push('renamed from ' + q(b));
    if (a.team !== b.team) ch.push('team ' + (b.team || '–') + ' → ' + (a.team || '–'));
    if (a.start !== b.start) ch.push('start ' + dLabel(b.start) + ' → ' + dLabel(a.start));
    if (a.due !== b.due) ch.push('due ' + dLabel(b.due) + ' → ' + dLabel(a.due));
    if (a.status !== b.status) ch.push('status ' + b.status + ' → ' + a.status);
    if (a.notes !== b.notes) ch.push(a.notes ? 'note: ' + a.notes.slice(0, 90) : 'note cleared');
    return 'Timeline: ' + q(a) + ': ' + (ch.join('; ') || 'no change');
  }
  if (op.type === 'insert') return 'Timeline: added ' + q(fa(op.row.id)) + (op.row.phase ? ' (' + op.row.phase + ')' : '');
  if (op.type === 'remove') return 'Timeline: deleted ' + q(fb(op.id));
  if (op.type === 'move') return 'Timeline: moved ' + q(fa(op.id)) + (op.dir < 0 ? ' up' : ' down');
  if (op.type === 'restore') return 'Timeline: restored as it was' + (op.when ? ' on ' + op.when : '');
  return 'Timeline changed';
}

/* ---------------- storage ---------------- */
class PracticeStore {           // without Firebase: changes stay in this browser tab
  constructor(seed, tlSeed){
    this.kind = 'practice'; this.key = 'mecsr-flatplan-2027-practice'; this.seed = seed; this.tlSeed = tlSeed; this.fns = []; this.tfns = [];
    let d = null; try { d = JSON.parse(sessionStorage.getItem(this.key)); } catch (e) {}
    this.d = d && Array.isArray(d.items) ? d : {items: seed, version: 0, updatedAt: null, log: []};
    if (!Array.isArray(this.d.rows)) { this.d.rows = tlSeed; this.d.tlVersion = 0; }
  }
  canEdit(){ return true; }
  get user(){ return null; }
  dirty(){ return this.d.version > 0 || (this.d.tlVersion || 0) > 0; }
  state(){ return {items: this.d.items, meta: {updatedAt: this.d.updatedAt ? new Date(this.d.updatedAt) : null, version: this.d.version}}; }
  get last(){ return this.state(); }
  subscribe(fn){ this.fns.push(fn); fn(this.state()); }
  emit(){ this.fns.forEach(f => f(this.state())); }
  tlState(){ return {rows: this.d.rows, meta: {version: this.d.tlVersion || 0}}; }
  get lastTimeline(){ return this.tlState(); }
  subscribeTimeline(fn){ this.tfns.push(fn); fn(this.tlState()); }
  save(){ try { sessionStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) {} }
  log(entry){ this.d.log = [entry].concat(this.d.log || []).slice(0, 40); }
  async apply(op){
    const before = this.d.items, after = cleanItems(OPS[op.type](before, op));
    this.log({at: Date.now(), by: '', name: 'Practice', ip: '', summary: summarise(op, before, after), items: after});
    this.d = Object.assign({}, this.d, {items: after, version: this.d.version + 1, updatedAt: Date.now()});
    this.save(); this.emit();
  }
  async applyTimeline(op){
    const before = this.d.rows, after = cleanRows(TOPS[op.type](before, op));
    this.log({at: Date.now(), by: '', name: 'Practice', ip: '', summary: tlSummarise(op, before, after), rows: after});
    this.d.rows = after; this.d.tlVersion = (this.d.tlVersion || 0) + 1;
    this.save(); this.tfns.forEach(f => f(this.tlState()));
  }
  async history(){ return (this.d.log || []).map(x => Object.assign({}, x, {at: new Date(x.at)})); }
  async getSample(id){ return (this.samples && this.samples.get(id)) || null; }
  async putSample(id, data, summary){
    (this.samples = this.samples || new Map()).set(id, {pages: data.pages, name: data.name, byName: 'Practice', at: new Date()});
    this.log({at: Date.now(), by: '', name: 'Practice', ip: '', summary}); this.save();
  }
  async deleteSample(id, summary){ if (this.samples) this.samples.delete(id); this.log({at: Date.now(), by: '', name: 'Practice', ip: '', summary}); this.save(); }
  reset(){
    try { sessionStorage.removeItem(this.key); } catch (e) {}
    this.d = {items: this.seed, version: 0, updatedAt: null, log: [], rows: this.tlSeed, tlVersion: 0};
    this.emit(); this.tfns.forEach(f => f(this.tlState()));
  }
}

class ReadOnlyStore {           // Firebase is configured but could not be reached
  constructor(){ this.kind = 'off'; this.user = null; this.last = null; }
  canEdit(){ return false; }
  async history(){ return []; }
  async getSample(){ return null; }
}

/* The shared plan in Firestore:
     flatplans/2027              the plan (public): items, version, updatedAt, lastChange. No names or IP addresses.
     flatplans/2027/changes/*    the change log (editors only): who, when, IP address, what changed, the plan or timeline after it
     flatplans/2027/meta/timeline  the production timeline (editors only)
     flatplans/2027/notes/*      notes on a page or spread (editors only)
     flatplans/2027/chat/*       the team chat (editors only)
     people/{email}              who can be tagged, and when they last read their mentions (editors only)            */
const LEGACY_KEYS = ['updatedBy', 'updatedName', 'updatedIp'];
const OWNER = 'orient@mecsc.org';   // approves editors outside @mecsc.org / @mecsr.org (rules: isOwner)
class LiveStore {
  static async create(config, seed, tlSeed){
    const base = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
    const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'),
      import(base + 'firebase-firestore.js')]);
    return new LiveStore(appM, authM, fsM, config, seed, tlSeed);
  }
  constructor(appM, authM, fsM, config, seed, tlSeed){
    this.kind = 'live'; this.a = authM; this.f = fsM; this.seed = seed; this.tlSeed = tlSeed;
    const app = appM.initializeApp(config), f = fsM;
    this.auth = authM.getAuth(app); this.db = f.getFirestore(app);
    this.planRef = f.doc(this.db, 'flatplans', PLAN_ID);
    this.changes = f.collection(this.db, 'flatplans', PLAN_ID, 'changes');
    this.tlRef = f.doc(this.db, 'flatplans', PLAN_ID, 'meta', 'timeline');
    this.notesCol = f.collection(this.db, 'flatplans', PLAN_ID, 'notes');
    this.chatCol = f.collection(this.db, 'flatplans', PLAN_ID, 'chat');
    this.user = null; this.editor = false; this.last = null; this.lastTimeline = null; this.subs = []; this.names = {};
    this.collab = null;            // {notes, chat, people, timeline, error}: set by the page
  }
  canEdit(){ return !!(this.user && this.editor); }
  subscribe(fn, onErr){
    return this.f.onSnapshot(this.planRef, snap => {
      if (snap.exists()) {
        const d = snap.data({serverTimestamps: 'estimate'});
        this.legacy = LEGACY_KEYS.some(k => k in d);
        this.last = {items: Array.isArray(d.items) ? d.items : this.seed, meta: {updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate() : null,
          version: d.version || 0, lastChange: d.lastChange || ''}};
      } else this.last = {items: this.seed, meta: {updatedAt: null, version: 0, seed: true}};
      fn(this.last);
      if (this.legacy) this.tidy();
    }, err => { if (onErr) onErr(err); });
  }
  /* The plan record saved before 4 Nov 2026 also carried the last editor's name, email and IP address, which anyone
     could read. The first editor to open this version rewrites it without them (the plan itself does not change). */
  async tidy(){
    if (this.tidied || !this.canEdit()) return;
    this.tidied = true;
    try {
      const u = this.me(), ip = await getIp(), f = this.f, changeRef = f.doc(this.changes);
      await f.runTransaction(this.db, async tx => {
        const snap = await tx.get(this.planRef); if (!snap.exists()) return;
        const d = snap.data(); if (!LEGACY_KEYS.some(k => k in d)) return;
        const items = cleanItems(Array.isArray(d.items) ? d.items : this.seed), version = (d.version || 0) + 1;
        tx.set(this.planRef, {items, version, updatedAt: f.serverTimestamp(), lastChange: changeRef.id});
        tx.set(changeRef, {at: f.serverTimestamp(), by: u.email, name: u.name, ip, action: 'tidy', version, items,
          summary: 'Removed the editor’s name, email and IP address from the public plan record (the plan itself is unchanged)'});
      });
    } catch (e) { console.warn('tidy', e); this.tidied = false; }
  }
  onUser(fn){
    this.a.onAuthStateChanged(this.auth, async u => {
      this.stopCollab();
      this.user = u ? {email: u.email, name: u.displayName || u.email} : null;
      this.editor = u ? await this.checkEditor(u) : false;
      if (this.canEdit()) { this.touchPerson().catch(e => console.warn('people', e)); this.startCollab(); if (this.legacy) this.tidy(); }
      fn();
    });
  }
  async checkEditor(u){
    const email = String(u.email || '').toLowerCase();
    if (/@(mecsc|mecsr)\.org$/.test(email)) return true;
    try { const s = await this.f.getDoc(this.f.doc(this.db, 'editors', email)); return s.exists(); }
    catch (e) { return false; }
  }
  isOwner(){ return !!(this.user && String(this.user.email || '').toLowerCase() === OWNER && this.editor); }
  /* v14 page proofs, editors only: flatplans/2027/proofs/{chunk} = {pages: {"<v14 page>": "data:image/webp;base64,…"}} */
  async proofs(){
    if (!this.canEdit()) return {};
    const snap = await this.f.getDocs(this.f.collection(this.db, 'flatplans', PLAN_ID, 'proofs')), out = {};
    snap.forEach(d => Object.assign(out, (d.data() || {}).pages || {}));
    return out;
  }
  /* people approved by the owner (the "editors" collection) */
  async approved(){
    const snap = await this.f.getDocs(this.f.collection(this.db, 'editors')), out = [];
    snap.forEach(d => { const x = d.data() || {}; out.push({email: d.id, name: x.name || '', addedBy: x.addedBy || '',
      addedAt: x.addedAt && x.addedAt.toDate ? x.addedAt.toDate() : null}); });
    return out.sort((a, b) => a.email.localeCompare(b.email));
  }
  approve(email, name){ const u = this.me(); return this.f.setDoc(this.f.doc(this.db, 'editors', email),
    {name, addedBy: u.email, addedAt: this.f.serverTimestamp()}); }
  unapprove(email){ return this.f.deleteDoc(this.f.doc(this.db, 'editors', email)); }
  signIn(){ const p = new this.a.GoogleAuthProvider(); p.setCustomParameters({prompt: 'select_account'}); return this.a.signInWithPopup(this.auth, p); }
  signOut(){ this.stopCollab(); return this.a.signOut(this.auth); }
  me(){ const u = this.auth.currentUser; if (!u) throw new Error('sign in first'); return {email: u.email, name: u.displayName || u.email}; }
  async apply(op){
    const u = this.me(), ip = await getIp(), f = this.f, changeRef = f.doc(this.changes);
    await f.runTransaction(this.db, async tx => {
      const snap = await tx.get(this.planRef);
      const cur = snap.exists() ? snap.data() : null;
      const before = cur && Array.isArray(cur.items) ? cur.items : this.seed, version = (cur && cur.version || 0) + 1;
      const after = cleanItems(OPS[op.type](cleanItems(before), op));
      const summary = summarise(op, before, after);
      tx.set(this.planRef, {items: after, version, updatedAt: f.serverTimestamp(), lastChange: changeRef.id});
      tx.set(changeRef, {at: f.serverTimestamp(), by: u.email, name: u.name, ip, action: op.type, summary, version, items: after});
    });
  }
  async applyTimeline(op){
    const u = this.me(), ip = await getIp(), f = this.f, changeRef = f.doc(this.changes);
    await f.runTransaction(this.db, async tx => {
      const snap = await tx.get(this.tlRef);
      const cur = snap.exists() ? snap.data() : null;
      const before = cleanRows(cur && Array.isArray(cur.rows) ? cur.rows : this.tlSeed), version = (cur && cur.version || 0) + 1;
      const after = cleanRows(TOPS[op.type](before, op));
      const summary = tlSummarise(op, before, after);
      tx.set(this.tlRef, {rows: after, version, updatedAt: f.serverTimestamp(), lastChange: changeRef.id});
      tx.set(changeRef, {at: f.serverTimestamp(), by: u.email, name: u.name, ip, action: 'timeline-' + op.type, summary, rows: after});
    });
  }
  async history(){
    const f = this.f;
    const qs = await f.getDocs(f.query(this.changes, f.orderBy('at', 'desc'), f.limit(200)));
    return qs.docs.map(d => { const x = d.data({serverTimestamps: 'estimate'}); return Object.assign({}, x, {at: x.at && x.at.toDate ? x.at.toDate() : null}); });
  }
  async changeName(id){
    if (!this.canEdit() || !id) return '';
    if (this.names[id] !== undefined) return this.names[id];
    try { const s = await this.f.getDoc(this.f.doc(this.changes, id)); this.names[id] = s.exists() ? (s.data().name || s.data().by || '') : ''; }
    catch (e) { return ''; }
    return this.names[id];
  }
  /* people, notes, chat and the timeline: editors only, started after sign-in */
  async touchPerson(){
    const u = this.me(), em = u.email.toLowerCase();
    await this.f.setDoc(this.f.doc(this.db, 'people', em), {email: em, name: String(u.name).slice(0, 120), seenAt: this.f.serverTimestamp()}, {merge: true});
  }
  /* add someone who has not signed in yet, so they can be tagged; their own sign-in later fills in their Google name */
  async addPerson(email, name){
    const u = this.me();
    await this.f.setDoc(this.f.doc(this.db, 'people', email), {email, name: String(name).slice(0, 120), addedBy: u.email, addedAt: this.f.serverTimestamp()});
  }
  async markRead(){
    const u = this.me(), em = u.email.toLowerCase();
    await this.f.setDoc(this.f.doc(this.db, 'people', em), {email: em, name: String(u.name).slice(0, 120), readAt: this.f.serverTimestamp()}, {merge: true});
  }
  startCollab(){
    const f = this.f, cb = this.collab || {}, opts = {serverTimestamps: 'estimate'};
    const docs = qs => qs.docs.map(d => Object.assign({id: d.id}, d.data(opts)));
    const fail = what => e => { if (this.canEdit()) { console.warn(what, e); if (cb.error) cb.error(what, e); } };
    this.subs.push(f.onSnapshot(f.query(this.notesCol, f.orderBy('at', 'asc'), f.limit(2000)), qs => cb.notes && cb.notes(docs(qs)), fail('notes')));
    this.subs.push(f.onSnapshot(f.query(this.chatCol, f.orderBy('at', 'desc'), f.limit(200)), qs => cb.chat && cb.chat(docs(qs).reverse()), fail('chat')));
    this.subs.push(f.onSnapshot(f.collection(this.db, 'people'), qs => cb.people && cb.people(docs(qs)), fail('people')));
    this.subs.push(f.onSnapshot(this.tlRef, snap => {
      if (snap.exists()) { const d = snap.data(opts); this.lastTimeline = {rows: Array.isArray(d.rows) ? d.rows : this.tlSeed, meta: {version: d.version || 0}}; }
      else this.lastTimeline = {rows: this.tlSeed, meta: {version: 0, seed: true}};
      if (cb.timeline) cb.timeline(this.lastTimeline);
    }, fail('timeline')));
  }
  stopCollab(){
    this.subs.forEach(un => { try { un(); } catch (e) {} }); this.subs = []; this.lastTimeline = null;
    const cb = this.collab || {}; if (cb.reset) cb.reset();
  }
  async addNote(itemId, text, mentions){
    const u = this.me(), ip = await getIp();
    await this.f.addDoc(this.notesCol, {itemId, text, by: u.email, name: u.name, at: this.f.serverTimestamp(), mentions, ip});
  }
  async sendChat(text, mentions){
    const u = this.me(), ip = await getIp();
    await this.f.addDoc(this.chatCol, {text, by: u.email, name: u.name, at: this.f.serverTimestamp(), mentions, ip});
  }
  msgRef(kind, id){ return this.f.doc(kind === 'chat' ? this.chatCol : this.notesCol, id); }
  async editMsg(kind, id, text, mentions){ await this.f.updateDoc(this.msgRef(kind, id), {text, mentions, editedAt: this.f.serverTimestamp()}); }
  async deleteMsg(kind, id){ await this.f.updateDoc(this.msgRef(kind, id), {text: '', mentions: [], deleted: true, editedAt: this.f.serverTimestamp()}); }
  /* uploaded sample pages: flatplans/2027/samples/{item id}, the PDF turned into one or two page images (editors only) */
  sampleRef(id){ return this.f.doc(this.db, 'flatplans', PLAN_ID, 'samples', id); }
  async getSample(id){ const s = await this.f.getDoc(this.sampleRef(id)); return s.exists() ? s.data({serverTimestamps: 'estimate'}) : null; }
  async putSample(id, data, summary){
    const u = this.me(), ip = await getIp(), f = this.f, b = f.writeBatch(this.db);
    b.set(this.sampleRef(id), {pages: data.pages, name: String(data.name || '').slice(0, 200), by: u.email, byName: u.name, at: f.serverTimestamp(), ip});
    b.set(f.doc(this.changes), {at: f.serverTimestamp(), by: u.email, name: u.name, ip, action: 'sample', summary});
    await b.commit();
  }
  async deleteSample(id, summary){
    const u = this.me(), ip = await getIp(), f = this.f, b = f.writeBatch(this.db);
    b.delete(this.sampleRef(id));
    b.set(f.doc(this.changes), {at: f.serverTimestamp(), by: u.email, name: u.name, ip, action: 'sample', summary});
    await b.commit();
  }
  async resolveNote(id, resolved){
    const u = this.me();
    await this.f.updateDoc(this.msgRef('note', id), {resolved: !!resolved, resolvedBy: u.email, resolvedAt: this.f.serverTimestamp()});
  }
}

/* ---------------- state and rendering ---------------- */
let store = null, editing = false, lastDrag = 0, sorts = [], dragging = false, renderPending = false;
const S = {items: [], meta: {}, L: layout([])};
function setState(items, meta){
  S.items = cleanItems(items || []); if (meta) S.meta = meta; S.L = layout(S.items);
  render();
  if (el('pv').open) show(cur);
}
function render(){
  if (dragging) { renderPending = true; return; }
  renderSummary(); renderLegend(); if (editing) renderEdit(); else renderView(); renderWarn(); renderMast(); renderToolbar();
}
const isLiveEditor = () => !!(store && store.kind === 'live' && store.canEdit());
function noteCount(id){ return isLiveEditor() ? (C.byItem.get(id) || 0) : 0; }

function renderMast(){
  const d = S.meta && S.meta.updatedAt;
  el('upd').textContent = 'Updated ' + (d ? fmtDate(d) : seedDate());
}
function seedDate(){
  const a = (window.PLAN_SEED && window.PLAN_SEED.asOf) || '';
  const d = a ? new Date(a + 'T12:00:00+04:00') : null; return d ? fmtDate(d) : '';
}
function renderSummary(){
  const L = S.L, t = L.stats;
  const cell = (n, d) => '<td class="num">' + (d > 0 ? n + '<span class="pc">' + pct(n, d) + '</span>' : '<span class="pc">–</span>') + '</td>';
  const dash = '<td class="num"><span class="pc">–</span></td>';
  const sale = x => x.saleable > 0 ? '<td class="num">' + x.open + '</td><td class="num">' + x.sold + '</td><td class="num">' + pct(x.sold, x.saleable) + '</td>'
    : dash + dash + dash;
  el('sumBody').innerHTML = L.secs.map(s => '<tr><td>' + esc(secName(s.section)) + '</td><td class="num">' + pages(s.from, s.to) +
    '</td><td class="num">' + s.pp + '</td>' + sale(s) + cell(s.content, s.pp) + cell(s.layout, s.pp) + '</tr>').join('');
  el('sumFoot').innerHTML = '<td>Total so far</td><td></td><td class="num">' + L.total + '</td>' + sale(t) +
    cell(t.content, L.total) + cell(t.layout, L.total);
  renderStats();
}
function renderStats(){
  const L = S.L, t = L.stats, T = L.total;
  const card = (cls, label, big, line, frac) => '<div class="stat ' + cls + '"><div class="sl">' + label + '</div><div class="sv">' + big +
    '</div><div class="sd">' + line + '</div>' + (frac == null ? '' : '<div class="sb"><i style="width:' + Math.round(clamp(frac, 0, 1) * 100) + '%"></i></div>') + '</div>';
  el('stats').innerHTML =
    card('sold', 'Sold', pct(t.sold, t.saleable), t.sold + ' of ' + t.saleable + ' saleable pages', t.saleable ? t.sold / t.saleable : 0) +
    card('content', 'Content done', pct(t.content, T), t.content + ' of ' + T + ' pages · ' + (T - t.content) + ' to go', T ? t.content / T : 0) +
    card('layout', 'Layout done', pct(t.layout, T), t.layout + ' of ' + T + ' pages · ' + (T - t.layout) + ' to go', T ? t.layout / T : 0) +
    (t.lockedItems ? card('locked', 'Locked', t.locked + ' pp', t.lockedItems + (t.lockedItems > 1 ? ' items are' : ' item is') + ' final', T ? t.locked / T : 0) : '') +
    card('bal ' + (T % 2 ? 'bad' : 'good'), 'Page balance', T % 2 ? 'Odd' : 'Even', T + ' pages' + (T % 2 ? ': add or remove 1 page' : ''), null);
}
/* the key doubles as a filter: click a label to grey out every page that does not match it; click it again to show all */
let filt = null;
const FILTERS = {open: it => it.open, sold: it => !!it.sponsor && !it.open, content: (it, k) => k < it.contentPages, layout: (it, k) => k < it.layoutPages,
  locked: it => it.locked, notes: it => noteCount(it.id) > 0};
function renderLegend(){
  if (filt === 'notes' && !isLiveEditor()) filt = null;
  const b = (f, cls, inner) => '<button type="button" class="lg' + (cls ? ' ' + cls : '') + (filt === f ? ' on' : '') + '" data-filter="' + f +
    '" aria-pressed="' + (filt === f) + '" title="' + (filt === f ? 'Show all pages' : 'Show only these pages') + '">' + inner + '</button>';
  el('legend').innerHTML = b('open', 'lg-open', '<span class="badge">OPEN</span>Still for sale') +
    b('sold', 'lg-sold', '<span class="badge sold">SOLD</span>Sold to a client') +
    b('content', '', '<i class="mk c">C</i>Content done') + b('layout', '', '<i class="mk l">L</i>Layout done') +
    b('locked', 'lg-lock', LOCK_SVG + 'Locked') + (isLiveEditor() ? b('notes', '', '<i class="nc">1</i>Open notes') : '') +
    (filt ? '<button type="button" class="lg lg-clear" data-filter="">Show all</button>' : '');
}
el('legend').addEventListener('click', ev => {
  const x = ev.target.closest('[data-filter]'); if (!x) return;
  const f = x.dataset.filter; filt = f && filt !== f ? f : null; render();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && filt && !document.querySelector('dialog[open]')) { filt = null; render(); }
});
function chipHTML(p, tag){
  const it = S.L.P2I[p]; if (!it) return '';
  const k = p - it.from, c = k < it.contentPages, l = k < it.layoutPages, nn = p === it.from ? noteCount(it.id) : 0, lab = shortLabel(it);
  const cls = 'pg' + (it.open ? ' open' : '') + (it.locked ? ' locked' : '') + (c || l ? ' marked' : '') +
    (filt && FILTERS[filt] && !FILTERS[filt](it, k) ? ' dim' : '');
  const marks = (it.locked || nn ? '<span class="tr">' + (nn ? '<i class="nc">' + nn + '</i>' : '') + (it.locked ? LOCK_SVG : '') + '</span>' : '') +
    (c || l ? '<span class="br">' + (c ? '<i class="mk c">C</i>' : '') + (l ? '<i class="mk l">L</i>' : '') + '</span>' : '');
  const inner = '<span class="n">' + p + '</span><span class="t">' + hyph(lab) + '</span>' + marks;
  const style = ' style="--c:' + (TYPE_COLOR[it.type] || '#8A9099') + '"';
  if (tag === 'div') return '<div class="' + cls + '"' + style + '>' + inner + '</div>';
  const extra = (it.open ? ', OPEN, still for sale' : '') + (c ? ', content done' : '') + (l ? ', layout done' : '') + (it.locked ? ', locked' : '') +
    (nn ? ', ' + nn + (nn > 1 ? ' open notes' : ' open note') : '');
  return '<button class="' + cls + '" type="button"' + style + ' data-page="' + p + '" title="' + esc('p' + p + ' · ' + it.item + extra.replace(/^, /, ' · ').replace(/, /g, ' · ')) +
    '" aria-label="' + esc('Page ' + p + ', ' + lab + extra) + '">' + inner + '</button>';
}
function bandLabel(s, edit){
  return '<div class="bandlab">' + (edit ? '<span class="grip" title="Drag to move this section" aria-hidden="true">&#8942;&#8942;</span>' : '') +
    esc(secName(s.section)) + '<span class="bp">pp ' + pages(s.from, s.to) + ' · ' + s.pp + ' pp</span>' +
    (edit ? '<button class="addbtn" type="button" data-add="' + esc(s.section) + '">+ Add page</button>' : '') + '</div>';
}
function renderView(){
  sorts.forEach(x => x.destroy()); sorts = [];
  const b = el('board'); b.classList.remove('editing');
  b.innerHTML = S.L.secs.map(s => {
    let html = '', p = s.from;
    if (p === 1) { html += '<div class="spread">' + chipHTML(1) + '</div>'; p = 2; }
    while (p <= s.to) {
      if (p + 1 <= s.to && p % 2 === 0) { html += '<div class="spread">' + chipHTML(p) + chipHTML(p + 1) + '</div>'; p += 2; }
      else { html += '<div class="spread">' + chipHTML(p) + '</div>'; p += 1; }
    }
    return '<div class="bandrow">' + bandLabel(s, false) + '<div class="spreads">' + html + '</div></div>';
  }).join('');
}
function blockHTML(it){
  let inner = '';
  if (it.pp <= 4) for (let p = it.from; p <= it.to; p++) inner += chipHTML(p, 'div');
  else inner = chipHTML(it.from, 'div') + '<div class="more">+' + (it.pp - 2) + '<br>' + it.pp + ' pp</div>' + chipHTML(it.to, 'div');
  const split = S.L.warnings.split.indexOf(it) >= 0;
  const tip = 'pp ' + pages(it.from, it.to) + ' · ' + it.item + (split ? ' · starts on a right-hand page, so the spread is split' : '') +
    (it.locked ? ' · locked: unlock it in the page editor to move or change it' : '');
  return '<div class="blk' + (it.open ? ' open' : '') + (split ? ' split' : '') + (it.locked ? ' locked' : '') + '" data-id="' + esc(it.id) +
    '" tabindex="0" role="button" title="' + esc(tip) + '" aria-label="' + esc('Pages ' + pages(it.from, it.to) + ', ' + it.item +
    (it.locked ? ', locked. Enter to edit' : '. Drag to move; Enter to edit')) + '">' + inner + '</div>';
}
function renderEdit(){
  const b = el('board'); b.classList.add('editing');
  b.innerHTML = S.L.secs.map(s => '<div class="bandrow" data-section="' + esc(s.section) + '">' + bandLabel(s, true) +
    '<div class="blks" data-section="' + esc(s.section) + '">' + s.items.map(blockHTML).join('') + '</div></div>').join('');
  setupSortable();
}
function renderWarn(){
  const w = S.L.warnings, parts = [];
  const link = it => '<a data-goto="' + esc(it.id) + '">' + esc(shortLabel(it)) + ' pp ' + pages(it.from, it.to) + '</a>';
  if (editing && w.split.length) parts.push('<b>' + w.split.length + (w.split.length > 1 ? ' spreads are' : ' spread is') +
    ' split</b> (a two-page item starts on a right-hand page): ' + w.split.map(link).join(''));
  if (editing && w.odd) parts.push('<b>The page count is odd (' + S.L.total + ').</b> Add or remove one page.');
  if (w.moved.length) parts.push('<b>' + w.moved.length + ' locked ' + (w.moved.length > 1 ? 'items have' : 'item has') +
    ' moved since locking:</b> ' + w.moved.map(it => '<a data-goto="' + esc(it.id) + '">' + esc(shortLabel(it)) + ' p' + it.lockedFrom + ' → p' + it.from + '</a>').join(''));
  el('warn').innerHTML = parts.join('<br>'); el('warn').hidden = !parts.length;
}
let lastName = {id: null, name: ''};
function refreshLastName(){
  const id = S.meta && S.meta.lastChange;
  if (!id || !isLiveEditor() || lastName.id === id) return;
  lastName = {id, name: ''};
  store.changeName(id).then(n => { if (lastName.id === id) { lastName.name = n; renderToolbar(); } });
}
function renderToolbar(){
  const k = store ? store.kind : 'off', u = store && store.user, can = !!(store && store.canEdit());
  refreshLastName();
  el('btnSignIn').hidden = !(k === 'live' && !u);
  el('btnEdit').hidden = !can;
  el('btnEdit').textContent = editing ? 'Done' : 'Edit plan';
  el('btnEdit').classList.toggle('on', editing);
  el('btnHistory').hidden = !can;
  el('btnPeople').hidden = !(store && store.isOwner && store.isOwner());
  el('btnReset').hidden = !(k === 'practice' && store.dirty());
  el('btnMentions').hidden = !isLiveEditor();
  const ub = el('userBox'); ub.hidden = !(k === 'live' && u);
  if (u) ub.innerHTML = esc(u.name || u.email) + (can ? '' : ' · <span style="color:var(--red)">view only</span>') + ' · <a id="signOut">Sign out</a>';
  let s = k === 'live' ? '<span class="pill live">Live</span>' : k === 'practice' ? '<span class="pill practice">Practice</span>' : '<span class="pill off">Saved copy</span>';
  const m = S.meta || {};
  if (k === 'practice') s += m.version ? 'changes stay in this browser tab' : 'try it: changes stay in this browser tab';
  else if (m.updatedAt) s += 'Last change <b>' + esc(fmtTime(m.updatedAt)) + '</b>' +
    (isLiveEditor() && lastName.id === m.lastChange && lastName.name ? ' by <b>' + esc(lastName.name) + '</b>' : '');
  el('status').innerHTML = s;
  el('tlStatus').innerHTML = el('status').innerHTML.replace(/Last change.*$/, '');
  renderMentionsBtn();
}

/* ---------------- editing ---------------- */
async function act(op){
  if (!store || !store.canEdit()) return false;
  let after;
  try { after = OPS[op.type](S.items, op); } catch (e) { toast('Not changed: ' + e.message, true); render(); return false; }
  const prev = {items: S.items, meta: S.meta};
  setState(after);                                   // show it at once; the saved plan follows
  try { await store.apply(op); return true; }
  catch (e) {
    console.warn(e); toast('Not saved: ' + friendly(e), true);
    const back = store.last || prev; setState(back.items, back.meta); return false;
  }
}
function setupSortable(){
  sorts.forEach(x => x.destroy()); sorts = [];
  if (!window.Sortable) return;
  const start = () => { dragging = true; };
  document.querySelectorAll('#board .blks').forEach(c => sorts.push(window.Sortable.create(c, {
    group: 'plan-items', draggable: '.blk', filter: '.locked', preventOnFilter: false, animation: 140, ghostClass: 'ghost', chosenClass: 'chosen',
    forceFallback: true, fallbackOnBody: true, delay: 180, delayOnTouchOnly: true, fallbackTolerance: 4, scroll: true, bubbleScroll: true,
    onStart: start, onEnd: onDropItem})));
  sorts.push(window.Sortable.create(el('board'), {draggable: '.bandrow', handle: '.grip', animation: 140, ghostClass: 'ghost', forceFallback: true,
    fallbackOnBody: true, scroll: true, onStart: start, onEnd: onDropSection}));
}
function onDropItem(e){
  lastDrag = Date.now();
  const moved = !(e.from === e.to && e.oldIndex === e.newIndex), nxt = e.item.nextElementSibling;
  const op = moved ? {type: 'move', id: e.item.dataset.id, beforeId: nxt && nxt.dataset.id ? nxt.dataset.id : null, section: e.to.dataset.section} : null;
  setTimeout(() => { dragging = false; renderPending = false; if (op) act(op); else render(); }, 0);
}
function onDropSection(e){
  lastDrag = Date.now();
  const nxt = e.item.nextElementSibling;
  const op = e.oldIndex === e.newIndex ? null : {type: 'moveSection', section: e.item.dataset.section, beforeSection: nxt ? nxt.dataset.section : null};
  setTimeout(() => { dragging = false; renderPending = false; if (op) act(op); else render(); }, 0);
}
async function setEditing(on){
  if (on) { try { await loadScript('lib/Sortable.min.js'); } catch (e) { toast('Drag and drop could not load; use Earlier and Later in the page editor.', true); } }
  editing = !!on && !!(store && store.canEdit()); render();
}
function newItemAfter(afterId, section){
  const ref = S.items.find(x => x.id === afterId);
  return {id: newId(), section: section || (ref && ref.section) || '', item: 'New page', type: ref ? ref.type : 'Ad', pp: 1,
    sponsor: 'OPEN', sample: null, note: '', contentPages: 0, layoutPages: 0, locked: false, lockedFrom: null};
}
async function addAfter(afterId, section){
  const item = newItemAfter(afterId, section);
  if (await act({type: 'insert', afterId, item})) openEditor(item.id);
}

/* the page editor */
const ed = el('ed'); let edId = null, edPP = 1;
const ED_FIELDS = ['fName', 'fSection', 'fNewSection', 'fType', 'fPP', 'ppDown', 'ppUp', 'fClient', 'fSample', 'fNote', 'fPdfBtn', 'fPdfDel'];
function progHTML(kind, n, pp){
  const id = kind === 'content' ? 'fContent' : 'fLayout', label = kind === 'content' ? 'Content done' : 'Layout done';
  if (pp === 1 || (pp === 2 && n !== 1)) return '<label class="chk"><input type="checkbox" id="' + id + '"' + (n >= pp ? ' checked' : '') + '> ' + label + '</label>';
  return '<input type="number" id="' + id + '" min="0" max="' + pp + '" step="1" value="' + n + '" aria-label="' + label + ': pages done">' +
    '<span class="status">of ' + pp + ' pages</span><button class="nb" type="button" data-allof="' + id + '">All</button>';
}
function readProg(id, pp){
  const x = el(id); if (!x) return 0;
  return x.type === 'checkbox' ? (x.checked ? pp : 0) : clamp(parseInt(x.value, 10) || 0, 0, pp);
}
function renderProg(c, l){
  el('fContentRow').innerHTML = progHTML('content', clamp(c, 0, edPP), edPP);
  el('fLayoutRow').innerHTML = progHTML('layout', clamp(l, 0, edPP), edPP);
  applyLock();
}
function applyLock(){
  const lock = el('fLocked').checked, it = S.items.find(x => x.id === edId), wasLocked = !!(it && it.locked), off = lock && wasLocked;
  ED_FIELDS.forEach(id => { el(id).disabled = off; });
  document.querySelectorAll('#ed input[name=st], #fContentRow input, #fContentRow button, #fLayoutRow input, #fLayoutRow button').forEach(x => { x.disabled = off; });
  el('edDelete').disabled = off;
  const i = S.items.findIndex(x => x.id === edId);
  el('edEarlier').disabled = off || i <= 0; el('edLater').disabled = off || i >= S.items.length - 1;
  el('edLockNote').hidden = !off;
}
function openEditor(id){
  const it = S.L.items.find(x => x.id === id); if (!it) return;
  edId = id; edPP = it.pp;
  el('edTitle').textContent = 'Pages ' + pages(it.from, it.to);
  el('edMeta').textContent = secName(it.section) + ' · ' + it.pp + (it.pp === 1 ? ' page' : ' pages') + (S.L.warnings.split.indexOf(it) >= 0 ? ' · spread split' : '') +
    (it.locked ? ' · locked' : '');
  el('fName').value = it.item;
  const secs = []; S.items.forEach(x => { if (secs.indexOf(x.section) < 0) secs.push(x.section); });
  el('fSection').innerHTML = secs.map(s => '<option value="' + esc(s) + '">' + esc(secName(s)) + '</option>').join('') + '<option value="__new">New section…</option>';
  el('fSection').value = it.section; el('fNewSection').hidden = true; el('fNewSection').value = '';
  const types = ORDER.indexOf(it.type) < 0 ? ORDER.concat([it.type]) : ORDER;
  el('fType').innerHTML = types.map(t => '<option value="' + esc(t) + '">' + esc(TYPE_LABEL[t] || t) + '</option>').join('');
  el('fType').value = it.type;
  el('fPP').value = it.pp;
  const st = it.sponsor === 'OPEN' ? 'open' : it.sponsor ? 'sold' : 'house';
  document.querySelectorAll('#ed input[name=st]').forEach(r => { r.checked = r.value === st; });
  el('fClient').value = st === 'sold' ? it.sponsor : ''; el('fClient').hidden = st !== 'sold';
  el('fSample').value = it.sample ? it.sample[0] : '';
  el('fNote').value = it.note || '';
  el('fLocked').checked = !!it.locked;
  el('edLockNote').textContent = 'Locked at p' + (it.lockedFrom || it.from) + '. Untick Lock to change, move or delete it.';
  renderProg(it.contentPages, it.layoutPages);
  el('edConfirm').hidden = true;
  renderPdfRow(); if (canSample()) fetchSample(id, true).then(() => { if (edId === id) renderPdfRow(); });
  const n = noteCount(id); el('edNotes').hidden = !isLiveEditor(); el('edNotes').textContent = 'Notes' + (n ? ' (' + n + ')' : '');
  if (!ed.open) ed.showModal();
}
function readEditor(){
  let section = el('fSection').value;
  if (section === '__new') section = el('fNewSection').value.trim();
  const st = (document.querySelector('#ed input[name=st]:checked') || {}).value || 'house';
  const pp = clamp(parseInt(el('fPP').value, 10) || 1, 1, 400);
  const s0 = parseInt(el('fSample').value, 10);
  return {item: el('fName').value.trim(), section, type: el('fType').value, pp,
    sponsor: st === 'open' ? 'OPEN' : st === 'sold' ? el('fClient').value.trim() : '',
    sample: s0 > 0 ? [s0, Math.min(SAMPLE_PAGES, s0 + pp - 1)] : null, note: el('fNote').value.trim(),
    contentPages: Math.min(readProg('fContent', edPP), pp), layoutPages: Math.min(readProg('fLayout', edPP), pp), locked: el('fLocked').checked, _st: st};
}
el('edForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const it = S.items.find(x => x.id === edId); if (!it) { ed.close(); return; }
  const f = readEditor();
  if (!f.item) { el('fName').focus(); return; }
  if (!f.section) { el('fNewSection').focus(); return; }
  if (f._st === 'sold' && !f.sponsor) { el('fClient').focus(); return; }
  delete f._st;
  const changed = Object.keys(f).some(k => JSON.stringify(f[k]) !== JSON.stringify(it[k] == null ? (k === 'sample' ? null : '') : it[k]));
  ed.close();
  if (changed) act({type: 'update', id: edId, fields: f});
});
/* the sample PDF for an item: one page, or two for a spread (two pages, or one wide page that is cut in half) */
let pdfBusy = false;
function renderPdfRow(msg){
  const on = canSample(); el('fPdfK').hidden = el('fPdfRow').hidden = !on; if (!on) return;
  const it = S.items.find(x => x.id === edId), d = SMP.get(edId), del = el('fPdfDel');
  delete del.dataset.sure; del.textContent = 'Delete';
  let info;
  if (msg) info = esc(msg);
  else if (d === undefined) info = 'Checking…';
  else if (!d) info = 'No PDF uploaded. One page, or two for a spread.';
  else info = '<b>' + esc(d.name || 'Sample') + '</b> · ' + d.pages.length + (d.pages.length > 1 ? ' pages' : ' page') +
    (d.byName ? ' · ' + esc(d.byName) : '') + (d.at ? ' · ' + esc(fmtDate(new Date(tsMs(d.at)))) : '');
  el('fPdfInfo').innerHTML = info;
  el('fPdfBtn').textContent = d ? 'Replace PDF' : 'Upload PDF';
  del.hidden = !d;
  const off = pdfBusy || !!(it && it.locked && el('fLocked').checked);
  el('fPdfBtn').disabled = off; del.disabled = off;
}
function toJpeg(c, w, q){
  const k = Math.min(1, w / c.width), o = document.createElement('canvas');
  o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
  const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0, o.width, o.height);
  return o.toDataURL('image/jpeg', q);
}
function fitPages(cs){                                     // keep the whole record under Firestore's 1 MB limit
  for (const w of [1240, 1080, 920, 780, 640]) for (const q of [0.86, 0.76, 0.66]) {
    const out = cs.map(c => toJpeg(c, w, q));
    if (out.reduce((a, s) => a + s.length, 0) <= 900000) return out;
  }
  throw new Error('the PDF pages are too detailed to store; try a smaller or simpler PDF');
}
async function pdfCanvases(file, want){
  await loadScript('lib/pdf.min.js');
  const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  const pdf = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise, out = [];
  for (let i = 1; i <= pdf.numPages && out.length < want; i++) {
    const pg = await pdf.getPage(i), v1 = pg.getViewport({scale: 1}), wide = v1.width > v1.height * 1.15;
    const vp = pg.getViewport({scale: (wide ? 2480 : 1240) / v1.width}), c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await pg.render({canvasContext: x, viewport: vp}).promise;
    if (wide && want - out.length >= 2) {                     // a spread on one wide page: left half, right half
      const h = Math.floor(c.width / 2);
      [0, h].forEach(x0 => { const s = document.createElement('canvas'); s.width = h; s.height = c.height;
        s.getContext('2d').drawImage(c, x0, 0, h, c.height, 0, 0, h, c.height); out.push(s); });
    } else out.push(c);
  }
  if (!out.length) throw new Error('the PDF has no pages');
  return out;
}
el('fPdfBtn').addEventListener('click', () => el('fPdf').click());
el('fPdf').addEventListener('change', async () => {
  const file = el('fPdf').files[0], id = edId, it = S.items.find(x => x.id === id); el('fPdf').value = '';
  if (!file || !it || !store) return;
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { toast('Not uploaded: choose a PDF file', true); return; }
  if (file.size > 60 * 1024 * 1024) { toast('Not uploaded: the PDF is over 60 MB', true); return; }
  pdfBusy = true; renderPdfRow('Reading the PDF…');
  try {
    const cs = await pdfCanvases(file, Math.min(2, it.pp));
    if (edId === id) renderPdfRow('Saving…');
    const pagesOut = fitPages(cs), L = S.L.items.find(x => x.id === id) || it;
    await store.putSample(id, {pages: pagesOut, name: file.name},
      'Uploaded the sample PDF "' + file.name + '" for "' + it.item + '" pp ' + pages(L.from, L.to) + ' (' + pagesOut.length + (pagesOut.length > 1 ? ' pages)' : ' page)'));
    SMP.set(id, {pages: pagesOut, name: file.name, byName: store.user ? store.user.name : 'Practice', at: new Date()});
    toast('Sample PDF uploaded');
  } catch (e) { console.warn(e); toast('Not uploaded: ' + friendly(e), true); }
  finally { pdfBusy = false; if (edId === id && ed.open) renderPdfRow(); }
});
el('fPdfDel').addEventListener('click', async () => {
  const b = el('fPdfDel'), id = edId, it = S.L.items.find(x => x.id === id), d = SMP.get(id); if (!it || !d) return;
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirm delete'; return; }
  pdfBusy = true; renderPdfRow('Deleting…');
  try {
    await store.deleteSample(id, 'Deleted the sample PDF "' + (d.name || '') + '" for "' + it.item + '" pp ' + pages(it.from, it.to));
    SMP.set(id, null); toast('Sample PDF deleted');
  } catch (e) { console.warn(e); toast('Not deleted: ' + friendly(e), true); }
  finally { pdfBusy = false; if (edId === id && ed.open) renderPdfRow(); }
});
el('fSection').addEventListener('change', () => { const n = el('fSection').value === '__new'; el('fNewSection').hidden = !n; if (n) el('fNewSection').focus(); });
document.querySelectorAll('#ed input[name=st]').forEach(r => r.addEventListener('change', () => {
  const sold = r.value === 'sold' && r.checked; el('fClient').hidden = !sold; if (sold) el('fClient').focus();
}));
function setPP(n){
  const c = readProg('fContent', edPP), l = readProg('fLayout', edPP);
  edPP = clamp(n, 1, 400); el('fPP').value = edPP; renderProg(c, l);
}
el('ppDown').addEventListener('click', () => setPP((parseInt(el('fPP').value, 10) || 1) - 1));
el('ppUp').addEventListener('click', () => setPP((parseInt(el('fPP').value, 10) || 1) + 1));
el('fPP').addEventListener('change', () => setPP(parseInt(el('fPP').value, 10) || 1));
el('fLocked').addEventListener('change', () => { applyLock(); renderPdfRow(); });
el('ed').addEventListener('click', ev => { const b = ev.target.closest('[data-allof]'); if (b) el(b.dataset.allof).value = edPP; });
el('edClose').addEventListener('click', () => ed.close());
el('edCancel').addEventListener('click', () => ed.close());
el('edDelete').addEventListener('click', () => {
  const it = S.L.items.find(x => x.id === edId); if (!it) return;
  el('edConfirmText').textContent = 'Delete "' + it.item + '" (pp ' + pages(it.from, it.to) + ')? Every page after it moves up ' + it.pp + '.';
  el('edConfirm').hidden = false;
});
el('edNo').addEventListener('click', () => { el('edConfirm').hidden = true; });
el('edYes').addEventListener('click', () => { const id = edId; ed.close(); act({type: 'remove', id}); });
el('edEarlier').addEventListener('click', async () => {
  const i = S.items.findIndex(x => x.id === edId); if (i <= 0) return;
  const prev = S.items[i - 1];
  if (await act({type: 'move', id: edId, beforeId: prev.id, section: prev.section})) openEditor(edId);
});
el('edLater').addEventListener('click', async () => {
  const i = S.items.findIndex(x => x.id === edId); if (i < 0 || i >= S.items.length - 1) return;
  const next = S.items[i + 1], after = S.items[i + 2];
  if (await act({type: 'move', id: edId, beforeId: after ? after.id : null, section: next.section})) openEditor(edId);
});
el('edAdd').addEventListener('click', () => { const id = edId; ed.close(); addAfter(id); });
el('edNotes').addEventListener('click', () => {
  const it = S.L.items.find(x => x.id === edId); ed.close();
  if (it) { openViewer(it.from, null); setTimeout(() => { const t = document.querySelector('#pvMain .sitem[data-id="' + CSS.escape(it.id) + '"] textarea'); if (t) t.focus(); }, 50); }
});

/* history */
const hist = el('hist'); let histRows = [];
async function openHistory(){
  el('histBody').innerHTML = '<tr><td colspan="5" class="m">Loading…</td></tr>'; el('histMeta').textContent = '';
  if (!hist.open) hist.showModal();
  try {
    histRows = await store.history();
    let planSeen = false, tlSeen = false;
    el('histMeta').textContent = histRows.length ? histRows.length + (histRows.length === 1 ? ' change' : ' changes') + ', newest first' : 'No changes yet';
    el('histBody').innerHTML = histRows.map((r, k) => {
      let btn = '';
      if (Array.isArray(r.items)) { if (planSeen) btn = '<button class="nb" type="button" data-restore="' + k + '">Restore plan</button>'; planSeen = true; }
      else if (Array.isArray(r.rows)) { if (tlSeen) btn = '<button class="nb" type="button" data-restore="' + k + '">Restore timeline</button>'; tlSeen = true; }
      return '<tr><td class="m">' + (r.at ? esc(fmtTime(r.at)) : '—') + '</td><td>' + esc(r.name || r.by || '') +
        (r.by && r.name !== r.by ? '<br><span class="m">' + esc(r.by) + '</span>' : '') + '</td><td class="m">' + esc(r.ip || '—') + '</td><td>' +
        esc(r.summary || '') + '</td><td>' + btn + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="m">No changes yet</td></tr>';
  } catch (e) { el('histBody').innerHTML = '<tr><td colspan="5">' + esc('Could not load the history: ' + friendly(e)) + '</td></tr>'; }
}
el('histBody').addEventListener('click', ev => {
  const b = ev.target.closest('[data-restore]'); if (!b) return;
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirm restore'; b.classList.add('danger'); return; }
  const r = histRows[+b.dataset.restore]; hist.close();
  const when = r.at ? fmtTime(r.at) : '';
  if (Array.isArray(r.items)) act({type: 'restore', items: r.items, when});
  else if (Array.isArray(r.rows)) actTimeline({type: 'restore', rows: r.rows, when});
});
el('histClose').addEventListener('click', () => hist.close());

/* ---------------- approved people (owner only): editors outside @mecsc.org and @mecsr.org ---------------- */
const ppl = el('ppl');
async function renderPeople(){
  el('pplBody').innerHTML = '<tr><td colspan="4" class="m">Loading…</td></tr>';
  try {
    const list = await store.approved();
    el('pplMeta').textContent = list.length ? list.length + (list.length === 1 ? ' person' : ' people') + ' approved' : 'Nobody approved yet';
    el('pplBody').innerHTML = list.length ? list.map(p => '<tr><td>' + esc(p.email) + '</td><td>' + esc(p.name) + '</td><td class="m">' +
      (p.addedAt ? esc(fmtTime(p.addedAt)) : '—') + '</td><td><button class="nb" type="button" data-unapprove="' + esc(p.email) + '">Remove</button></td></tr>').join('')
      : '<tr><td colspan="4" class="m">Staff with @mecsc.org or @mecsr.org Google accounts need no approval.</td></tr>';
  } catch (e) { el('pplBody').innerHTML = '<tr><td colspan="4" class="m">Could not load: ' + esc(friendly(e)) + '</td></tr>'; }
}
el('btnPeople').addEventListener('click', () => { if (!ppl.open) ppl.showModal(); renderPeople(); el('pplEmail').focus(); });
el('pplClose').addEventListener('click', () => ppl.close());
el('pplForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const email = el('pplEmail').value.trim().toLowerCase(), name = el('pplName').value.trim();
  if (!/^[^@\/\s]+@[^@\/\s]+\.[a-z]{2,}$/.test(email)) { toast('Not added: enter a valid email', true); return; }
  if (/@(mecsc|mecsr)\.org$/.test(email)) { toast('No approval needed: @mecsc.org and @mecsr.org accounts can already sign in'); return; }
  if (!name) { toast('Not added: enter their name', true); return; }
  try { await store.approve(email, name.slice(0, 120)); el('pplEmail').value = el('pplName').value = ''; toast('Approved ' + email + '. They can sign in now.'); renderPeople(); }
  catch (e) { toast('Not added: ' + friendly(e), true); }
});
el('pplBody').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-unapprove]'); if (!b) return;
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirm remove'; b.classList.add('danger');
    setTimeout(() => { if (document.contains(b)) { delete b.dataset.sure; b.textContent = 'Remove'; b.classList.remove('danger'); } }, 4000); return; }
  try { await store.unapprove(b.dataset.unapprove); toast('Removed ' + b.dataset.unapprove + '. They lose access at their next sign-in, within an hour at most.'); renderPeople(); }
  catch (e) { toast('Not removed: ' + friendly(e), true); }
});

/* toolbar */
el('btnEdit').addEventListener('click', () => setEditing(!editing));
el('btnHistory').addEventListener('click', openHistory);
el('btnReset').addEventListener('click', () => {
  const b = el('btnReset');
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirm reset'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Reset practice'; }, 4000); return; }
  delete b.dataset.sure; b.textContent = 'Reset practice'; if (store.reset) store.reset();
});
el('btnSignIn').addEventListener('click', async () => {
  try { await store.signIn(); } catch (e) { toast('Not signed in: ' + friendly(e), true); }
});
el('userBox').addEventListener('click', async ev => {
  if (ev.target.id !== 'signOut') return;
  editing = false; try { await store.signOut(); } catch (e) {} render();
});
el('btnXlsx').addEventListener('click', exportExcel);
el('btnPdf').addEventListener('click', exportPdf);
el('warn').addEventListener('click', ev => {
  const a = ev.target.closest('[data-goto]'); if (!a) return;
  const it = S.L.items.find(x => x.id === a.dataset.goto); if (!it) return;
  const b = document.querySelector('.blk[data-id="' + CSS.escape(it.id) + '"]') || document.querySelector('.pg[data-page="' + it.from + '"]');
  if (b) { b.scrollIntoView({behavior: 'smooth', block: 'center'}); b.focus(); }
});

/* the board: view mode opens sample pages (with notes and statuses for editors), edit mode opens the page editor */
el('board').addEventListener('click', ev => {
  if (editing) {
    const add = ev.target.closest('[data-add]');
    if (add) { const sec = add.dataset.add; const its = S.items.filter(x => x.section === sec); addAfter(its.length ? its[its.length - 1].id : null, sec); return; }
    const b = ev.target.closest('.blk'); if (b && Date.now() - lastDrag > 350) openEditor(b.dataset.id);
    return;
  }
  const c = ev.target.closest('.pg[data-page]'); if (!c) return;
  if (store && store.kind === 'live' && !store.canEdit()) {
    if (!store.user) { toast('Sign in with your MECSR Google account to see page details'); store.signIn().catch(e => toast('Not signed in: ' + friendly(e), true)); }
    else toast('This account cannot see page details. Ask ' + OWNER + ' to approve it.', true);
    return;
  }
  openViewer(+c.dataset.page, c);
});
el('board').addEventListener('keydown', ev => {
  if (!editing || ev.key !== 'Enter') return;
  const b = ev.target.closest('.blk'); if (b) { ev.preventDefault(); openEditor(b.dataset.id); }
});

/* ---------------- sample pages from the v14 book, with statuses and notes beside them ---------------- */
let PROOFS = null, cur = 1, lastChip = null;
let proofsFor = null;                 // the account the proofs were loaded for
function loadProofs(){
  const who = store && store.user ? store.user.email : '';
  if (PROOFS && proofsFor === who) return;
  PROOFS = null; proofsFor = who;
  const got = store && store.proofs ? store.proofs() : Promise.resolve({});
  got.then(p => { if (proofsFor === who) { PROOFS = p || {}; if (pv.open) show(cur); } })
    .catch(e => { console.warn('proofs', e); if (proofsFor === who) { PROOFS = {}; if (pv.open) show(cur); } });
}
function spreadOf(p){
  const T = S.L.total; p = Math.min(T, Math.max(1, p));
  if (p === 1) return [1];
  if (p === T && T % 2 === 0) return [T];
  return p % 2 === 0 ? [p, p + 1] : [p - 1, p];
}
function samplePage(p){
  const it = S.L.P2I[p]; if (!it || !it.sample) return null;
  const s = it.sample[0] + (p - it.from); return s <= it.sample[1] ? s : null;
}
/* uploaded sample PDFs, fetched when a page is shown: item id -> {pages, name, byName, at} or null */
const SMP = new Map(), smpWait = new Map();
const canSample = () => !!(store && (store.kind === 'practice' || isLiveEditor()));
function fetchSample(id, force){
  if (!canSample()) return Promise.resolve(null);
  if (!force && SMP.has(id)) return Promise.resolve(SMP.get(id));
  if (!force && smpWait.has(id)) return smpWait.get(id);
  const pr = store.getSample(id).catch(e => { console.warn('sample', e); return null; })
    .then(d => { SMP.set(id, d && Array.isArray(d.pages) && d.pages.length ? d : null); smpWait.delete(id); return SMP.get(id); });
  smpWait.set(id, pr); return pr;
}
function upImg(p){
  const it = S.L.P2I[p], d = it && canSample() ? SMP.get(it.id) : null;
  const u = d ? d.pages[p - it.from] : null;            // only a real image data URL is shown; anything else is ignored
  return typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u) ? u : null;
}
function leafHTML(p){
  const it = S.L.P2I[p];
  if (!it) return '<figure class="leaf ph"><span class="phl"><span>outside the book</span></span></figure>';
  const up = upImg(p);
  if (up) return '<figure class="leaf"><img src="' + esc(up) + '" alt="' + esc('Page ' + p + ', ' + it.item + ', uploaded sample') + '">' +
    (it.open ? '<span class="rib">OPEN</span>' : '') + '</figure>';
  const s = samplePage(p);
  if (s && PROOFS && PROOFS[s]) return '<figure class="leaf"><img src="' + PROOFS[s] + '" alt="' + esc('Page ' + p + ', ' + it.item) + '">' +
    (it.open ? '<span class="rib">OPEN</span>' : '') + '</figure>';
  if (s && !PROOFS) return '<figure class="leaf ph"><span class="phl"><b>&nbsp;</b><span>Loading the sample page&hellip;</span></span></figure>';
  return '<figure class="leaf ph' + (it.open ? ' isopen' : '') + '"><span class="phl"><b>' + (it.open ? 'OPEN' : '&nbsp;') + '</b><span>' +
    esc(shortLabel(it)) + ' · p' + p + '</span>' + (it.open ? '' : '<span>no sample page yet</span>') + '</span></figure>';
}
const pv = el('pv'); let shownKey = '';
function show(page){
  if (!S.L.total) return;
  const sp = spreadOf(page); cur = sp[0];
  const wrap = el('bookwrap'), html = sp.map(leafHTML).join('');
  wrap.classList.toggle('single', sp.length === 1);
  if (html !== shownKey) { wrap.innerHTML = html; shownKey = html; }      // unchanged pages are not redrawn
  const items = [...new Set(sp.map(p => S.L.P2I[p]).filter(Boolean))], it = items[0];
  if (it) {
    el('pvTitle').innerHTML = esc(shortLabel(it)) + (it.open ? '<span class="badge">OPEN</span>' : '') +
      (items[1] ? ' <span style="color:var(--mute);font-weight:400">+ ' + esc(shortLabel(items[1])) + '</span>' + (items[1].open ? '<span class="badge">OPEN</span>' : '') : '');
    el('pvMeta').textContent = items.map(x => secName(x.section) + ' · pp ' + pages(x.from, x.to)).join('   |   ');
    document.querySelector('#pv .pvhead').style.borderLeftColor = it.open ? '#17795E' : (TYPE_COLOR[it.type] || '#12365E');
  }
  const ups = sp.filter(upImg), smp = sp.filter(p => !upImg(p)).map(samplePage).filter(Boolean);
  el('pvCap').textContent = [ups.length ? 'UPLOADED SAMPLE · ' + (ups.length > 1 ? 'PAGES ' + ups[0] + '–' + ups[1] : 'PAGE ' + ups[0]) : '',
    smp.length ? 'SAMPLE BOOK V14 · ' + (smp.length > 1 ? 'PAGES ' + smp[0] + '–' + smp[smp.length - 1] : 'PAGE ' + smp[0]) : ''].filter(Boolean).join('   |   ');
  if (canSample()) items.forEach(x => { if (!SMP.has(x.id)) fetchSample(x.id).then(() => { if (pv.open && spreadOf(cur).some(q => S.L.P2I[q] === x)) show(cur); }); });
  el('pvCount').textContent = (sp.length > 1 ? 'PAGES ' + sp[0] + '–' + sp[1] : 'PAGE ' + sp[0]) + ' / ' + S.L.total;
  el('pvPrev').disabled = sp[0] <= 1; el('pvNext').disabled = sp[sp.length - 1] >= S.L.total;
  renderSide(items, sp);
}
function openViewer(page, chip){ lastChip = chip || null; loadProofs(); SMP.clear(); setZoom(0); shownKey = ''; show(page); if (!pv.open) pv.showModal(); el('pvClose').focus(); }
el('pvPrev').addEventListener('click', () => show(spreadOf(cur)[0] - 1));
el('pvNext').addEventListener('click', () => { const s = spreadOf(cur); show(s[s.length - 1] + 1); });
el('pvClose').addEventListener('click', () => pv.close());
[pv, ed, hist].forEach(d => d.addEventListener('click', ev => { if (ev.target === d) d.close(); }));
pv.addEventListener('close', () => { if (lastChip && document.contains(lastChip)) lastChip.focus(); });
pv.addEventListener('keydown', ev => {
  if (ev.target.closest && ev.target.closest('textarea, input, select')) return;
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(spreadOf(cur)[0] - 1); }
  if (ev.key === 'ArrowRight') { ev.preventDefault(); const s = spreadOf(cur); show(s[s.length - 1] + 1); }
  if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoomAt(zi + 1); }
  if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); zoomAt(zi - 1); }
  if (ev.key === '0') { ev.preventDefault(); setZoom(0); }
});
const ZSTEPS = [0, 100, 150, 200, 300]; let zi = 0;
function setZoom(i){
  zi = Math.max(0, Math.min(ZSTEPS.length - 1, i));
  const st = el('pvStage'), fit = zi === 0;
  st.classList.toggle('fit', fit); st.style.setProperty('--zoom', fit ? '100%' : ZSTEPS[zi] + '%');
  el('zVal').textContent = fit ? 'Fit' : ZSTEPS[zi] + '%'; el('zOut').disabled = zi === 0; el('zIn').disabled = zi === ZSTEPS.length - 1;
  if (fit) { st.scrollLeft = 0; st.scrollTop = 0; }
}
function zoomAt(next){
  const st = el('pvStage');
  const cx = (st.scrollLeft + st.clientWidth / 2) / Math.max(1, st.scrollWidth), cy = (st.scrollTop + st.clientHeight / 2) / Math.max(1, st.scrollHeight);
  setZoom(next);
  requestAnimationFrame(() => { st.scrollLeft = cx * st.scrollWidth - st.clientWidth / 2; st.scrollTop = cy * st.scrollHeight - st.clientHeight / 2; });
}
el('zIn').addEventListener('click', () => zoomAt(zi + 1));
el('zOut').addEventListener('click', () => zoomAt(zi - 1));
(function(){
  const st = el('pvStage'); let down = false, sx = 0, sy = 0, l0 = 0, t0 = 0;
  st.addEventListener('pointerdown', ev => { if (zi === 0) return; down = true; sx = ev.clientX; sy = ev.clientY; l0 = st.scrollLeft; t0 = st.scrollTop;
    st.classList.add('grabbing'); st.setPointerCapture(ev.pointerId); });
  st.addEventListener('pointermove', ev => { if (!down) return; st.scrollLeft = l0 - (ev.clientX - sx); st.scrollTop = t0 - (ev.clientY - sy); });
  const up = ev => { down = false; st.classList.remove('grabbing'); try { st.releasePointerCapture(ev.pointerId); } catch (e) {} };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('dblclick', () => setZoom(zi === 0 ? 2 : 0));
})();

/* the side panel: content, layout and lock for each item on the spread, and its notes (signed-in editors) */
let sideKey = '';
function sideOf(it, sp){
  if (sp.length === 1) return sp[0] === 1 ? 'R' : 'L';          // page 1 is a right-hand page; a last even page is left-hand
  return it.from <= sp[0] ? 'L' : 'R';                          // an item across both pages sits on the left
}
function renderSide(items, sp){
  const SL = el('pvSideL'), SR = el('pvSideR'), on = isLiveEditor() && items.length > 0;
  pv.classList.toggle('withside', on); SL.hidden = SR.hidden = !on;
  if (!on) { sideKey = ''; SL.innerHTML = SR.innerHTML = ''; return; }
  const left = items.filter(it => sideOf(it, sp) === 'L'), right = items.filter(it => sideOf(it, sp) === 'R');
  const key = sp.join('-') + '|' + left.map(x => x.id).join(',') + '|' + right.map(x => x.id).join(',');
  if (key !== sideKey) {
    const sec = it => '<section class="sitem" data-id="' + esc(it.id) + '"><div class="shd"></div><div class="smk"></div>' +
      '<div class="sub">Notes</div><div class="snotes"></div>' + composerHTML('note', 'note:' + it.id, 'Add a note… type @ to tag someone', it.id) + '</section>';
    const fill = (box, list, empty) => { box.innerHTML = list.length ? list.map(sec).join('') : '<p class="m sempty">' + empty + '</p>'; restoreDrafts(box); };
    fill(SL, left, 'Page 1 is a right-hand page, so there is nothing on the left.');
    fill(SR, right, sp.length === 1 ? 'No right-hand page here.' : 'The item on the left runs across both pages.');
    sideKey = key;
  }
  fillSide();
}
function markControls(it){
  const dis = it.locked || !editing ? ' disabled' : '';
  const one = (kind, label) => {
    const n = kind === 'content' ? it.contentPages : it.layoutPages;
    if (it.pp === 1 || (it.pp === 2 && n !== 1))
      return '<button class="tg ' + kind + '" type="button" data-mark="' + kind + '" aria-pressed="' + (n >= it.pp) + '"' + dis + '>' +
        (n >= it.pp ? '&#10003; ' : '') + label + '</button>';
    return '<span class="tgn"><span class="tl">' + label + '</span><input type="number" min="0" max="' + it.pp + '" value="' + n + '" data-markn="' + kind + '"' +
      dis + ' aria-label="' + label + ': pages done"><span class="m">of ' + it.pp + '</span><button class="nb" type="button" data-markall="' + kind + '"' + dis + '>All</button></span>';
  };
  return one('content', 'Content done') + one('layout', 'Layout done') +
    '<button class="tg lock" type="button" data-lock aria-pressed="' + it.locked + '"' + (editing ? '' : ' disabled') + ' title="' +
    (!editing ? 'Turn on Edit plan to change this' : it.locked ? 'Unlock to change, move or delete it' : 'Lock when the page is final') + '">' +
    LOCK_SVG + (it.locked ? 'Locked' : 'Lock') + '</button>' + (editing ? '' : '<span class="m vonly">View only. Turn on Edit plan to change these.</span>');
}
function fillSide(){
  if (el('pvSideL').hidden) return;
  document.querySelectorAll('#pvMain .sitem').forEach(sec => {
    const it = S.L.items.find(x => x.id === sec.dataset.id);
    if (!it) { sec.querySelector('.shd').innerHTML = '<b>No longer in the plan</b>'; sec.querySelector('.smk').innerHTML = ''; }
    else {
      sec.querySelector('.shd').innerHTML = '<b>' + esc(it.item) + '</b><span class="m">pp ' + pages(it.from, it.to) + ' · ' + esc(statusText(it)) + '</span>';
      const mk = sec.querySelector('.smk'); if (!mk.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') mk.innerHTML = markControls(it);
    }
    sec.querySelector('.snotes').innerHTML = notesHTML(sec.dataset.id);
  });
}
el('pvMain').addEventListener('click', ev => {
  const sec = ev.target.closest('.sitem'); if (!sec) return;
  const id = sec.dataset.id, it = S.items.find(x => x.id === id); if (!it) return;
  const b = ev.target.closest('[data-mark],[data-markall],[data-lock]'); if (!b || !editing) return;
  if (b.hasAttribute('data-lock')) { act({type: 'update', id, fields: {locked: !it.locked}}); return; }
  const kind = b.dataset.mark || b.dataset.markall, key = kind === 'content' ? 'contentPages' : 'layoutPages';
  const v = b.dataset.markall ? it.pp : (it[key] >= it.pp ? 0 : it.pp);
  if (v !== it[key]) act({type: 'update', id, fields: {[key]: v}});
});
el('pvMain').addEventListener('change', ev => {
  const x = ev.target.closest('[data-markn]'); if (!x || !editing) return;
  const id = x.closest('.sitem').dataset.id, it = S.items.find(y => y.id === id); if (!it) return;
  const key = x.dataset.markn === 'content' ? 'contentPages' : 'layoutPages', v = clamp(parseInt(x.value, 10) || 0, 0, it.pp);
  x.blur();
  if (v !== it[key]) act({type: 'update', id, fields: {[key]: v}}); else x.value = v;
});

/* ---------------- notes on pages, the team chat and @mentions (signed-in editors) ---------------- */
const C = {notes: [], chat: [], people: [], readAt: 0, byItem: new Map()};
const drafts = new Map();          // composer text kept across redraws: key -> {text, mentions: Set of emails}
let editingMsg = null;             // {kind, id} of a note or message being edited
const myEmail = () => store && store.user ? String(store.user.email || '').toLowerCase() : '';
function collabReset(){
  C.notes = []; C.chat = []; C.people = []; C.readAt = 0; C.byItem = new Map(); editingMsg = null;
  const pop = el('mentPop'); if (pop) pop.hidden = true;
}
function onNotes(list){
  C.notes = list; C.byItem = new Map();
  list.forEach(n => { if (!n.deleted && !n.resolved) C.byItem.set(n.itemId, (C.byItem.get(n.itemId) || 0) + 1); });
  render(); if (pv.open) fillSide(); if (ed.open && edId) { const n = noteCount(edId); el('edNotes').textContent = 'Notes' + (n ? ' (' + n + ')' : ''); }
  renderMentionsBtn(); if (!el('mentPop').hidden) renderMentionsPop();
}
function onChat(list){ C.chat = list; renderChat(); renderMentionsBtn(); if (!el('mentPop').hidden) renderMentionsPop(); }
function onPeople(list){
  C.people = list.filter(p => p && p.email).map(p => ({email: String(p.email).toLowerCase(), name: String(p.name || p.email), readAt: p.readAt}));
  C.people.sort((a, b) => a.name.localeCompare(b.name));
  const me = C.people.find(p => p.email === myEmail());
  C.readAt = Math.max(C.readAt, me ? tsMs(me.readAt) : 0);
  renderMentionsBtn();
}
function personName(email){
  const e = String(email || '').toLowerCase(), p = C.people.find(x => x.email === e);
  if (p) return p.name;
  const m = C.notes.concat(C.chat).find(x => String(x.by || '').toLowerCase() === e && x.name);
  return m ? m.name : e;
}
const mentionsMe = m => Array.isArray(m.mentions) && m.mentions.indexOf(myEmail()) >= 0;
function fmtMsg(m){
  let s = esc(m.text || '');
  (m.mentions || []).forEach(em => {
    const tok = esc('@' + personName(em)); if (tok.length < 2) return;
    s = s.split(tok).join('<span class="at' + (em === myEmail() ? ' mine' : '') + '">' + tok + '</span>');
  });
  return s.replace(/\n/g, '<br>');
}
function itemName(id){ const it = S.L.items.find(x => x.id === id); return it ? shortLabel(it) + ' (pp ' + pages(it.from, it.to) + ')' : 'a page no longer in the plan'; }

/* a composer: a text box with @ suggestions; also used to edit a note or message */
function composerHTML(kind, key, ph, itemId, extra){
  const d = drafts.get(key);
  return '<div class="comp" data-kind="' + kind + '" data-key="' + esc(key) + '"' + (itemId ? ' data-item="' + esc(itemId) + '"' : '') + (extra || '') + '>' +
    '<div class="ac" role="listbox" hidden></div><textarea rows="2" maxlength="2000" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">' +
    esc(d ? d.text : '') + '</textarea><div class="cbar"><span class="m">' + (kind === 'chat' ? 'Enter to send · Shift+Enter for a new line' :
      kind === 'edit' ? 'Ctrl+Enter to save' : 'Ctrl+Enter to send') + '</span>' +
    (kind === 'edit' ? '<button class="nb" type="button" data-nact="cancel">Cancel</button><button class="nb primary csend" type="button">Save</button>'
      : '<button class="nb primary csend" type="button">Send</button>') + '</div></div>';
}
function draftOf(key){ let d = drafts.get(key); if (!d) drafts.set(key, d = {text: '', mentions: new Set()}); return d; }
function restoreDrafts(root){ root.querySelectorAll('.comp').forEach(c => { const d = drafts.get(c.dataset.key); if (d) c.querySelector('textarea').value = d.text; }); }
function acUpdate(comp){
  const ta = comp.querySelector('textarea'), ac = comp.querySelector('.ac'), pos = ta.selectionStart || 0;
  const m = /(^|\s)@([^\s@]{0,30})$/.exec(ta.value.slice(0, pos));
  if (!m) { ac.hidden = true; return; }
  const q = m[2].toLowerCase(), me = myEmail();
  const list = C.people.filter(p => p.email !== me && (p.name.toLowerCase().indexOf(q) >= 0 || p.email.indexOf(q) >= 0)).slice(0, 6);
  ac.innerHTML = list.map((p, i) => '<div class="aci' + (i ? '' : ' on') + '" role="option" data-email="' + esc(p.email) + '"><b>' + esc(p.name) +
    '</b><span class="m">' + esc(p.email) + '</span></div>').join('') +
    '<div class="aci acnew' + (list.length ? '' : ' on') + '" role="option" data-email="__add" data-q="' + esc(m[2]) + '"><b>+ Tag someone not listed</b>' +
    '<span class="m">add them by email</span></div>';
  ac.classList.remove('adding'); ac.dataset.start = String(pos - m[2].length - 1); ac.hidden = false;
}
function acAddForm(comp, q){
  const ac = comp.querySelector('.ac'), guess = String(q || '').replace(/^./, c => c.toUpperCase());
  ac.innerHTML = '<div class="acadd"><b>Tag someone who has not signed in yet</b>' +
    '<input type="text" class="aan" placeholder="Name, e.g. Marjorie Villo" maxlength="120" value="' + esc(guess) + '" aria-label="Name">' +
    '<input type="email" class="aae" placeholder="Email, e.g. name@mecsc.org" maxlength="200" aria-label="Email">' +
    '<span class="m">An @mecsc.org or @mecsr.org email, or a listed editor.</span>' +
    '<div class="cbar"><button class="nb" type="button" data-acadd="cancel">Cancel</button><button class="nb primary" type="button" data-acadd="ok">Add and tag</button></div></div>';
  ac.classList.add('adding'); ac.hidden = false; const n = ac.querySelector('.aan'); n.focus(); n.select();
}
async function acAdd(comp){
  const ac = comp.querySelector('.ac'), btn = ac.querySelector('[data-acadd="ok"]');
  const name = ac.querySelector('.aan').value.trim().replace(/\s+/g, ' '), email = ac.querySelector('.aae').value.trim().toLowerCase();
  if (!name) { ac.querySelector('.aan').focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter their email address', true); ac.querySelector('.aae').focus(); return; }
  if (email === myEmail()) { toast('That is your own email', true); return; }
  if (!C.people.some(x => x.email === email)) {
    btn.disabled = true;
    try { if (store && store.kind === 'live') await store.addPerson(email, name); }
    catch (e) {
      console.warn(e); btn.disabled = false;
      toast('Not added: ' + (/permission-denied/.test((e && e.code) || '') ? 'only @mecsc.org and @mecsr.org emails, or people listed as editors, can be tagged' : friendly(e)), true);
      return;
    }
    C.people.push({email, name}); C.people.sort((a, b) => a.name.localeCompare(b.name));
  }
  acPick(comp, email);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-acadd]'); if (!b) return;
  const comp = b.closest('.comp');
  if (b.dataset.acadd === 'ok') acAdd(comp);
  else { comp.querySelector('.ac').hidden = true; comp.querySelector('textarea').focus(); }
});
document.addEventListener('keydown', ev => {
  const x = ev.target.closest && ev.target.closest('.acadd input'); if (!x) return;
  const comp = x.closest('.comp');
  if (ev.key === 'Enter') { ev.preventDefault(); acAdd(comp); }
  if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); comp.querySelector('.ac').hidden = true; comp.querySelector('textarea').focus(); }
});
function acPick(comp, email){
  if (email === '__add') { const o = comp.querySelector('.ac .acnew'); acAddForm(comp, o ? o.dataset.q : ''); return; }
  const ta = comp.querySelector('textarea'), ac = comp.querySelector('.ac'), p = C.people.find(x => x.email === email); if (!p) return;
  const start = +ac.dataset.start, end = ta.selectionStart || start, name = p.name.replace(/\s+/g, ' ').trim();
  ta.value = ta.value.slice(0, start) + '@' + name + ' ' + ta.value.slice(end);
  const caret = start + name.length + 2; ta.focus(); ta.setSelectionRange(caret, caret); ac.hidden = true;
  const d = draftOf(comp.dataset.key); d.text = ta.value; d.mentions.add(email);
}
async function compSend(comp){
  const ta = comp.querySelector('textarea'), key = comp.dataset.key, kind = comp.dataset.kind, d = draftOf(key), text = ta.value.trim();
  if (!text) { ta.focus(); return; }
  const mentions = [...d.mentions].filter(em => text.indexOf('@' + personName(em)) >= 0).slice(0, 20);
  const btn = comp.querySelector('.csend'); btn.disabled = true;
  try {
    if (kind === 'note') await store.addNote(comp.dataset.item, text, mentions);
    else if (kind === 'chat') await store.sendChat(text, mentions);
    else if (kind === 'edit') await store.editMsg(comp.dataset.mkind, comp.dataset.mid, text, mentions);
    drafts.delete(key); ta.value = '';
    if (kind === 'edit') { editingMsg = null; redrawMsgs(); }
  } catch (e) { console.warn(e); toast((kind === 'edit' ? 'Not saved: ' : 'Not sent: ') + friendly(e), true); }
  finally { btn.disabled = false; }
}
document.addEventListener('input', ev => {
  const ta = ev.target.closest && ev.target.closest('.comp textarea'); if (!ta) return;
  const comp = ta.closest('.comp'); draftOf(comp.dataset.key).text = ta.value; acUpdate(comp);
});
document.addEventListener('keydown', ev => {
  const ta = ev.target.closest && ev.target.closest('.comp textarea'); if (!ta) return;
  const comp = ta.closest('.comp'), ac = comp.querySelector('.ac');
  if (!ac.hidden) {
    const opts = [...ac.querySelectorAll('.aci')], i = opts.findIndex(o => o.classList.contains('on'));
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault(); const j = (i + (ev.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length;
      opts.forEach((o, k) => o.classList.toggle('on', k === j)); return;
    }
    if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); if (opts[Math.max(0, i)]) acPick(comp, opts[Math.max(0, i)].dataset.email); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ac.hidden = true; return; }
  }
  if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); compSend(comp); }
  else if (ev.key === 'Enter' && comp.dataset.kind === 'chat' && !ev.shiftKey) { ev.preventDefault(); compSend(comp); }
});
document.addEventListener('mousedown', ev => {
  const o = ev.target.closest && ev.target.closest('.ac .aci'); if (!o) return;
  ev.preventDefault(); acPick(o.closest('.comp'), o.dataset.email);
});
document.addEventListener('focusout', ev => {
  const comp = ev.target.closest && ev.target.closest('.comp'); if (!comp) return;
  setTimeout(() => { if (!comp.contains(document.activeElement)) { const ac = comp.querySelector('.ac'); if (ac) ac.hidden = true; } }, 150);
});

/* a note or a chat message */
function msgHTML(m, kind){
  const mine = String(m.by || '').toLowerCase() === myEmail(), edit = editingMsg && editingMsg.kind === kind && editingMsg.id === m.id;
  const when = m.at ? fmtTime(new Date(tsMs(m.at))) : 'sending…';
  let h = '<div class="msg' + (m.resolved ? ' resolved' : '') + (mentionsMe(m) && !mine ? ' tome' : '') + (mine ? ' mine' : '') + '" data-msg="' + esc(m.id) + '">' +
    '<div class="mh"><b>' + esc(m.name || m.by) + '</b><span class="m">' + esc(when) + (m.editedAt ? ' · edited' : '') + '</span></div>';
  h += edit ? composerHTML('edit', 'edit:' + kind + ':' + m.id, 'Edit… type @ to tag someone', '', ' data-mkind="' + kind + '" data-mid="' + esc(m.id) + '"')
    : '<div class="mtx">' + fmtMsg(m) + '</div>';
  if (m.resolved) h += '<div class="rs">Resolved by ' + esc(personName(m.resolvedBy)) + '</div>';
  const acts = [], b = (a, t) => '<button type="button" class="lnk" data-nact="' + a + '" data-mk="' + kind + '" data-mid="' + esc(m.id) + '">' + t + '</button>';
  if (kind === 'note' && !edit) acts.push(m.resolved ? b('reopen', 'Reopen') : b('resolve', 'Resolve'));
  if (mine && !edit) acts.push(b('edit', 'Edit'), b('del', 'Delete'));
  return h + (acts.length ? '<div class="ma">' + acts.join('') + '</div>' : '') + '</div>';
}
const openDone = new Set();         // pages whose resolved notes are shown
function notesHTML(itemId){
  const list = C.notes.filter(n => n.itemId === itemId && !n.deleted);
  if (!list.length) return '<p class="m empty">No notes yet.</p>';
  const open = list.filter(n => !n.resolved), done = list.filter(n => n.resolved);
  const show = openDone.has(itemId) || !!(editingMsg && editingMsg.kind === 'note' && done.some(n => n.id === editingMsg.id));
  return open.map(n => msgHTML(n, 'note')).join('') +
    (done.length ? '<details class="done" data-item="' + esc(itemId) + '"' + (show ? ' open' : '') + '><summary>' + done.length + ' resolved</summary>' +
      done.map(n => msgHTML(n, 'note')).join('') + '</details>' : '');
}
document.addEventListener('toggle', ev => {
  const dt = ev.target; if (!dt.matches || !dt.matches('details.done')) return;
  if (dt.open) openDone.add(dt.dataset.item); else openDone.delete(dt.dataset.item);
}, true);
function findMsg(kind, id){ return (kind === 'chat' ? C.chat : C.notes).find(x => x.id === id); }
function redrawMsgs(){ if (pv.open) fillSide(); renderChat(); }
document.addEventListener('click', async ev => {
  const a = ev.target.closest && ev.target.closest('[data-nact]'); if (!a) return;
  const what = a.dataset.nact, comp = a.closest('.comp');
  if (what === 'cancel' && comp) { drafts.delete(comp.dataset.key); editingMsg = null; redrawMsgs(); return; }
  const kind = a.dataset.mk, id = a.dataset.mid, m = findMsg(kind, id); if (!m) return;
  try {
    if (what === 'resolve' || what === 'reopen') await store.resolveNote(id, what === 'resolve');
    else if (what === 'edit') {
      const d = draftOf('edit:' + kind + ':' + id); d.text = m.text; d.mentions = new Set(m.mentions || []);
      editingMsg = {kind, id}; redrawMsgs();
      const t = document.querySelector('.comp[data-key="' + CSS.escape('edit:' + kind + ':' + id) + '"] textarea'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
    } else if (what === 'del') {
      if (!a.dataset.sure) { a.dataset.sure = '1'; a.textContent = 'Confirm delete'; a.classList.add('danger'); return; }
      await store.deleteMsg(kind, id);
    }
  } catch (e) { console.warn(e); toast('Not changed: ' + friendly(e), true); }
});
document.addEventListener('click', ev => {
  const s = ev.target.closest && ev.target.closest('.comp .csend'); if (s) compSend(s.closest('.comp'));
});

/* @mentions: the button, its list, and marking them read */
function mentionsOf(){
  const me = myEmail(); if (!me) return [];
  const pick = m => !m.deleted && String(m.by || '').toLowerCase() !== me && mentionsMe(m);
  return C.notes.filter(pick).map(m => Object.assign({kind: 'note'}, m)).concat(C.chat.filter(pick).map(m => Object.assign({kind: 'chat'}, m)))
    .sort((a, b) => tsMs(b.at) - tsMs(a.at));
}
function renderMentionsBtn(){
  const n = isLiveEditor() ? mentionsOf().filter(m => tsMs(m.at) > C.readAt).length : 0;
  el('mentCnt').textContent = n; el('mentCnt').hidden = !n;
  el('btnMentions').classList.toggle('hot', n > 0);
}
function renderMentionsPop(){
  const list = mentionsOf().slice(0, 40);
  el('mentPop').innerHTML = '<div class="mphead">Mentions</div>' + (list.length ? list.map(m => '<button type="button" class="mrow' + (tsMs(m.at) > C.readAt ? ' new' : '') +
    '" data-mkind="' + m.kind + '" data-mid="' + esc(m.id) + '"><span class="mrh"><b>' + esc(m.name || m.by) + '</b> ' +
    (m.kind === 'note' ? 'on ' + esc(itemName(m.itemId)) : 'in the team chat') + '</span><span class="m">' + (m.at ? esc(fmtTime(new Date(tsMs(m.at)))) : '') +
    '</span><span class="mt">' + esc((m.text || '').slice(0, 160)) + '</span></button>').join('')
    : '<p class="m">No mentions yet. When someone tags you with @, it shows here.</p>');
}
async function markRead(){
  C.readAt = Date.now(); renderMentionsBtn();
  try { await store.markRead(); } catch (e) { console.warn('mark read', e); }
}
el('btnMentions').addEventListener('click', ev => {
  ev.stopPropagation();
  const pop = el('mentPop'); if (!pop.hidden) { pop.hidden = true; return; }
  renderMentionsPop(); pop.hidden = false; markRead();
});
el('mentPop').addEventListener('click', ev => {
  const r = ev.target.closest('.mrow'); if (!r) return;
  el('mentPop').hidden = true;
  if (r.dataset.mkind === 'chat') { openChat(true); setTimeout(() => flash(document.querySelector('#chatList [data-msg="' + CSS.escape(r.dataset.mid) + '"]')), 60); return; }
  const n = C.notes.find(x => x.id === r.dataset.mid), it = n && S.L.items.find(x => x.id === n.itemId);
  if (!it) { toast('That page is no longer in the plan.', true); return; }
  selectTab(0); openViewer(it.from, null);
  setTimeout(() => flash(document.querySelector('#pvMain [data-msg="' + CSS.escape(n.id) + '"]')), 60);
});
document.addEventListener('click', ev => {
  const pop = el('mentPop'); if (pop.hidden || pop.contains(ev.target) || el('btnMentions').contains(ev.target)) return;
  pop.hidden = true;
});
function flash(x){ if (!x) return; x.scrollIntoView({block: 'nearest'}); x.classList.add('flash'); setTimeout(() => x.classList.remove('flash'), 1600); }

/* the team chat: a small panel on the right */
let chatOpen = false;
try { chatOpen = localStorage.getItem('mecsr-chat-open') === '1'; } catch (e) {}
const seenKey = () => 'mecsr-chat-seen:' + myEmail();
function chatSeen(){ try { return +localStorage.getItem(seenKey()) || 0; } catch (e) { return 0; } }
function setChatSeen(ms){ try { if (ms > chatSeen()) localStorage.setItem(seenKey(), String(ms)); } catch (e) {} }
function renderChatShell(){
  const on = isLiveEditor();
  el('chat').hidden = !on;
  if (!on) return;
  el('chatBox').hidden = !chatOpen; el('chatBtn').hidden = chatOpen; el('chatBtn').setAttribute('aria-expanded', String(chatOpen));
  if (chatOpen && !el('chatComp').firstChild) { el('chatComp').innerHTML = composerHTML('chat', 'chat', 'Message the team… type @ to tag someone'); }
  renderChat();
}
function renderChat(){
  if (el('chat').hidden) return;
  const list = C.chat.filter(m => !m.deleted), me = myEmail();
  if (chatOpen) {
    const box = el('chatList'), atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 60 || !box.firstChild;
    if (box.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA') return;   // editing a message
    let day = '';
    box.innerHTML = list.length ? list.map(m => {
      const d = m.at ? fmtDate(new Date(tsMs(m.at))) : '', sep = d && d !== day ? '<div class="day">' + esc(d) + '</div>' : '';
      if (d) day = d; return sep + msgHTML(m, 'chat');
    }).join('') : '<p class="m empty">No messages yet. Use this for quick questions to the team; notes about one page go on that page.</p>';
    if (atEnd) box.scrollTop = box.scrollHeight;
    if (list.length) setChatSeen(tsMs(list[list.length - 1].at));
  }
  const unread = chatOpen ? 0 : list.filter(m => String(m.by || '').toLowerCase() !== me && tsMs(m.at) > chatSeen()).length;
  el('chatCnt').textContent = unread; el('chatCnt').hidden = !unread;
}
function openChat(on){
  chatOpen = !!on; try { localStorage.setItem('mecsr-chat-open', chatOpen ? '1' : '0'); } catch (e) {}
  renderChatShell();
  if (chatOpen) { const t = el('chatComp').querySelector('textarea'); if (t) t.focus(); }
  else el('chatBtn').focus();
}
el('chatBtn').addEventListener('click', () => openChat(true));
el('chatMin').addEventListener('click', () => openChat(false));

/* ---------------- the production timeline (printed book only), to the release date ---------------- */
const TL = {rows: null, meta: {}};
let tlPending = false;
const slug = s => String(s || '').toLowerCase().replace(/[^a-z]+/g, '-');
const tlCanEdit = () => !!(store && (store.kind === 'practice' || isLiveEditor()));
function setTimeline(rows, meta){ TL.rows = rows ? cleanRows(rows) : null; TL.meta = meta || {}; renderTimeline(); }
function releaseDate(){ const r = (TL.rows || []).find(x => x.id === 'tl-release'); return r ? r.due : RELEASE; }
function renderTimeline(){
  const wrap = el('tlWrap'), can = tlCanEdit();
  el('tlGate').hidden = can; el('tlAdd').hidden = !can || !TL.rows;
  if (!can) {
    const viewer = store && store.kind === 'live' && store.user;
    el('tlGate').innerHTML = viewer ? 'The production timeline is for the MECSR team. This account can view the flat plan only.'
      : store && store.kind === 'off' ? 'The production timeline could not be loaded. Check the connection and reload the page.'
      : 'The production timeline is for the MECSR team. <button class="nb" type="button" id="tlSignIn">Sign in</button> with your MECSR Google account to see and update it.';
    wrap.innerHTML = ''; el('tlSum').innerHTML = ''; return;
  }
  if (!TL.rows) { wrap.innerHTML = '<p class="m tlload">Loading the timeline…</p>'; el('tlSum').innerHTML = ''; return; }
  renderTlSummary();
  const a = document.activeElement;
  if (a && wrap.contains(a) && a.matches('input, select, textarea')) { tlPending = true; return; }   // never redraw under someone's cursor
  tlPending = false;
  const rows = TL.rows, today = todayISO(), rel = releaseDate();
  if (!rows.length) { wrap.innerHTML = '<p class="m tlload">No tasks yet. Use “+ Add task”.</p>'; return; }
  let s0 = Math.min(...rows.map(r => dayNum(r.start)), dayNum(today)), s1 = Math.max(...rows.map(r => dayNum(r.due)), dayNum(rel)) + 3;
  s0 -= (new Date(s0 * 864e5).getUTCDay() + 6) % 7;                       // start on a Monday
  const span = Math.max(7, s1 - s0), X = d => ((dayNum(d) - s0) / span * 100).toFixed(3) + '%', W = r => ((dayNum(r.due) - dayNum(r.start) + 1) / span * 100).toFixed(3) + '%';
  const isoOf = n => new Date(n * 864e5).toISOString().slice(0, 10);
  let months = '';
  for (let n = s0; n <= s1; n++) { const d = isoOf(n); if ((d.slice(8) === '01' || n === s0) && (n - s0) / span < 0.9) months += '<span class="mo" style="left:' + X(d) + '">' + MON[+d.slice(5, 7) - 1] + (d.slice(5, 7) === '01' || n === s0 ? ' ' + d.slice(2, 4) : '') + '</span>'; }
  let weeks = ''; for (let n = s0; n <= s1; n += 7) weeks += '<i class="wk" style="left:' + X(isoOf(n)) + '"></i>';
  const marks = weeks + (today >= isoOf(s0) && today <= isoOf(s1) ? '<i class="today" style="left:' + X(today) + '" title="Today"></i>' : '') +
    '<i class="rel" style="left:' + X(rel) + '" title="Release ' + esc(dLabel(rel)) + '"></i>';
  let phase = null, html = '';
  const dcell = (r, f, over) => '<td class="dt"><button type="button" class="dbtn' + (over ? ' over' : '') + '" data-pick="' + f + '" title="' +
    (over ? 'Overdue. ' : '') + 'Change the ' + (f === 'start' ? 'start' : 'due') + ' date">' + esc(dLabel(r[f])) + '</button>' +
    '<input type="date" class="dpick" data-f="' + f + '" value="' + r[f] + '" tabindex="-1" aria-label="' + (f === 'start' ? 'Start date' : 'Due date') + '"></td>';
  rows.forEach((r, k) => {
    if (r.phase !== phase) { phase = r.phase; html += '<tr class="ph"><td colspan="8">' + esc(phase || 'No phase') + '</td></tr>'; }
    const over = r.status !== 'Done' && r.due < today, ms = r.milestone || r.start === r.due;
    const bar = ms ? '<i class="dia s-' + slug(r.status) + '" style="left:' + X(r.due) + '"></i>'
      : '<i class="bar s-' + slug(r.status) + '" style="left:' + X(r.start) + ';width:' + W(r) + '"></i>';
    html += '<tr data-id="' + esc(r.id) + '" class="' + (r.done ? 'isdone' : '') + (over ? ' isover' : '') + (ms ? ' isms' : '') + '">' +
      '<td class="tk"><input type="text" class="tki" data-f="task" value="' + esc(r.task) + '" title="' + esc(r.task) + '" maxlength="160" aria-label="Task">' +
      '<input type="text" class="tmi" data-f="team" value="' + esc(r.team) + '" placeholder="Team" maxlength="60" aria-label="Team" list="tlTeams"></td>' +
      dcell(r, 'start', false) + dcell(r, 'due', over) +
      '<td class="g"><div class="track">' + marks + bar + '</div></td>' +
      '<td class="stc"><select data-f="status" class="s-' + slug(r.status) + '" aria-label="Status">' +
        TL_STATUS.map(s => '<option' + (s === r.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></td>' +
      '<td class="ck"><input type="checkbox" data-f="done"' + (r.done ? ' checked' : '') + ' aria-label="Done"></td>' +
      '<td class="nt"><input type="text" data-f="notes" value="' + esc(r.notes) + '" maxlength="500" placeholder="Add a note" aria-label="Notes"></td>' +
      '<td class="acts"><button type="button" data-tl="up" title="Move up" aria-label="Move up"' + (k === 0 ? ' disabled' : '') + '>&#8593;</button>' +
      '<button type="button" data-tl="down" title="Move down" aria-label="Move down"' + (k === rows.length - 1 ? ' disabled' : '') + '>&#8595;</button>' +
      '<button type="button" data-tl="add" title="Add a task after this one" aria-label="Add a task after this one">+</button>' +
      '<button type="button" data-tl="del" title="Delete this task" aria-label="Delete this task">&#10005;</button></td></tr>';
  });
  const teams = [...new Set(rows.map(r => r.team).filter(Boolean))];
  wrap.innerHTML = '<datalist id="tlTeams">' + teams.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>' +
    '<table class="tl"><colgroup><col><col class="c-dt"><col class="c-dt"><col class="c-g"><col class="c-st"><col class="c-ck"><col class="c-nt"><col class="c-ac"></colgroup>' +
    '<thead><tr><th>Task · team</th><th>Start</th><th>Due</th><th class="g"><div class="months">' + months + '</div></th>' +
    '<th>Status</th><th>Done</th><th>Notes</th><th class="acts"><span class="sr">Actions</span></th></tr></thead><tbody>' + html + '</tbody></table>';
}
function renderTlSummary(){
  const rows = TL.rows, today = todayISO(), rel = releaseDate(), n = rows.length;
  const by = s => rows.filter(r => r.status === s).length, done = by('Done'), over = rows.filter(r => r.status !== 'Done' && r.due < today).length;
  const days = Math.round(dayNum(rel) - dayNum(today));
  const next = rows.filter(r => r.status !== 'Done' && r.due >= today).sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : 0)[0];
  const card = (cls, label, big, line) => '<div class="stat ' + cls + '"><div class="sl">' + label + '</div><div class="sv">' + big + '</div><div class="sd">' + line + '</div></div>';
  el('tlSum').innerHTML =
    card('rel', 'Release', esc(dLabel(rel)), days > 0 ? days + ' days to go' : days === 0 ? 'today' : Math.abs(days) + ' days ago') +
    card('done', 'Done', done + ' of ' + n, pct(done, n) + ' of tasks') +
    card('prog', 'In progress', by('In progress'), next ? 'Next due: ' + esc(next.task) + ', ' + esc(dShort(next.due)) : 'Nothing due') +
    card('delay' + (by('Delayed') ? ' amber' : ''), 'Delayed', by('Delayed'), by('On hold') + ' on hold') +
    card('over' + (over ? ' bad' : ''), 'Overdue', over, 'past their due date and not done');
}
async function actTimeline(op){
  if (!tlCanEdit() || !TL.rows) return false;
  let after;
  try { after = TOPS[op.type](TL.rows, op); } catch (e) { toast('Not changed: ' + e.message, true); renderTimeline(); return false; }
  const prev = TL.rows; TL.rows = cleanRows(after); renderTimeline();
  try { await store.applyTimeline(op); return true; }
  catch (e) {
    console.warn(e); toast('Not saved: ' + friendly(e), true);
    TL.rows = store.lastTimeline && store.lastTimeline.rows ? cleanRows(store.lastTimeline.rows) : prev; tlPending = false;
    const a = document.activeElement; if (a && el('tlWrap').contains(a)) a.blur();
    renderTimeline(); return false;
  }
}
el('tlWrap').addEventListener('change', ev => {
  const x = ev.target.closest('[data-f]'); if (!x) return;
  const tr = x.closest('tr[data-id]'), r = tr && TL.rows.find(y => y.id === tr.dataset.id); if (!r) return;
  const f = x.dataset.f; let v = x.type === 'checkbox' ? x.checked : String(x.value).trim();
  if ((f === 'start' || f === 'due') && !isoOk(v)) { x.value = r[f]; return; }
  if (f === 'task' && !v) { x.value = r.task; return; }
  if (v === r[f]) return;
  if (x.tagName === 'SELECT' || x.type === 'checkbox' || x.type === 'date') x.blur();
  actTimeline({type: 'update', id: r.id, fields: {[f]: v}});
});
el('tlWrap').addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches('input[type=text]')) { ev.preventDefault(); ev.target.blur(); }
});
el('tlWrap').addEventListener('focusout', ev => {
  if (tlPending && !el('tlWrap').contains(ev.relatedTarget)) setTimeout(() => { if (!el('tlWrap').contains(document.activeElement)) renderTimeline(); }, 0);
});
el('tlWrap').addEventListener('click', async ev => {
  const pk = ev.target.closest('[data-pick]');
  if (pk) {
    const inp = pk.parentElement.querySelector('.dpick');
    try { inp.showPicker(); } catch (e) { inp.classList.add('show'); inp.focus(); }
    return;
  }
  const b = ev.target.closest('[data-tl]'); if (!b) return;
  const id = b.closest('tr[data-id]').dataset.id, r = TL.rows.find(y => y.id === id), what = b.dataset.tl; if (!r) return;
  if (what === 'up' || what === 'down') { b.blur(); actTimeline({type: 'move', id, dir: what === 'up' ? -1 : 1}); }
  else if (what === 'add') { b.blur(); addTask(r); }
  else if (what === 'del') {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Delete?'; b.classList.add('danger');
      setTimeout(() => { if (document.contains(b)) { delete b.dataset.sure; b.innerHTML = '&#10005;'; b.classList.remove('danger'); } }, 4000); return; }
    b.blur(); actTimeline({type: 'remove', id});
  }
});
async function addTask(after){
  const ref = after || (TL.rows || [])[TL.rows.length - 1], d = ref ? ref.due : todayISO();
  const row = {id: newId(), phase: ref ? ref.phase : '', task: 'New task', team: ref ? ref.team : '', start: d, due: d, status: 'Not started', done: false, notes: '', milestone: false};
  if (await actTimeline({type: 'insert', afterId: ref ? ref.id : null, row})) {
    const t = document.querySelector('#tlWrap tr[data-id="' + CSS.escape(row.id) + '"] input[data-f="task"]'); if (t) { t.focus(); t.select(); }
  }
}
el('tlAdd').addEventListener('click', () => addTask(null));

/* ---------------- reports ---------------- */
function download(blob, name){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function busy(btn, label, fn){
  const old = btn.textContent; btn.disabled = true; btn.textContent = label;
  try { await fn(); } catch (e) { console.warn(e); toast('Report failed: ' + friendly(e), true); }
  finally { btn.disabled = false; btn.textContent = old; }
}
const withTimeline = () => tlCanEdit() && Array.isArray(TL.rows) && TL.rows.length > 0;
const isoDate = s => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));

function exportExcel(){
  return busy(el('btnXlsx'), 'Exporting…', async () => {
    await loadScript('lib/exceljs.min.js');
    const L = S.L, now = new Date(), wb = new window.ExcelJS.Workbook();
    wb.creator = 'MECSR 2027 flat plan'; wb.created = now;
    const NAVY = 'FF12365E', WHITE = 'FFFFFFFF', OPENF = 'FFE8F3EF', OPENT = 'FF17795E', GREY = 'FF6E6C64', TOTALF = 'FFDCE6F1', LOCKF = 'FFF3EFE4';
    const line = {style: 'thin', color: {argb: 'FFDBE0E6'}}, border = {top: line, left: line, bottom: line, right: line};
    const sub = 'MECSR Directory 2027 · as of ' + fmtTime(now) + ' Dubai · ' + L.total + ' pages so far';
    function sheet(name, title, cols){
      const ws = wb.addWorksheet(name, {views: [{state: 'frozen', ySplit: 3}]});
      ws.columns = cols.map(c => ({key: c.key, width: c.w}));
      ws.getCell('A1').value = title; ws.getCell('A1').font = {name: 'Arial', size: 14, bold: true, color: {argb: NAVY}};
      ws.getCell('A2').value = sub; ws.getCell('A2').font = {name: 'Arial', size: 9, color: {argb: GREY}};
      const h = ws.getRow(3);
      cols.forEach((c, i) => { const x = h.getCell(i + 1); x.value = c.h; x.font = {name: 'Arial', size: 9.5, bold: true, color: {argb: WHITE}};
        x.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: NAVY}}; x.border = border;
        x.alignment = {vertical: 'middle', horizontal: c.num ? 'right' : 'left', wrapText: true}; });
      h.height = 30; return ws;
    }
    function add(ws, cols, values, o){
      o = o || {}; const r = ws.addRow(values);
      cols.forEach((c, i) => { const x = r.getCell(i + 1);
        x.font = o.openKey === c.key ? {name: 'Arial', size: 10, bold: true, color: {argb: OPENT}} : {name: 'Arial', size: 10, bold: !!o.bold};
        x.border = border; x.alignment = {vertical: 'top', horizontal: c.num ? 'right' : 'left', wrapText: !!c.wrap};
        if (o.fill) x.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: o.fill}}; if (c.fmt) x.numFmt = c.fmt; });
      return r;
    }
    const share = (a, b, n, d) => ({formula: 'IF(' + d + '=0,"",' + n + '/' + d + ')', result: b ? a / b : ''});
    // Sections
    const cS = [{key: 's', h: 'Section', w: 30}, {key: 'p', h: 'Pages', w: 11, num: true}, {key: 'n', h: 'No. of pages', w: 10, num: true, fmt: '0'},
      {key: 'sa', h: 'Saleable pages', w: 10, num: true, fmt: '0'}, {key: 'o', h: 'Open pages', w: 9, num: true, fmt: '0'},
      {key: 'op', h: 'Open, % of saleable', w: 11, num: true, fmt: '0%'}, {key: 'c', h: 'Content done (pages)', w: 12, num: true, fmt: '0'},
      {key: 'cp', h: 'Content, % of pages', w: 11, num: true, fmt: '0%'}, {key: 'l', h: 'Layout done (pages)', w: 11, num: true, fmt: '0'},
      {key: 'lp', h: 'Layout, % of pages', w: 11, num: true, fmt: '0%'}, {key: 'k', h: 'Locked pages', w: 9, num: true, fmt: '0'}];
    const w1 = sheet('Sections', 'Flat plan · sections', cS);
    L.secs.forEach((s, i) => { const r = 4 + i;
      add(w1, cS, [secName(s.section), pages(s.from, s.to), s.pp, s.saleable, s.open, share(s.open, s.saleable, 'E' + r, 'D' + r),
        s.content, share(s.content, s.pp, 'G' + r, 'C' + r), s.layout, share(s.layout, s.pp, 'I' + r, 'C' + r), s.locked]); });
    const f0 = 4, f1 = 3 + L.secs.length, tr = f1 + 1, t = L.stats, sum = c => ({formula: 'SUM(' + c + f0 + ':' + c + f1 + ')'});
    add(w1, cS, ['Total so far', '', Object.assign(sum('C'), {result: L.total}), Object.assign(sum('D'), {result: t.saleable}), Object.assign(sum('E'), {result: t.open}),
      share(t.open, t.saleable, 'E' + tr, 'D' + tr), Object.assign(sum('G'), {result: t.content}), share(t.content, L.total, 'G' + tr, 'C' + tr),
      Object.assign(sum('I'), {result: t.layout}), share(t.layout, L.total, 'I' + tr, 'C' + tr), Object.assign(sum('K'), {result: t.locked})], {bold: true, fill: TOTALF});
    const nb = w1.addRow([]); nb.height = 6;
    const bal = w1.addRow(['Page balance: ' + (L.total % 2 ? 'odd (' + L.total + '), add or remove 1 page' : 'even (' + L.total + ')') + '. ' +
      Math.ceil(L.total / 16) + ' sections of 16 = ' + Math.ceil(L.total / 16) * 16 + ' pages.']);
    bal.getCell(1).font = {name: 'Arial', size: 9.5, bold: true, color: {argb: L.total % 2 ? 'FFB03A5B' : OPENT}};
    const key = w1.addRow(['Saleable = OPEN + sold pages. Open % is of saleable pages; content and layout % are of all pages in the section.']);
    key.getCell(1).font = {name: 'Arial', size: 9, color: {argb: GREY}};
    // Flat plan, item by item
    const cI = [{key: 'sn', h: 'SN', w: 6, num: true}, {key: 'sec', h: 'Section', w: 24}, {key: 'it', h: 'Item', w: 40, wrap: true},
      {key: 'ty', h: 'Type', w: 16}, {key: 'pp', h: 'PP', w: 6, num: true}, {key: 'pg', h: 'Pages', w: 10, num: true},
      {key: 'st', h: 'Status', w: 26}, {key: 'cd', h: 'Content done (pages)', w: 11, num: true, fmt: '0'}, {key: 'ld', h: 'Layout done (pages)', w: 11, num: true, fmt: '0'},
      {key: 'lk', h: 'Locked', w: 8}, {key: 'sm', h: 'Sample pages (v14)', w: 12, num: true}, {key: 'no', h: 'Note', w: 32, wrap: true}];
    const w2 = sheet('Flat Plan', 'Flat plan · item by item', cI);
    L.items.forEach((it, k) => add(w2, cI, [k + 1, secName(it.section), it.item, TYPE_LABEL[it.type] || it.type, it.pp, pages(it.from, it.to),
      it.open ? 'OPEN' : it.sponsor ? 'Sold: ' + it.sponsor : '', it.contentPages, it.layoutPages, it.locked ? 'Locked' : '',
      it.sample ? pages(it.sample[0], it.sample[1]) : '', it.note || ''], it.open ? {fill: OPENF, openKey: 'st'} : it.locked ? {fill: LOCKF} : {}));
    w2.autoFilter = {from: {row: 3, column: 1}, to: {row: 3 + L.items.length, column: cI.length}};
    // Page by page
    const cP = [{key: 'p', h: 'Page', w: 7, num: true}, {key: 'sd', h: 'Side', w: 6}, {key: 'sec', h: 'Section', w: 24},
      {key: 'c', h: 'Content', w: 36}, {key: 'st', h: 'Status', w: 24}, {key: 'cd', h: 'Content done', w: 11}, {key: 'ld', h: 'Layout done', w: 10},
      {key: 'lk', h: 'Locked', w: 8}, {key: 'sm', h: 'Sample page (v14)', w: 12, num: true}];
    const w3 = sheet('Page by page', 'Flat plan · page by page', cP);
    for (let p = 1; p <= L.total; p++) {
      const it = L.P2I[p], sm = samplePage(p), k = p - it.from;
      add(w3, cP, [p, p % 2 ? 'R' : 'L', secName(it.section), shortLabel(it), it.open ? 'OPEN' : it.sponsor || '', k < it.contentPages ? 'Yes' : '',
        k < it.layoutPages ? 'Yes' : '', it.locked ? 'Locked' : '', sm || ''], it.open ? {fill: OPENF, openKey: 'st'} : {});
    }
    w3.autoFilter = {from: {row: 3, column: 1}, to: {row: 3 + L.total, column: cP.length}};
    // Timeline
    if (withTimeline()) {
      const cT = [{key: 'ph', h: 'Phase', w: 22}, {key: 'tk', h: 'Task', w: 46, wrap: true}, {key: 'tm', h: 'Team', w: 14},
        {key: 'sd', h: 'Start', w: 12, fmt: 'd mmm yyyy'}, {key: 'dd', h: 'Due', w: 12, fmt: 'd mmm yyyy'}, {key: 'st', h: 'Status', w: 13},
        {key: 'dn', h: 'Done', w: 7}, {key: 'nt', h: 'Notes', w: 50, wrap: true}];
      const w5 = sheet('Timeline', 'Production timeline · release ' + dLabel(releaseDate()), cT);
      const today = todayISO();
      TL.rows.forEach(r => add(w5, cT, [r.phase, r.task, r.team, isoDate(r.start), isoDate(r.due), r.status + (r.status !== 'Done' && r.due < today ? ' (overdue)' : ''),
        r.done ? 'Yes' : '', r.notes], r.status === 'Done' ? {fill: OPENF} : r.status === 'Delayed' || (r.status !== 'Done' && r.due < today) ? {fill: 'FFFBEBD3'} : {}));
      w5.autoFilter = {from: {row: 3, column: 1}, to: {row: 3 + TL.rows.length, column: cT.length}};
    }
    // Change log (editors)
    if (store && store.canEdit() && store.kind === 'live') {
      let rows = []; try { rows = await store.history(); } catch (e) {}
      if (rows.length) {
        const cL = [{key: 'w', h: 'When (Dubai)', w: 19}, {key: 'n', h: 'Who', w: 24}, {key: 'e', h: 'Email', w: 30},
          {key: 'ip', h: 'IP address', w: 18}, {key: 's', h: 'Change', w: 90, wrap: true}];
        const w4 = sheet('Change log', 'Flat plan and timeline · change log', cL);
        rows.forEach(r => add(w4, cL, [r.at ? fmtTime(r.at) : '', r.name || '', r.by || '', r.ip || '', r.summary || '']));
      }
    }
    const buf = await wb.xlsx.writeBuffer();
    download(new Blob([buf], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), 'MECSR_2027_Flat_Plan_' + fileStamp(now) + '.xlsx');
  });
}

function pdfText(s){ return String(s == null ? '' : s).replace(/[^\x20-\x7E -ÿ–—‘’“”•…‹›€]/g, '?'); }
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function exportPdf(){
  return busy(el('btnPdf'), 'Exporting…', async () => {
    await loadScript('lib/jspdf.umd.min.js'); await loadScript('lib/jspdf.plugin.autotable.min.js');
    const {jsPDF} = window.jspdf, doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4', compress: true});
    const L = S.L, now = new Date(), W = 297, H = 210, M = 11, BOTTOM = H - 14, t = L.stats;
    const NAVY = [18, 54, 94], INK = [15, 26, 43], MUTE = [107, 116, 132], RULE = [219, 224, 230], OPEN = [23, 121, 94], OPENBG = [232, 243, 239],
      LAYOUT = [18, 54, 94], RED = [176, 58, 91], AMBER = [154, 107, 0];
    const heading = (s, x, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...MUTE); doc.text(s, x, y, {charSpace: 0.5});
      doc.setDrawColor(...RULE); doc.setLineWidth(0.3); doc.line(x, y + 1.6, W - M, y + 1.6); };
    const pc = (a, b) => b > 0 ? a + ' (' + Math.round(a * 100 / b) + '%)' : '–';
    // page 1: title, sections, key and figures
    doc.setFillColor(...NAVY); doc.roundedRect(M, M, W - 2 * M, 26, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(227, 185, 74); doc.text('MECSR DIRECTORY', M + 8, M + 8, {charSpace: 0.6});
    doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text('2027 Flat Plan', M + 8, M + 17.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(198, 212, 228);
    doc.text(pdfText('AS OF ' + fmtTime(now).toUpperCase() + ' DUBAI · ' + L.total + ' PAGES SO FAR'), M + 8, M + 23);
    heading('SECTIONS', M, 48);
    doc.autoTable({startY: 52, margin: {left: M, right: W - M - 168}, theme: 'grid',
      head: [['Section', 'Pages', 'No. of pages', 'Open (of saleable)', 'Content done', 'Layout done']],
      body: L.secs.map(s => [pdfText(secName(s.section)), pdfText(pages(s.from, s.to)), String(s.pp), pc(s.open, s.saleable), pc(s.content, s.pp), pc(s.layout, s.pp)]),
      foot: [['Total so far', '', String(L.total), pc(t.open, t.saleable), pc(t.content, L.total), pc(t.layout, L.total)]],
      styles: {font: 'helvetica', fontSize: 8.6, textColor: INK, lineColor: RULE, lineWidth: 0.15, cellPadding: {top: 1.6, bottom: 1.6, left: 2.6, right: 2.6}},
      headStyles: {fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 6.8},
      footStyles: {fillColor: [220, 230, 241], textColor: INK, fontStyle: 'bold'},
      alternateRowStyles: {fillColor: [245, 246, 248]}, columnStyles: {0: {cellWidth: 46}},
      didParseCell: d => { if (d.column.index > 0) d.cell.styles.halign = 'right'; }});
    const KX = M + 176; heading('KEY', KX, 48);
    let kx = KX, ky = 56;
    ORDER.filter(x => L.items.some(i => i.type === x)).forEach(x => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); const w = doc.getTextWidth(TYPE_LABEL[x]) + 8.5;
      if (kx + w > W - M) { kx = KX; ky += 5.6; }
      doc.setFillColor(...rgb(TYPE_COLOR[x])); doc.rect(kx, ky - 2.5, 2.7, 2.7, 'F'); doc.setTextColor(...INK); doc.text(TYPE_LABEL[x], kx + 4, ky); kx += w;
    });
    ky += 7; doc.setFillColor(...OPENBG); doc.setDrawColor(...OPEN); doc.setLineDashPattern([0.6, 0.5], 0); doc.setLineWidth(0.3);
    doc.rect(KX, ky - 3.2, 11, 4.2, 'FD'); doc.setLineDashPattern([], 0);
    doc.setFontSize(6.5); doc.setTextColor(...OPEN); doc.text('OPEN', KX + 1.6, ky); doc.setFontSize(8); doc.text('still for sale', KX + 13, ky);
    const markC = (x, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...OPEN); doc.text('C', x, y); };
    const markL = (x, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...LAYOUT); doc.text('L', x, y); };
    const lock = (x, y) => { doc.setDrawColor(...AMBER); doc.setLineWidth(0.3); doc.roundedRect(x + 0.35, y - 0.9, 1.1, 1.3, 0.5, 0.5, 'S');
      doc.setFillColor(...AMBER); doc.rect(x, y, 1.8, 1.4, 'F'); };
    markC(KX + 34, ky); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK); doc.text('content done', KX + 36.5, ky);
    markL(KX + 64, ky); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK); doc.text('layout done', KX + 66.2, ky);
    lock(KX + 85, ky - 1.5); doc.text('locked', KX + 88, ky);
    const T = L.total, sig = Math.ceil(T / 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(...INK);
    doc.text([pdfText('Sold: ' + t.sold + ' of ' + t.saleable + ' saleable pages (' + pct(t.sold, t.saleable) + ')'),
      pdfText('Still for sale (OPEN): ' + t.open + ' pages (' + pct(t.open, t.saleable) + ')'),
      pdfText('Content done: ' + t.content + ' of ' + T + ' pages (' + pct(t.content, T) + '), ' + (T - t.content) + ' to go'),
      pdfText('Layout done: ' + t.layout + ' of ' + T + ' pages (' + pct(t.layout, T) + '), ' + (T - t.layout) + ' to go'),
      pdfText('Locked: ' + t.locked + ' pages in ' + t.lockedItems + ' items'),
      pdfText(sig + ' sections of 16 = ' + sig * 16 + ' pages'),
      'Live board: orient-alt.github.io/mecsr-directory-2027'], KX, ky + 8, {lineHeightFactor: 1.55});
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...(T % 2 ? RED : OPEN));
    doc.text(pdfText(T % 2 ? 'Page balance: odd (' + T + '). Add or remove 1 page.' : 'Page balance: even (' + T + ').'), KX, ky + 42);
    if (L.warnings.split.length || L.warnings.moved.length) {
      doc.setTextColor(...RED);
      doc.text(pdfText((L.warnings.split.length ? L.warnings.split.length + ' spread(s) split. ' : '') + (L.warnings.moved.length ? L.warnings.moved.length + ' locked item(s) moved.' : '')), KX, ky + 47);
    }
    // the board, in boxes, spread by spread
    const PER_ROW = 8, CW = 13.2, CH = 16, GAP = 3.4, ROWH = 20.5, X0 = M + 34;
    const rows = [];
    L.secs.forEach(s => {
      const spreads = []; let p = s.from;
      if (p === 1) { spreads.push([1]); p = 2; }
      while (p <= s.to) { if (p + 1 <= s.to && p % 2 === 0) { spreads.push([p, p + 1]); p += 2; } else { spreads.push([p]); p += 1; } }
      for (let k = 0; k < spreads.length; k += PER_ROW) rows.push({s, first: k === 0, spreads: spreads.slice(k, k + PER_ROW)});
    });
    function wrap(text, maxW){          // break long words where BREAKS allows, with a visible hyphen
      const words = text.split(' ').map(w => doc.getTextWidth(w) > maxW && BREAKS[w] ? BREAKS[w].split('|').map((x, i, a) => i < a.length - 1 ? x + '-' : x).join(' ') : w);
      return doc.splitTextToSize(words.join(' '), maxW);
    }
    function chip(p, x, y){
      const it = L.P2I[p], k = p - it.from, c = k < it.contentPages, l = k < it.layoutPages;
      doc.setFillColor(...(it.open ? OPENBG : [255, 255, 255])); doc.rect(x, y, CW, CH, 'F');
      doc.setFillColor(...(it.open ? OPEN : rgb(TYPE_COLOR[it.type] || '#8A9099'))); doc.rect(x, y, 0.8, CH, 'F');
      if (it.open) { doc.setDrawColor(...OPEN); doc.setLineWidth(0.25); doc.setLineDashPattern([0.6, 0.5], 0); doc.rect(x + 0.2, y + 0.2, CW - 0.4, CH - 0.4, 'S'); doc.setLineDashPattern([], 0); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(...MUTE); doc.text(String(p), x + 1.6, y + 2.6);
      if (it.locked) lock(x + CW - 2.7, y + 1.4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.2); doc.setTextColor(...INK);
      const lines = wrap(pdfText(shortLabel(it)), CW - 2.4).slice(0, it.open || c || l ? 3 : 4);
      doc.text(lines, x + 1.6, y + 5.1, {lineHeightFactor: 1.15});
      if (it.open) { doc.setFontSize(4.8); doc.setTextColor(...OPEN); doc.text('OPEN', x + 1.6, y + CH - 1.2); }
      if (c) markC(x + CW - (l ? 4.2 : 2.1), y + CH - 1.2);
      if (l) markL(x + CW - 2.0, y + CH - 1.2);
    }
    doc.addPage(); heading('THE BOARD', M, M + 4);
    let y = M + 9, onPage = 0;
    rows.forEach(r => {
      if (y + CH > BOTTOM) { doc.addPage(); y = M + 2; onPage = 0; }
      if (r.first && onPage > 0) { doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.setLineDashPattern([1, 0.8], 0); doc.line(M, y - 2, W - M, y - 2); doc.setLineDashPattern([], 0); }
      if (r.first || onPage === 0) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...(r.first ? INK : MUTE));
        const name = doc.splitTextToSize(pdfText(secName(r.s.section).toUpperCase() + (r.first ? '' : ', CONTINUED')), 30);
        doc.text(name, M, y + 2.5, {lineHeightFactor: 1.2});
        if (r.first) { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...MUTE);
          doc.text(pdfText('pp ' + pages(r.s.from, r.s.to) + ' · ' + r.s.pp + ' pp'), M, y + 2.9 + name.length * 2.95); }
      }
      let x = X0;
      r.spreads.forEach(sp => {
        const w = sp.length * CW + (sp.length - 1) * 0.25 + 0.5;
        doc.setFillColor(...RULE); doc.rect(x, y, w, CH + 0.5, 'F');
        sp.forEach((p, i) => chip(p, x + 0.25 + i * (CW + 0.25), y + 0.25)); x += w + GAP;
      });
      y += ROWH; onPage++;
    });
    // page by page
    const all = [];
    for (let p = 1; p <= L.total; p++) { const it = L.P2I[p], sm = samplePage(p), k = p - it.from;
      all.push([String(p), p % 2 ? 'R' : 'L', pdfText(secName(it.section)), pdfText(shortLabel(it)), it.open ? 'OPEN' : pdfText(it.sponsor || '–'),
        k < it.contentPages ? 'done' : '–', k < it.layoutPages ? 'done' : '–', it.locked ? 'locked' : '', sm ? String(sm) : '–']); }
    const PER = 34;
    for (let i = 0; i < all.length; i += PER * 2) {
      doc.addPage(); let startY = M + 2;
      if (i === 0) { heading('PAGE BY PAGE', M, M + 4); startY = M + 9; }
      [0, 1].forEach(k => {
        const chunk = all.slice(i + k * PER, i + (k + 1) * PER); if (!chunk.length) return;
        doc.autoTable({startY, margin: k ? {left: W / 2 + 2, right: M} : {left: M, right: W / 2 + 2}, theme: 'plain', pageBreak: 'avoid',
          head: [['Page', 'Side', 'Section', 'Content', 'Status', 'Content', 'Layout', 'Lock', 'v14']], body: chunk,
          styles: {font: 'helvetica', fontSize: 6.4, textColor: INK, overflow: 'ellipsize', cellPadding: {top: 0.9, bottom: 0.9, left: 1.2, right: 1.2},
            lineColor: [234, 237, 241], lineWidth: {bottom: 0.15}},
          headStyles: {fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 5.8},
          columnStyles: {0: {halign: 'right', cellWidth: 8}, 1: {halign: 'center', cellWidth: 7}, 2: {cellWidth: 22}, 4: {cellWidth: 20},
            5: {cellWidth: 10.5}, 6: {cellWidth: 10}, 7: {cellWidth: 9}, 8: {halign: 'right', cellWidth: 8}},
          didParseCell: d => { if (d.section !== 'body') return;
            if (d.row.raw[4] === 'OPEN') { d.cell.styles.fillColor = OPENBG; if (d.column.index === 4) { d.cell.styles.textColor = OPEN; d.cell.styles.fontStyle = 'bold'; } }
            if ((d.column.index === 5 || d.column.index === 6) && d.cell.raw === 'done') { d.cell.styles.textColor = d.column.index === 5 ? OPEN : LAYOUT; d.cell.styles.fontStyle = 'bold'; }
            if (d.column.index === 7 && d.cell.raw === 'locked') d.cell.styles.textColor = AMBER; }});
      });
    }
    // the production timeline
    if (withTimeline()) {
      doc.addPage(); heading('PRODUCTION TIMELINE · RELEASE ' + dLabel(releaseDate()).toUpperCase(), M, M + 4);
      const today = todayISO();
      doc.autoTable({startY: M + 9, margin: {left: M, right: M}, theme: 'grid', rowPageBreak: 'avoid',
        head: [['Phase', 'Task', 'Team', 'Start', 'Due', 'Status', 'Done', 'Notes']],
        body: TL.rows.map(r => [pdfText(r.phase), pdfText(r.task), pdfText(r.team), dLabel(r.start), dLabel(r.due),
          r.status + (r.status !== 'Done' && r.due < today ? ' (overdue)' : ''), r.done ? 'Yes' : '', pdfText(r.notes)]),
        styles: {font: 'helvetica', fontSize: 7.4, textColor: INK, lineColor: RULE, lineWidth: 0.15, cellPadding: {top: 1.2, bottom: 1.2, left: 1.8, right: 1.8}},
        headStyles: {fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 6.8},
        columnStyles: {0: {cellWidth: 32}, 1: {cellWidth: 74}, 2: {cellWidth: 22}, 3: {cellWidth: 20}, 4: {cellWidth: 20}, 5: {cellWidth: 26}, 6: {cellWidth: 11, halign: 'center'}},
        didParseCell: d => { if (d.section !== 'body' || d.column.index !== 5) return; const v = String(d.cell.raw || '');
          if (v === 'Done') d.cell.styles.textColor = OPEN; else if (/Delayed|overdue/.test(v)) { d.cell.styles.textColor = RED; d.cell.styles.fontStyle = 'bold'; } }});
    }
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTE);
      doc.text(pdfText('MECSR Directory 2027 · Flat plan · as of ' + fmtTime(now) + ' Dubai · orient-alt.github.io/mecsr-directory-2027'), M, H - 6);
      doc.text('Page ' + i + ' of ' + n, W - M, H - 6, {align: 'right'});
    }
    doc.save('MECSR_2027_Flat_Plan_' + fileStamp(now) + '.pdf');
  });
}

/* ---------------- tabs ---------------- */
const tabs = [...document.querySelectorAll('.tab')];
function selectTab(i, focus){
  tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; el('p' + j).hidden = j !== i; });
  if (focus) tabs[i].focus();
  try { history.replaceState(null, '', i === 1 ? '#timeline' : location.pathname + location.search); } catch (e) {}
  if (i === 1) renderTimeline();
}
tabs.forEach((t, i) => t.addEventListener('click', () => selectTab(i)));
document.querySelector('nav.tabs').addEventListener('keydown', ev => {
  const i = tabs.indexOf(document.activeElement); if (i < 0) return;
  let n = null;
  if (ev.key === 'ArrowRight') n = (i + 1) % tabs.length; if (ev.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
  if (ev.key === 'Home') n = 0; if (ev.key === 'End') n = tabs.length - 1;
  if (n !== null) { ev.preventDefault(); selectTab(n, true); }
});
if (/^#timeline$/i.test(location.hash)) selectTab(1);
el('tlGate').addEventListener('click', ev => { if (ev.target.closest('#tlSignIn')) el('btnSignIn').click(); });

/* ---------------- start ---------------- */
async function boot(){
  window.addEventListener('load', () => setTimeout(loadProofs, 600));
  const seed = cleanItems((window.PLAN_SEED && window.PLAN_SEED.items) || []);
  const tlSeed = cleanRows((window.TIMELINE_SEED && window.TIMELINE_SEED.rows) || []);
  setState(seed, {updatedAt: null, version: 0, seed: true});
  const cfg = window.FIREBASE_CONFIG;
  if (cfg && cfg.apiKey && cfg.projectId) {
    try { store = await LiveStore.create(cfg, seed, tlSeed); }
    catch (e) { console.warn('Firebase could not load', e); store = new ReadOnlyStore(); renderToolbar(); renderTimeline(); return; }
    store.collab = {notes: onNotes, chat: onChat, people: onPeople, timeline: st => setTimeline(st.rows, st.meta),
      reset: () => { collabReset(); TL.rows = null; },
      error: (what, e) => toast('The ' + what + ' could not be read: ' + friendly(e), true)};
    store.subscribe(st => setState(st.items, st.meta), err => { console.warn('The shared plan could not be read', err); toast('The shared plan could not be read: ' + friendly(err), true); });
    store.onUser(() => {
      if (editing && !store.canEdit()) editing = false;
      if (!store.canEdit()) { collabReset(); TL.rows = null; }
      render(); renderTimeline(); renderChatShell(); if (pv.open) show(cur);
    });
  } else {
    store = new PracticeStore(seed, tlSeed);
    store.subscribe(st => setState(st.items, st.meta));
    store.subscribeTimeline(st => setTimeline(st.rows, st.meta));
  }
  renderToolbar(); renderTimeline(); renderChatShell();
}
window.__flatplan = {S, TL, C, OPS, TOPS, layout, summarise, get store(){ return store; }};
boot();
})();
