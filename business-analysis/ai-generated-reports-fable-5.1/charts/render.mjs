// Renders charts/*.svg from data/*.csv. No dependencies: node charts/render.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'data');

const C = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', magenta: '#e87ba4', ink: '#0b0b0b', ink2: '#52514e', muted: '#6b6a66', grid: '#e1e0d9', axis: '#a8a79f', card: '#ffffff' };
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const W = 960, H = 540;

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...b] = rows;
  return b.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const load = id => parseCSV(fs.readFileSync(path.join(dataDir, id + '.csv'), 'utf8'));
const num = s => { const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = n => n >= 1000 ? n.toLocaleString('en-US') : (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 13}" fill="${o.fill || C.ink2}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}>${esc(s)}</text>`;
// wrap by approximate char width
function wrap(s, maxPx, size) {
  const cw = size * 0.55, max = Math.max(4, Math.floor(maxPx / cw));
  const words = s.split(/\s+/), out = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) out.push(cur); return out;
}

function frame(title, subtitle, source, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}" font-family="${FONT}">
<title>${esc(title)}</title>${defs}
<rect width="${W}" height="${H}" rx="8" fill="${C.card}" stroke="#d8d7d0"/>
${T(32, 40, title, { size: 21, fill: C.ink, weight: 600 })}
${T(32, 62, subtitle, { size: 13.5, fill: C.ink2 })}
${body}
${T(32, H - 16, source, { size: 11, fill: C.muted })}
</svg>
`;
}
const out = (id, svg) => fs.writeFileSync(path.join(here, id + '.svg'), svg);
const legend = (items, x, y) => { let cx = x; return items.map(([c, l, kind]) => { const w = 28 + l.length * 6.6;
  const g = kind === 'line' ? `<line x1="${cx}" y1="${y}" x2="${cx + 18}" y2="${y}" stroke="${c}" stroke-width="2.5"/><circle cx="${cx + 9}" cy="${y}" r="3.5" fill="${c}"/>` : `<circle cx="${cx + 6}" cy="${y}" r="6" fill="${c}"/>`;
  const s = g + T(cx + 22, y + 4.5, l, { size: 12.5 }); cx += w + 18; return s; }).join(''); };

// ---------- 1 market estimates (dot plot, log x)
{
  const rows = load('market-estimates-spread').map(r => ({ name: r['Estimate'].replace(/"/g, ''), scope: r['Scope'], v: num(r['USD B']), yr: r['Year'] }));
  const grp = s => /labels/.test(s) ? 0 : /\ball\b/.test(s) ? 3 : /payments/.test(s) ? 2 : 1;
  const names = ['Physical QR labels', 'QR generator / solution software', 'QR code payments', 'All QR codes (incl. payments)'];
  const cols = [C.magenta, C.blue, C.orange, C.aqua];
  rows.sort((a, b) => a.v - b.v);
  const L = 250, R = 900, top = 110, bot = 440, lo = Math.log10(0.5), hi = Math.log10(30);
  const X = v => L + (Math.log10(v) - lo) / (hi - lo) * (R - L);
  const rh = (bot - top) / rows.length;
  let b = legend(names.map((n, i) => [cols[i], n]), 32, 88);
  for (const t of [0.5, 1, 2, 5, 10, 20]) b += `<line x1="${X(t)}" y1="${top - 6}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, '$' + t + 'B', { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${bot}" x2="${R}" y2="${bot}" stroke="${C.axis}"/>`;
  b += T((L + R) / 2, bot + 42, 'Estimated market size, USD billions (log scale)', { anchor: 'middle', size: 12.5 });
  rows.forEach((r, i) => { const y = top + rh * (i + .5), c = cols[grp(r.scope)];
    b += `<line x1="${L}" y1="${y}" x2="${X(r.v)}" y2="${y}" stroke="${C.grid}" stroke-dasharray="2 3"/>`;
    b += T(L - 12, y + 4, r.name, { anchor: 'end', size: 12.5, fill: C.ink });
    b += `<circle cx="${X(r.v)}" cy="${y}" r="7" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    const lab = `${r.scope} (${r.yr})  $${r.v}B`;
    b += r.v > 4 ? T(X(r.v) - 14, y + 4, lab, { size: 11.5, anchor: 'end' }) : T(X(r.v) + 14, y + 4, `$${r.v}B  ${r.scope} (${r.yr})`, { size: 11.5 }); });
  out('market-estimates-spread', frame('Published QR market-size estimates span 15x because scopes differ',
    'Market size in USD billions by publisher, years 2023-2026, log scale; data as of 2026-10-30',
    'Source: publisher report listings and secondary relays as cited in the report (section 3); see data/market-estimates-spread.csv.', b));
}

// ---------- horizontal bars helper
function hbars({ id, title, subtitle, source, rows, xmax, ticks, xlabel, labelFn, color, markers, extra = '' }) {
  const L = 270, R = 880, top = 100, bot = 430;
  const X = v => L + v / xmax * (R - L), rh = (bot - top) / rows.length, bh = Math.min(26, rh * .6);
  let b = extra;
  for (const t of ticks) b += `<line x1="${X(t)}" y1="${top - 6}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, '$' + t, { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${top - 6}" x2="${L}" y2="${bot}" stroke="${C.axis}"/>`;
  b += T((L + R) / 2, bot + 44, xlabel, { anchor: 'middle', size: 12.5 });
  rows.forEach((r, i) => { const y = top + rh * (i + .5);
    b += T(L - 12, y + 4, r.label, { anchor: 'end', size: 12.5, fill: C.ink });
    const w = Math.max(r.v > 0 ? 3 : 0, X(r.v) - L);
    b += r.v > 0 ? `<path d="M${L} ${y - bh / 2}H${L + w - 4}a4 4 0 0 1 4 4v${bh - 8}a4 4 0 0 1 -4 4H${L}z" fill="${color(r)}"/>` : `<rect x="${L}" y="${y - 1}" width="3" height="2" fill="${C.axis}"/>`;
    if (markers && r.m != null) b += `<path d="M${X(r.m)} ${y - 9}l6 9l-6 9l-6 -9z" fill="${C.orange}" stroke="#fff" stroke-width="1.5"/>`;
    const lx = Math.max(X(r.v), markers && r.m != null ? X(r.m) + 6 : 0) + 12;
    b += T(lx, y + 4, labelFn(r), { size: 12 }); });
  out(id, frame(title, subtitle, source, b));
}

// ---------- 2 competitor price
{
  const rows = load('competitor-price-10-codes').map(r => ({ label: r['Vendor'], a: Number.isNaN(num(r['Annual-billed $/mo'])) || /n\/a/.test(r['Annual-billed $/mo']) ? null : num(r['Annual-billed $/mo']), m: /n\/a/.test(r['Monthly-billed $/mo']) ? null : num(r['Monthly-billed $/mo']) }));
  rows.forEach(r => { r.v = r.a ?? r.m; r.monthlyOnly = r.a == null; if (r.a == null) r.m = null; r.mm = r.m; });
  const src = load('competitor-price-10-codes');
  rows.forEach((r, i) => { r.m = /n\/a/.test(src[i]['Monthly-billed $/mo']) ? null : num(src[i]['Monthly-billed $/mo']); if (r.a == null) r.m = null; });
  rows.sort((a, b) => a.v - b.v);
  hbars({ id: 'competitor-price-10-codes', title: 'The cheapest 10-code plan costs $0 to $29 a month',
    subtitle: 'USD per month, cheapest plan fitting 10 dynamic codes with analytics; prices fetched 2026-10-30',
    source: 'Source: vendor pricing pages; two via aggregators/snippets (see data/competitor-price-10-codes.csv). Bar = annual-billed price.',
    rows, xmax: 32, ticks: [0, 5, 10, 15, 20, 25, 30], xlabel: 'Price per month, USD', markers: true,
    color: r => r.monthlyOnly ? C.orange : C.blue,
    labelFn: r => r.monthlyOnly ? `$${fmt(r.v)} (monthly-billed only)` : (r.m != null && r.m !== r.v ? `$${fmt(r.v)} annual  ·  $${fmt(r.m)} monthly` : `$${fmt(r.v)}`),
    extra: legend([[C.blue, 'Annual-billed price'], [C.orange, 'Monthly-billed only']], 32, 84) + `<path d="M${420} 78l6 9l-6 9l-6 -9z" fill="${C.orange}"/>` + T(434, 88, 'Monthly-billed price where also published', { size: 12.5 }) });
}

// ---------- 3 custom domain
{
  const rows = load('custom-domain-tiers').map(r => ({ label: r['Vendor'], v: num(r['Lowest $/mo with custom domain']), ver: r['Verification'], basis: r['Basis'] }));
  rows.sort((a, b) => a.v - b.v);
  const short = v => /unverified/.test(v) ? 'unverified at checkout' : /derived/.test(v) ? 'derived, aggregator + vendor' : /aggregator/.test(v) ? 'aggregator' : /Partners/.test(v) ? 'vendor page; tied to Partners toggle' : 'vendor page';
  hbars({ id: 'custom-domain-tiers', title: 'Custom domains start at $29 a month at the cheapest verified vendor',
    subtitle: 'USD per month at the lowest tier including a custom domain; prices fetched 2026-10-30',
    source: 'Source: vendor pricing pages and aggregators (see data/custom-domain-tiers.csv). Uniqode: ~$99 Plus + $2,000/yr add-on / 12 (derived).',
    rows, xmax: 450, ticks: [0, 100, 200, 300, 400], xlabel: 'Lowest monthly price with a custom domain, USD',
    color: r => /unverified|derived/.test(r.ver) ? C.orange : C.blue,
    labelFn: r => `${/derived/.test(r.ver) ? '~' : ''}$${fmt(r.v)}  ·  ${short(r.ver)}`,
    extra: legend([[C.blue, 'Vendor page or aggregator listing'], [C.orange, 'Unverified or derived']], 32, 84) });
}

// ---------- 4 scorecard
{
  const rows = load('model-comparison-scorecard');
  const cols = ['(1) Hosted SaaS', '(2) Open-core + cloud', '(3) Hardware + service'];
  const x0 = 32, mw = 200, cw = (W - 64 - mw) / 3, top = 108, hh = 30, avail = 380 - hh;
  const size = 11.5, lh = 14;
  const wrapped = rows.map(r => cols.map(c => wrap(r[c], cw - 16, size)));
  const heights = wrapped.map(w => Math.max(...w.map(a => a.length), 2) * lh + 22);
  const scale = Math.min(1, avail / heights.reduce((a, b) => a + b, 0));
  let b = '', y = top;
  b += `<rect x="${x0}" y="${y}" width="${W - 64}" height="${hh}" fill="#efeee9"/>` + T(x0 + 8, y + 20, 'Metric', { size: 12.5, fill: C.ink, weight: 600 });
  cols.forEach((c, i) => b += T(x0 + mw + cw * i + 8, y + 20, c, { size: 12.5, fill: C.ink, weight: 600 }));
  y += hh;
  rows.forEach((r, ri) => { const h = heights[ri] * scale;
    b += `<line x1="${x0}" y1="${y + h}" x2="${W - 32}" y2="${y + h}" stroke="${C.grid}"/>`;
    wrap(r['Metric'], (mw - 14) * .85, size + .5).forEach((ln, k) => b += T(x0 + 8, y + 18 + k * lh, ln, { size: size + .5, fill: C.ink, weight: 600 }));
    cols.forEach((c, ci) => { const txt = r[c], has = /\d/.test(txt) && !/^No evidence/.test(txt);
      const bx = x0 + mw + cw * ci + 2;
      b += `<rect x="${bx}" y="${y + 2}" width="${cw - 4}" height="${h - 4}" rx="3" fill="${has ? '#cde2fb' : '#f4f3ef'}"/>`;
      wrapped[ri][ci].forEach((ln, k) => b += T(bx + 6, y + 18 + k * lh, ln, { size, fill: has ? C.ink : C.muted })); });
    y += h; });
  b += legend([['#cde2fb', 'Cell holds a sourced or derived number'], ['#f4f3ef', 'No number, or no evidence found']], 32, 90);
  out('model-comparison-scorecard', frame('Open-core wins on fit, not on margin',
    'Key sourced metrics for three business models; USD unless stated; data as of 2026-10-30',
    'Source: vendor pages, GitHub APIs, Plausible, Flippa and teardown articles as cited in the report (section 5); see data/model-comparison-scorecard.csv.', b));
}

// ---------- 5 hosting (line, log x)
{
  const rows = load('hosting-cost-vs-traffic'); const keys = Object.keys(rows[0]).slice(1, 6);
  const xs = rows.map(r => num(r['Redirects / month'])); // 1,10,100 (M)
  const L = 90, R = 640, top = 100, bot = 430, ymin = Math.log10(0.005), ymax = Math.log10(200);
  const X = i => L + 40 + i * (R - L - 80) / 2, Y = v => bot - (Math.log10(v) - ymin) / (ymax - ymin) * (bot - top);
  const cols = [C.blue, C.orange, C.aqua, C.magenta, '#6250d6'];
  const names = ['Cloud Run requests', 'Cloud Run + assumed CPU', 'Fly egress', 'Hetzner VM (EUR, fixed)', 'Fly app + Managed Postgres'];
  let b = '';
  for (const t of [0.01, 0.1, 1, 10, 100]) b += `<line x1="${L}" y1="${Y(t)}" x2="${R}" y2="${Y(t)}" stroke="${C.grid}"/>` + T(L - 10, Y(t) + 4, '$' + t, { anchor: 'end', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${bot}" x2="${R}" y2="${bot}" stroke="${C.axis}"/>`;
  rows.forEach((r, i) => b += T(X(i), bot + 20, r['Redirects / month'] + ' redirects', { anchor: 'middle', size: 12 }));
  b += T((L + R) / 2, bot + 44, 'Redirects per month (log scale)', { anchor: 'middle', size: 12.5 });
  b += T(24, (top + bot) / 2, 'USD per month (log scale)', { anchor: 'middle', size: 12.5, rot: -90 });
  const endY = [];
  keys.forEach((k, ki) => { const vals = rows.map(r => num(r[k])); const pts = vals.map((v, i) => [X(i), Y(v)]);
    b += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${cols[ki]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach(p => b += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${cols[ki]}" stroke="#fff" stroke-width="1.5"/>`);
    endY.push({ y: pts[2][1], t: `${names[ki]}: $${fmt(vals[2])}${/volume/.test(rows[2][k]) ? '+' : ''}`, c: cols[ki] }); });
  endY.sort((a, b) => a.y - b.y); for (let i = 1; i < endY.length; i++) if (endY[i].y - endY[i - 1].y < 17) endY[i].y = endY[i - 1].y + 17;
  endY.forEach(e => b += `<circle cx="${R + 22}" cy="${e.y}" r="5" fill="${e.c}"/>` + T(R + 32, e.y + 4, e.t, { size: 12 }));
  b += T(R + 22, 92, 'Cost at 100M redirects / month', { size: 12.5, fill: C.ink, weight: 600 });
  out('hosting-cost-vs-traffic', frame('Hosting cost is not the constraint: under $80 a month at 100M redirects',
    'Monthly infrastructure cost in USD (Hetzner in EUR) at 1M, 10M and 100M redirects per month; unit prices fetched 2026-10-30',
    'Source: Cloud Run, Fly.io, Hetzner price lists; derived in report section 6. Fly Postgres "~44 + volume" at 100M plotted as 44.', b));
}

// ---------- 6 churn dumbbell
{
  const rows = load('churn-by-arpa').map(r => ({ b: r['Benchmark'], seg: r['Price band / segment'], lo: num(r['Monthly churn low (%)']), hi: num(r['Monthly churn high (%)']), st: r['Source type'] }));
  rows.sort((a, b) => (a.lo + a.hi) - (b.lo + b.hi));
  const L = 330, R = 880, top = 100, bot = 420, X = v => L + v / 8 * (R - L), rh = (bot - top) / rows.length;
  const colOf = st => /self-reported/.test(st) ? C.orange : /vendor/.test(st) ? C.blue : C.aqua;
  let b = legend([[C.blue, 'Vendor (analytics provider)'], [C.aqua, 'Secondary'], [C.orange, 'Self-reported (Flippa listing)']], 32, 84);
  for (let t = 0; t <= 8; t++) b += `<line x1="${X(t)}" y1="${top - 6}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, t + '%', { anchor: 'middle', size: 12, fill: C.muted });
  b += T((L + R) / 2, bot + 44, 'Monthly logo churn, % of customers per month', { anchor: 'middle', size: 12.5 });
  rows.forEach((r, i) => { const y = top + rh * (i + .5), c = colOf(r.st);
    b += T(L - 14, y - 1, r.seg, { anchor: 'end', size: 12.5, fill: C.ink });
    b += T(L - 14, y + 13, r.b, { anchor: 'end', size: 11, fill: C.muted });
    if (r.lo !== r.hi) b += `<line x1="${X(r.lo)}" y1="${y}" x2="${X(r.hi)}" y2="${y}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
    b += `<circle cx="${X(r.lo)}" cy="${y}" r="7" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    if (r.lo !== r.hi) b += `<circle cx="${X(r.hi)}" cy="${y}" r="7" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    b += T(X(r.hi) + 14, y + 4, r.lo === r.hi ? `${r.lo}%` : `${r.lo}-${r.hi}%`, { size: 12 }); });
  out('churn-by-arpa', frame('Cheaper plans churn faster: 6-7% a month under $10, 1-2% above $500',
    'Monthly logo churn benchmarks, low to high, by price band or segment; as published through 2026-10-30',
    'Source: ChartMogul, ProfitWell via Lenny\'s Newsletter, Kalungi, Flippa listings (see data/churn-by-arpa.csv). Not directly comparable: definitions vary.', b));
}

// ---------- 7 scenarios
{
  const rows = load('scenario-mrr-24mo'); const keys = Object.keys(rows[0]).slice(1);
  const names = ['Conservative', 'Base', 'Optimistic'], cols = [C.aqua, C.blue, C.orange];
  const L = 90, R = 760, top = 100, bot = 430, X = m => L + m / 24 * (R - L), Y = v => bot - v / 4000 * (bot - top);
  let b = '';
  for (let t = 0; t <= 4000; t += 1000) b += `<line x1="${L}" y1="${Y(t)}" x2="${R}" y2="${Y(t)}" stroke="${C.grid}"/>` + T(L - 10, Y(t) + 4, '$' + fmt(t), { anchor: 'end', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${bot}" x2="${R}" y2="${bot}" stroke="${C.axis}"/>`;
  for (let m = 0; m <= 24; m += 3) b += T(X(m), bot + 20, m, { anchor: 'middle', size: 12, fill: C.muted });
  b += T((L + R) / 2, bot + 44, 'Month after launch', { anchor: 'middle', size: 12.5 });
  b += T(24, (top + bot) / 2, 'Modelled MRR, USD', { anchor: 'middle', size: 12.5, rot: -90 });
  keys.forEach((k, ki) => { const pts = [[0, 0], ...rows.map(r => [num(r['Month']), num(r[k])])];
    b += `<polyline points="${pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="${cols[ki]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.slice(1).forEach(p => b += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="${cols[ki]}" stroke="#fff" stroke-width="1.5"/>`);
    const l = pts[pts.length - 1];
    b += `<circle cx="${X(24)}" cy="${Y(l[1])}" r="6" fill="${cols[ki]}" stroke="#fff" stroke-width="2"/>` + T(X(24) + 14, Y(l[1]) - 2, `$${fmt(l[1])}`, { size: 14, fill: C.ink, weight: 600 }) + T(X(24) + 14, Y(l[1]) + 14, names[ki], { size: 12 }); });
  b += legend(names.map((n, i) => [cols[i], n, 'line']), 32, 84);
  out('scenario-mrr-24mo', frame('Open-core cloud path reaches $150 to $3,700 MRR after 24 months',
    'Modelled monthly recurring revenue in USD, months 0-24; values derived from the report\'s assumptions (section 7), as of 2026-10-30',
    'Source: report model (derived; assumptions table in section 7); see data/scenario-mrr-24mo.csv. Month 0 assumed $0.', b));
}

// ======================= companion report: field device applications =======================
const ink = (x, y, s, o = {}) => T(x, y, s, { fill: C.ink, ...o });
const nz = s => s !== '' && !Number.isNaN(Number(s));
// generic range chart: rows {label, sub, lo, hi, color, text, note}; scale lin|log
function rangeChart({ id, title, subtitle, source, rows, scale = 'lin', min, max, ticks, tickFmt, xlabel, extra = '', L = 270, R = 880, top = 104, bot = 430, bar = true }) {
  const X = v => L + (scale === 'log' ? (Math.log10(Math.max(v, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (v - min) / (max - min)) * (R - L);
  const rh = (bot - top) / rows.length;
  let b = extra;
  for (const t of ticks) b += `<line x1="${X(t)}" y1="${top - 6}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, tickFmt(t), { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${top - 6}" x2="${L}" y2="${bot}" stroke="${C.axis}"/>`;
  b += T((L + R) / 2, bot + 44, xlabel, { anchor: 'middle', size: 12.5 });
  rows.forEach((r, i) => {
    const y = top + rh * (i + .5);
    if (r.sub) { b += ink(L - 12, y - 1, r.label, { anchor: 'end', size: 12.5 }) + T(L - 12, y + 13, r.sub, { anchor: 'end', size: 11, fill: C.muted }); }
    else b += ink(L - 12, y + 4, r.label, { anchor: 'end', size: 12.5 });
    if (r.lo == null) { b += T(L + 12, y + 4, r.note, { size: 12, fill: C.muted }); return; }
    const x1 = X(r.lo), x2 = X(r.hi);
    if (r.hi > r.lo) {
      b += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${r.color}" stroke-width="${bar ? 10 : 4}" stroke-linecap="round"/>`;
      b += `<circle cx="${x1}" cy="${y}" r="7" fill="${r.color}" stroke="#fff" stroke-width="2"/><circle cx="${x2}" cy="${y}" r="7" fill="${r.color}" stroke="#fff" stroke-width="2"/>`;
      b += T(x2 + 14, y + 4, `${r.loText} to ${r.hiText}` + (r.note ? '  ' + r.note : ''), { size: 12 });
    } else {
      b += `<circle cx="${x1}" cy="${y}" r="7" fill="${r.color}" stroke="#fff" stroke-width="2"/>`;
      b += T(x1 + 14, y + 4, r.loText + (r.note ? '  ' + r.note : ''), { size: 12 });
    }
  });
  out(id, frame(title, subtitle, source, b));
}
const usd = n => '$' + (Number.isInteger(n) ? fmt(n) : n.toLocaleString('en-US', { minimumFractionDigits: 2 }));

// ---------- 8 campaign tool pricing
{
  const rows = load('campaign-tool-pricing').map(r => {
    const cur = r['Currency'], sym = cur === 'EUR' ? 'EUR ' : '$', ev = r['Evidence'];
    const col = /^vendor/.test(ev) ? C.blue : /^aggregator/.test(ev) ? C.orange : C.aqua;
    const per = /user/.test(r['Per']) ? ' / user' : '';
    const has = nz(r['Low']);
    return { label: r['Tool'].replace(/ \(sign pin \+ QR\)/, ''), sub: r['Tier or basis'].replace('(page calculator)', '(calculator, conflicts)'),
      lo: has ? +r['Low'] : null, hi: has ? +r['High'] : null, color: col, loText: sym + fmt(+r['Low']), hiText: sym + fmt(+r['High']), note: has ? per : 'No price found (included in plan)', _hi: has ? +r['High'] : 1e9 };
  });
  rows.sort((a, b) => a._hi - b._hi);
  rangeChart({ id: 'campaign-tool-pricing', title: 'Campaign and canvassing tools list at $34 to $1,299 a month',
    subtitle: 'Listed price in USD per month (Campaign Sidekick, NGP VAN per user; Ecanvasser Starter/Standard in EUR); 2026-10-30/31',
    source: 'Source: vendor pricing pages and aggregator listings (see data/campaign-tool-pricing.csv). Ecanvasser plan cards and page calculators conflict; both shown.',
    rows, scale: 'lin', min: 0, max: 1400, L: 300, ticks: [0, 200, 400, 600, 800, 1000, 1200], tickFmt: t => '$' + t, xlabel: 'Listed price per month, USD (one dot per listed figure; bar = range)', bar: true,
    extra: legend([[C.blue, 'Vendor page'], [C.orange, 'Aggregator'], [C.aqua, 'Secondary (2022)']], 32, 84) });
}

// ---------- 9 hunt platform pricing (log, bars)
{
  const rows = load('hunt-platform-pricing').filter(r => nz(r['Plot value'])).map(r => {
    const v = +r['Plot value'], eur = r['Currency'] === 'EUR', up = r['Bound'] === 'upper', sym = eur ? 'EUR ' : '$';
    return { label: r['Platform'], sub: r['Unit'].replace(/^per team.*/, '') + (r['Unit'] ? '' : ''), v, eur, up, txt: `${up ? '< ' : ''}${sym}${v < 10 ? v.toFixed(2) : fmt(v)}  per ${r['Plot unit']}` };
  });
  rows.sort((a, b) => b.v - a.v);
  const L = 270, R = 800, top = 104, bot = 396, lo = Math.log10(0.1), hi = Math.log10(100);
  const X = v => L + (Math.log10(v) - lo) / (hi - lo) * (R - L), rh = (bot - top) / rows.length, bh = Math.min(24, rh * .6);
  let b = legend([[C.blue, 'USD'], [C.orange, 'EUR (not converted)']], 32, 84);
  for (const t of [0.1, 1, 10, 100]) b += `<line x1="${X(t)}" y1="${top - 6}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, '$' + t, { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${top - 6}" x2="${L}" y2="${bot}" stroke="${C.axis}"/>`;
  b += T((L + R) / 2, bot + 44, 'Price per participant, per event unless noted (log scale; bars start at 0.1)', { anchor: 'middle', size: 12.5 });
  rows.forEach((r, i) => { const y = top + rh * (i + .5), c = r.eur ? C.orange : C.blue, w = X(r.v) - L;
    b += ink(L - 12, y - 1, r.label, { anchor: 'end', size: 12.5 }) + T(L - 12, y + 13, r.sub, { anchor: 'end', size: 11, fill: C.muted });
    b += `<path d="M${L} ${y - bh / 2}H${L + w - 4}a4 4 0 0 1 4 4v${bh - 8}a4 4 0 0 1 -4 4H${L}z" fill="${c}"${r.up ? ' fill-opacity="0.45"' : ''}/>`;
    b += T(X(r.v) + 12, y + 4, r.txt, { size: 12 }); });
  b += T(32, 476, 'Not plotted (no per-participant price derivable): Loquiz EUR 9 per team per month, or EUR 600 a year + EUR 5 per team;', { size: 11.5, fill: C.ink2 }) + T(32, 493, 'Scavify packages $995 / $1,995 (aggregator).', { size: 11.5, fill: C.ink2 });
  out('hunt-platform-pricing', frame('Hunt platforms charge about $1 to $10 per participant',
    'Derived price per participant, per event (Geocaching: per player per year; Niantic: per daily unique visit); found 2026-10-30/31',
    'Source: vendor pricing pages, one aggregator, one secondary (see data/hunt-platform-pricing.csv). Actionbound tiers are volume prices; Niantic is an upper bound.', b));
}

// ---------- 10 device cost ladder (log range)
{
  const rows = load('printer-and-device-cost-ladder').map(r => {
    const lo = +r['Low'], hi = +r['High'], ret = /retailer/.test(r['Basis']);
    return { label: r['Option'], sub: r['Basis'].replace(/ \(.*\)/, ''), lo: lo || 1e-9, hi: hi || 1e-9, zero: lo === 0, color: ret ? C.blue : C.orange, loText: usd(lo), hiText: usd(hi), _lo: lo };
  }).sort((a, b) => a._lo - b._lo);
  rows.forEach(r => { if (r.zero) { r.lo = 10; r.hi = 10; r.loText = '$0 in the field'; r.zeroDot = true; } });
  rangeChart({ id: 'printer-and-device-cost-ladder', title: 'Off-the-shelf kits cost $52 to $600; rugged devices start near $1,000',
    subtitle: 'Upfront hardware cost per field kit in USD, phone excluded, log scale; low to high where a range is listed; found 2026-10-30/31',
    source: 'Source: retailer listings; custom-device rows are assumption or derived (see data/printer-and-device-cost-ladder.csv). Pre-printed codes cost $0 in the field.',
    rows, scale: 'log', min: 10, max: 5000, ticks: [10, 100, 1000], tickFmt: t => '$' + fmt(t), xlabel: 'Upfront cost, USD (log scale)', L: 290, R: 800,
    extra: legend([[C.blue, 'Retailer price'], [C.orange, 'Assumption or derived']], 32, 84) });
}

// ---------- 11 label media: cost (log) and outdoor life (years)
{
  const rows = load('label-media-cost-and-life');
  const x0 = 32, L1 = 300, R1 = 520, L2 = 600, R2 = 800, top = 118, bot = 430, rh = (bot - top) / rows.length;
  const lo1 = Math.log10(0.01), hi1 = Math.log10(10);
  const X1 = v => L1 + (Math.log10(v) - lo1) / (hi1 - lo1) * (R1 - L1), X2 = v => L2 + v / 12 * (R2 - L2);
  let b = legend([[C.blue, 'Retailer price / vendor rating'], [C.aqua, 'Independent-leaning guide, harsh conditions']], 32, 84);
  b += ink(L1, 108, 'Cost per label, USD (log)', { size: 12.5, weight: 600 }) + ink(L2, 108, 'Claimed outdoor life, years', { size: 12.5, weight: 600 });
  for (const t of [0.01, 0.1, 1, 10]) b += `<line x1="${X1(t)}" y1="${top}" x2="${X1(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X1(t), bot + 18, '$' + t, { anchor: 'middle', size: 12, fill: C.muted });
  for (const t of [0, 3, 6, 9, 12]) b += `<line x1="${X2(t)}" y1="${top}" x2="${X2(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X2(t), bot + 18, t, { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L1}" y1="${top}" x2="${L1}" y2="${bot}" stroke="${C.axis}"/><line x1="${L2}" y1="${top}" x2="${L2}" y2="${bot}" stroke="${C.axis}"/>`;
  const dot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="#fff" stroke-width="2"/>`;
  const seg = (xa, xb, y, c) => `<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  rows.forEach((r, i) => { const y = top + rh * (i + .5);
    b += ink(L1 - 14, y - 1, r['Media'].split(',')[0].replace(/ \(thermal transfer.*/, ''), { anchor: 'end', size: 12.5 });
    const sub = r['Media'].includes(',') ? r['Media'].split(',').slice(1).join(',').trim() : /ribbon/.test(r['Media']) ? 'ribbon extra' : '';
    if (sub) b += T(L1 - 14, y + 13, sub, { anchor: 'end', size: 11, fill: C.muted });
    if (nz(r['Cost low'])) { const a = +r['Cost low'], z = +r['Cost high'];
      if (z > a) b += seg(X1(a), X1(z), y, C.blue) + dot(X1(a), y, C.blue) + dot(X1(z), y, C.blue); else b += dot(X1(a), y, C.blue);
      b += T(X1(z) + 14, y + 4, z > a ? `$${a.toFixed(2)}-${z.toFixed(2)}` : `$${a.toFixed(2)}`, { size: 12 });
    } else b += T(L1 + 12, y + 4, 'cost not found', { size: 12, fill: C.muted });
    if (nz(r['Life low (years)'])) { const a = +r['Life low (years)'], z = +r['Life high (years)'];
      const yy = nz(r['Life 2 low (years)']) ? y - 8 : y;
      if (z > a + 0.3) b += seg(X2(a), X2(z), yy, C.blue) + dot(X2(a), yy, C.blue) + dot(X2(z), yy, C.blue); else b += dot(X2(a), yy, C.blue);
      if (nz(r['Life 2 low (years)'])) { const a2 = +r['Life 2 low (years)'], z2 = +r['Life 2 high (years)']; b += seg(X2(a2), X2(z2), y + 10, C.aqua) + dot(X2(a2), y + 10, C.aqua) + dot(X2(z2), y + 10, C.aqua); b += T(X2(z) + 14, yy + 4, '8-12+ yrs (claim)', { size: 11.5 }) + T(X2(z2) + 14, y + 14, '2-7 yrs', { size: 11.5 }); }
      else b += T(X2(z) + 14, yy + 4, r['Life label'], { size: 12 });
    } else b += T(L2 + 12, y + 4, r['Life label'], { size: 12, fill: C.muted }); });
  out('label-media-cost-and-life', frame('Outdoor-grade labels cost cents more, and last years instead of months',
    'Cost per label in USD (left, log scale) and claimed outdoor life in years (right); two sides share rows; found 2026-10-30/31',
    'Source: retailer prices and vendor ratings (see data/label-media-cost-and-life.csv). Zebra cost not found; 1-3 months plotted as 0.08-0.25 yrs.', b));
}

// ---------- 12 application scorecard (heat matrix)
{
  const rows = load('application-scorecard');
  const cols = ['Price anchor', 'Countable buyers', 'Competing products found in notes', 'Quantified engagement data points', 'Evidence that someone pays for this job (0-3, assessment)', 'Custom device needed'];
  const heads = ['Price anchor', 'Countable buyers', 'Competing products found', 'Engagement data points', 'Pays for this job (0-3)', 'Custom device?'];
  const x0 = 32, widths = [138, 160, 120, 190, 104, 100, 84], top = 108, hh = 34, avail = 396 - hh, size = 11, lh = 13.5;
  const xs = widths.reduce((a, w, i) => (a.push((a[i] || x0) + w), a), [x0]);
  const score = ['#f4f3ef', '#cde2fb', '#8ebcf0', '#2a78d6'];
  const wrapped = rows.map(r => [r['Application'], ...cols.map(c => r[c])].map((t, ci) => wrap(t, widths[ci] - 14, size)));
  const heights = wrapped.map(w => Math.max(...w.map(a => a.length)) * lh + 14);
  const scale = Math.min(1, avail / heights.reduce((a, b) => a + b, 0));
  let b = '', y = top;
  b += `<rect x="${x0}" y="${y}" width="${W - 64}" height="${hh}" fill="#efeee9"/>`;
  ['Application', ...heads].forEach((h, i) => wrap(h, widths[i] - 12, 11.5).forEach((ln, k) => b += T(xs[i] + 8, y + 14 + k * 13, ln, { size: 11.5, fill: C.ink, weight: 600 })));
  y += hh;
  rows.forEach((r, ri) => { const h = Math.max(heights[ri] * scale, 30);
    b += `<line x1="${x0}" y1="${y + h}" x2="${W - 32}" y2="${y + h}" stroke="${C.grid}"/>`;
    wrapped[ri].forEach((lines, ci) => { const bx = xs[ci] + 2, bw = widths[ci] - 4;
      if (ci === 0) { lines.forEach((ln, k) => b += T(bx + 6, y + 16 + k * lh, ln, { size: size + .5, fill: C.ink, weight: 600 })); return; }
      const txt = r[cols[ci - 1]];
      if (ci === 5) { const s = +txt; b += `<rect x="${bx}" y="${y + 2}" width="${bw}" height="${h - 4}" rx="3" fill="${score[s]}"/>` + T(bx + bw / 2, y + h / 2 + 8, txt, { anchor: 'middle', size: 22, fill: s === 3 ? '#fff' : C.ink, weight: 600 }); return; }
      const has = /\d/.test(txt) && !/not found|not applicable/.test(txt) && ci !== 6;
      b += `<rect x="${bx}" y="${y + 2}" width="${bw}" height="${h - 4}" rx="3" fill="${has ? '#e6f0fc' : '#f4f3ef'}"/>`;
      lines.forEach((ln, k) => b += T(bx + 6, y + 16 + k * lh, ln, { size, fill: has ? C.ink : C.muted })); });
    y += h; });
  b += legend([[score[3], 'Score 3'], [score[2], 'Score 2'], [score[1], 'Score 1'], [score[0], 'Score 0'], ['#e6f0fc', 'Cell holds a number'], ['#cfcec8', 'No number or not found']], 32, 90);
  out('application-scorecard', frame('Only location hunts have clear published prices',
    'Evidence scorecard by application: price anchor, buyers, competitors, engagement data and payment evidence; as of 2026-10-31',
    'Source: vendor pages and sources cited in the report (sections 2-5, 7); scores are the report\'s assessment; see data/application-scorecard.csv.', b));
}

// ---------- 13 capability matrix (heat matrix)
{
  const rows = load('device-vs-sticker-capability-matrix');
  const cols = Object.keys(rows[0]).slice(1, 7);
  const x0 = 32, lw = 196, cw = (W - 64 - lw) / cols.length, top = 104, hh = 58, rh = 48;
  const fillOf = s => s === 1 ? '#2a78d6' : s === .5 ? '#8ebcf0' : '#f4f3ef';
  let b = legend([['#2a78d6', 'Yes (1)'], ['#8ebcf0', 'Partly (0.5)'], ['#f4f3ef', 'No (0)']], 32, 90);
  let y = top;
  b += `<rect x="${x0}" y="${y}" width="${W - 64}" height="${hh}" fill="#efeee9"/>` + T(x0 + 8, y + 20, 'Capability', { size: 12, fill: C.ink, weight: 600 });
  cols.forEach((c, i) => wrap(c, cw - 12, 11.5).forEach((ln, k) => b += T(x0 + lw + cw * i + cw / 2, y + 16 + k * 13.5, ln, { size: 11.5, fill: C.ink, weight: 600, anchor: 'middle' })));
  y += hh;
  rows.forEach(r => {
    b += `<line x1="${x0}" y1="${y + rh}" x2="${W - 32}" y2="${y + rh}" stroke="${C.grid}"/>`;
    wrap(r['Capability'], lw - 14, 12).forEach((ln, k, a) => b += T(x0 + 8, y + rh / 2 + 4 - (a.length - 1) * 7 + k * 14, ln, { size: 12, fill: C.ink }));
    cols.forEach((c, i) => {
      const t = r[c], sc = parseFloat(t), q = (t.match(/\((.+)\)/) || [])[1] || '';
      const bx = x0 + lw + cw * i + 2, bw = cw - 4, fg = sc === 1 ? '#fff' : sc === .5 ? C.ink : C.muted;
      b += `<rect x="${bx}" y="${y + 2}" width="${bw}" height="${rh - 4}" rx="3" fill="${fillOf(sc)}"/>`;
      const word = sc === 1 ? 'yes' : sc === .5 ? 'partly' : 'no';
      if (q) { b += T(bx + bw / 2, y + 16, word, { anchor: 'middle', size: 12.5, fill: fg, weight: 600 });
        wrap(q, bw + 6, 9.5).slice(0, 3).forEach((ln, k) => b += T(bx + bw / 2, y + 28 + k * 10, ln, { anchor: 'middle', size: 9.5, fill: fg })); }
      else b += T(bx + bw / 2, y + rh / 2 + 4.5, word, { anchor: 'middle', size: 13, fill: fg, weight: 600 }); });
    y += rh; });
  out('device-vs-sticker-capability-matrix', frame('A device adds capabilities; changing the destination is not one of them',
    'Capability by option: yes, partly or no (derived assessment from the cited capabilities); as of 2026-10-31',
    'Source: vendor and news sources cited in the report (section 1); scores are the report\'s assessment; see data/device-vs-sticker-capability-matrix.csv.', b));
}

// ---------- 14 ESL and display cost ladder (log range)
{
  const short = { 'Hosted dynamic QR, 10 codes': 'Hosted dynamic QR, 10 codes', 'Reusable printed QR rider': 'Reusable printed QR rider', 'Repurposed Hanshow ESL for OpenEPaperLink': 'Repurposed Hanshow ESL (OpenEPaperLink)', 'OpenEPaperLink 4.2" tag': 'OpenEPaperLink 4.2" tag', 'ESP32 driver board + 4.2" e-paper module': 'ESP32 board + 4.2" e-paper module', 'Commercial ESL label': 'Commercial ESL label', 'Commercial ESL, whole store (~10,000 labels)': 'Commercial ESL, whole store', 'Visionect Joan 6 Pro': 'Visionect Joan 6 Pro', 'Visionect Joan 13': 'Visionect Joan 13' };
  const col = { retailer: C.blue, vendor: C.aqua, derived: C.orange };
  const rows = load('esl-and-display-cost-ladder').map(r => { const lo = +r['Low'], hi = +r['High'];
    return { label: short[r['Option']] || r['Option'], lo: lo || 1, hi, color: col[r['Kind']], loText: usd(lo), hiText: usd(hi),
      note: r['Unit'] + (/cloud fee/.test(r['Unit cost (USD)']) ? ' (+ $0-2 a month)' : ''), _lo: lo, _hi: hi }; });
  rows.sort((a, b) => a._hi - b._hi || a._lo - b._lo);
  rangeChart({ id: 'esl-and-display-cost-ladder', title: 'A DIY e-paper tag costs $19 to $47; a commercial ESL store $80,000+',
    subtitle: 'Cost per unit in USD (units differ by row, see note after each value), log scale; found 2026-10-30/31',
    source: 'Source: retailers and vendor blogs; ESP32 row derived from retail parts (see data/esl-and-display-cost-ladder.csv). $0 plotted at the axis edge.',
    rows, scale: 'log', min: 1, max: 300000, ticks: [1, 10, 100, 1000, 10000, 100000], tickFmt: t => '$' + fmt(t), xlabel: 'Cost, USD (log scale)', L: 300, R: 690,
    extra: legend([[C.blue, 'Retailer price'], [C.aqua, 'Vendor price page or blog'], [C.orange, 'Derived']], 32, 84) });
}

// ---------- 15 unattended payment take rates (lines, log x)
{
  const rows = load('unattended-payment-take-rates');
  const style = { 'Nayax (reseller quote)': [C.blue, 0, 'Nayax, 5.95% / 2.5% + $0.10'], 'Nayax (alternative reseller quote)': [C.blue, 1, 'Nayax, 3.5% + $0.20'], 'PayRange (FAQ)': [C.orange, 0, 'PayRange FAQ, 3.95% + $0.02'], 'PayRange (leads page)': [C.orange, 1, 'PayRange leads, 3.49% + $0.02'],
    'Cantaloupe blended take rate': [C.aqua, 0, 'Cantaloupe blended (est.)'], 'Stripe online (Checkout, Payment Links)': [C.magenta, 0, 'Stripe Checkout, 2.9% + $0.30'], 'Stripe Terminal (needs $59-329 reader)': [C.magenta, 1, 'Stripe Terminal, 2.7% + $0.05'] };
  const xs = [2, 5, 20], keys = ['Effective at $2', 'Effective at $5', 'Effective at $20'];
  const L = 90, R = 640, top = 126, bot = 436, ymax = 18;
  const X = v => L + (Math.log10(v) - Math.log10(1.6)) / (Math.log10(30) - Math.log10(1.6)) * (R - L), Y = v => bot - v / ymax * (bot - top);
  let b = '';
  for (let t = 0; t <= ymax; t += 3) b += `<line x1="${L}" y1="${Y(t)}" x2="${R}" y2="${Y(t)}" stroke="${C.grid}"/>` + T(L - 10, Y(t) + 4, t + '%', { anchor: 'end', size: 12, fill: C.muted });
  for (const t of [2, 5, 10, 20]) b += `<line x1="${X(t)}" y1="${top}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 18, '$' + t, { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${bot}" x2="${R}" y2="${bot}" stroke="${C.axis}"/>`;
  b += T((L + R) / 2, bot + 42, 'Ticket size, USD (log scale)', { anchor: 'middle', size: 12.5 }) + T(L - 58, top - 12, 'Effective fee, % of ticket', { anchor: 'start', size: 12.5, fill: C.ink2 });
  const ends = [];
  rows.forEach(r => { const [c, dash, lab] = style[r['Fee schedule']]; const v = keys.map(k => num(r[k]));
    const pts = v.map((y, i) => [X(xs[i]), Y(y)]);
    b += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="2.5"${dash ? ' stroke-dasharray="6 4"' : ''}/>`;
    pts.forEach(p => b += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${c}" stroke="#fff" stroke-width="2"/>`);
    ends.push({ y: pts[2][1], c, text: `${lab}: ${v[2].toFixed(2)}%` }); });
  ends.sort((a, b) => a.y - b.y); const ys = ends.map(e => e.y);
  for (let k = 1; k < ys.length; k++) if (ys[k] - ys[k - 1] < 15) ys[k] = ys[k - 1] + 15;
  ends.forEach((e, i) => b += `<line x1="${R + 6}" y1="${e.y}" x2="${R + 18}" y2="${ys[i]}" stroke="${e.c}"/>` + T(R + 22, ys[i] + 4, e.text, { size: 11.5, fill: C.ink }));
  b += legend([[C.blue, 'Nayax'], [C.orange, 'PayRange'], [C.aqua, 'Cantaloupe'], [C.magenta, 'Stripe']], 32, 84) + T(400, 88.5, 'Solid = first quote, dashed = second quote (same provider)', { size: 12.5 });
  out('unattended-payment-take-rates', frame('Small tickets pay 4% to 18% in fees; at $20 the spread is 3% to 5%',
    'Effective fee as a percentage of the ticket at $2, $5 and $20, by fee schedule; lines join the three derived points; as of 2026-10-31',
    'Source: reseller, vendor and secondary quotes; effective rate = (% x ticket + fixed fee) / ticket, excluding device fees (see data/unattended-payment-take-rates.csv).', b));
}

// ---------- 16 stamp rally and check-in pricing (two currency panels, log)
{
  const rows = load('stamp-rally-and-checkin-pricing').filter(r => nz(r['Low']) && nz(r['High']));
  const kc = { monthly: C.blue, once: C.orange, visit: C.aqua, incentive: C.magenta };
  const panel = (cur, min, max, ticks, top, name) => {
    const rs = rows.filter(r => r['Currency'] === cur), L = 300, R = 680, rh = 20, bot = top + rs.length * rh;
    const X = v => L + (Math.log10(Math.max(v, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) * (R - L);
    const pre = cur === 'JPY' ? 'JPY ' : '$', f = v => cur === 'JPY' ? 'JPY ' + fmt(v) : usd(v);
    let b = T(32, top - 8, name, { size: 12.5, fill: C.ink, weight: 600 });
    for (const t of ticks) b += `<line x1="${X(t)}" y1="${top}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 15, pre + fmt(t), { anchor: 'middle', size: 11.5, fill: C.muted });
    b += `<line x1="${L}" y1="${top}" x2="${L}" y2="${bot}" stroke="${C.axis}"/>`;
    rs.forEach((r, i) => { const y = top + rh * (i + .5), lo = +r['Low'], hi = +r['High'], c = kc[r['Kind']];
      b += ink(L - 12, y + 4, r['Plot label'], { anchor: 'end', size: 12 });
      const unit = r['Unit'].replace(' (under)', '');
      if (lo === 0 || hi === lo) { b += `<circle cx="${X(hi)}" cy="${y}" r="6" fill="${c}" stroke="#fff" stroke-width="2"/>` + T(X(hi) + 12, y + 4, (lo === 0 ? 'under ' : '') + f(hi) + ' ' + unit, { size: 11.5 }); }
      else b += `<line x1="${X(lo)}" y1="${y}" x2="${X(hi)}" y2="${y}" stroke="${c}" stroke-width="8" stroke-linecap="round"/><circle cx="${X(lo)}" cy="${y}" r="6" fill="${c}" stroke="#fff" stroke-width="2"/><circle cx="${X(hi)}" cy="${y}" r="6" fill="${c}" stroke="#fff" stroke-width="2"/>` + T(X(hi) + 12, y + 4, `${f(lo)} to ${f(hi)} ${unit}`, { size: 11.5 }); });
    return b;
  };
  let b = legend([[C.blue, 'Recurring (per month)'], [C.orange, 'One-time, package, total or add-on'], [C.aqua, 'Per visit'], [C.magenta, 'Paid to visitors, not a software price']], 32, 84);
  b += panel('JPY', 1000, 10000000, [1000, 10000, 100000, 1000000, 10000000], 122, 'Japanese yen (JPY), log scale');
  b += panel('USD', 0.1, 10000, [0.1, 1, 10, 100, 1000, 10000], 334, 'US dollars (USD), log scale');
  out('stamp-rally-and-checkin-pricing', frame('Stamp-rally software: JPY 30,000-150,000 a month; US tools $25-100',
    'Published prices, not converted: yen panel above, US dollar panel below, each on its own log scale; sources dated 2017-2026',
    'Source: vendor pages and municipal documents (see data/stamp-rally-and-checkin-pricing.csv). Eventbrite (3.7% + $1.79 + 2.9%) is a percentage and is not plotted.', b));
}

// ---------- 17 fleet cost per unit, 200 vs 1,000 (grouped range bars, log)
{
  const skip = new Set(['Parts subtotal', 'Tooling (amortised, optional)', 'UN 38.3 (amortised, optional)', 'AWS IoT Core broker']);
  const rows = load('fleet-cost-per-unit-200-vs-1000').filter(r => r['Section'] !== 'hdr' && !skip.has(r['Plot label']));
  const L = 300, R = 640, top = 126, bot = 456, min = 0.05, max = 300;
  const X = v => L + (Math.log10(Math.max(v, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) * (R - L);
  const one = rows.filter(r => r['Section'] === 'one'), mo = rows.filter(r => r['Section'] === 'mo');
  const n = one.length + mo.length + 2, rh = (bot - top) / n, c2 = C.blue, c1 = C.aqua;
  let b = legend([[c2, 'At 200 units'], [c1, 'At 1,000 units']], 32, 84) + T(330, 88.5, 'Not drawn: subtotals, tooling, UN 38.3, AWS IoT (~$0.004 a month)', { size: 11.5 });
  b += T(668, 104, 'At 200', { size: 11.5, fill: C.ink, weight: 600 }) + T(800, 104, 'At 1,000', { size: 11.5, fill: C.ink, weight: 600 });
  for (const t of [0.1, 1, 10, 100]) b += `<line x1="${X(t)}" y1="${top - 4}" x2="${X(t)}" y2="${bot}" stroke="${C.grid}"/>` + T(X(t), bot + 17, '$' + t, { anchor: 'middle', size: 12, fill: C.muted });
  b += `<line x1="${L}" y1="${top - 4}" x2="${L}" y2="${bot}" stroke="${C.axis}"/>` + T((L + R) / 2, bot + 38, 'USD (log scale): one-time per unit above, per device per month below', { anchor: 'middle', size: 12.5 });
  let i = 0;
  const bar = (lo, hi, y, c) => { if (!nz(String(lo)) || lo === '') return; lo = +lo; hi = +hi;
    return (hi > lo ? `<line x1="${X(lo)}" y1="${y}" x2="${X(hi)}" y2="${y}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${X(hi)}" cy="${y}" r="3.8" fill="${c}"/>` : '') + `<circle cx="${X(lo)}" cy="${y}" r="3.8" fill="${c}"/>`; };
  const f2 = v => Number.isInteger(v) ? fmt(v) : v.toFixed(2);
  const txt = (lo, hi, pre = '') => lo === '' ? 'contact sales' : (+lo === +hi ? pre + f2(+lo) : pre + f2(+lo) + '-' + f2(+hi));
  const section = (name, list) => { const y = top + rh * (i + .5); b += ink(32, y + 4, name, { size: 12, weight: 600 }); i++;
    list.forEach(r => { const y = top + rh * (i + .5);
      b += `<line x1="32" y1="${y + rh / 2}" x2="${W - 32}" y2="${y + rh / 2}" stroke="${C.grid}" stroke-opacity=".6"/>`;
      b += ink(L - 12, y + 4, r['Plot label'], { anchor: 'end', size: 11.5 });
      b += (bar(r['L200'], r['H200'], y - 3.2, c2) || '') + (bar(r['L1000'], r['H1000'], y + 3.8, c1) || '');
      b += T(668, y + 4, txt(r['L200'], r['H200'], '$'), { size: 11.5 }) + T(800, y + 4, txt(r['L1000'], r['H1000'], '$'), { size: 11.5, fill: r['L1000'] === '' ? C.muted : C.ink2 });
      i++; }); };
  section('One-time cost per unit', one); section('Monthly cost per device', mo);
  out('fleet-cost-per-unit-200-vs-1000', frame('At 1,000 units landed cost falls about a fifth; monthly cost does not',
    'USD per unit one-time (above) and per device per month (below); low-high range where listed; 2026-10-31',
    'Source: retailer and vendor pages; amortised, support and reserve rows derived or assumed (see data/fleet-cost-per-unit-200-vs-1000.csv).', b));
}
console.log('ok');
