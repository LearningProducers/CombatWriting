#!/usr/bin/env node
'use strict';
// Re-derives, from git and from the record's own tables, what docs/combat-writing-prior-art.md states.
// Plain Node and git; no other program is called. Exit 0 when everything agrees, 1 otherwise.
//
//   node tests/dossier_check.js                      public repository only: every public row against git,
//                                                    every stated count against the tables, every commit named
//                                                    in prose against its row, origin tables for consistency
//   node tests/dossier_check.js --archive <clone>    also regenerates the origin, version and feature tables
//                                                    from a clone of the origin repository and compares every row

const fs = require('fs');
const path = require('path');
const lib = require('./dossier_lineage');

const REPO = path.resolve(__dirname, '..');
const DOSSIER = path.join(REPO, 'docs', 'combat-writing-prior-art.md');
const args = process.argv.slice(2);
const ARCHIVE = args.includes('--archive') ? args[args.indexOf('--archive') + 1] : null;
const WORDS = { none: 0, once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const numOf = w => (/^\d+$/.test(w) ? Number(w) : WORDS[String(w).toLowerCase()]);

const failures = []; let checks = 0;
const check = (ok, what) => { checks++; if (!ok) failures.push(what); };

// ---------- the record ----------
const text = fs.readFileSync(DOSSIER, 'utf8');
const lines = text.split('\n');
const splitRow = l => l.replace(/^\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/).map(c => c.trim());
function tableAfter(heading) {
  const start = lines.findIndex(l => l.trim() === heading);
  if (start < 0) throw new Error('heading not found: ' + heading);
  let i = start + 1; while (i < lines.length && !lines[i].startsWith('|')) i++;
  const header = splitRow(lines[i]); const first = i + 2; i = first; const rows = [];
  while (i < lines.length && lines[i].startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
  return { header, rows, raw: lines.slice(first, i), first, last: i - 1 };
}
const short = cell => (String(cell).match(/`([0-9a-f]{7})`/) || [])[1];
const num = cell => Number(String(cell).replace(/,/g, ''));
const H_PUBLIC = '## Commit lineage — public repository', H_ORIGIN = '## Commit lineage — origin repository (private as of the record date)', H_VERSIONS = '## Version lineage', H_FEATURES = '## Feature genesis';
const T = { pub: tableAfter(H_PUBLIC), org: tableAfter(H_ORIGIN), ver: tableAfter(H_VERSIONS), feat: tableAfter(H_FEATURES), prov: tableAfter('## Repository provenance'), srv: tableAfter('## Server-attested events'), shortlist: tableAfter('## Scoped candidate claims — shortlist'), writing: tableAfter('## Public writing and attribution outside GitHub') };
const generated = new Set(); for (const t of [T.pub, T.org, T.ver, T.feat]) for (let i = t.first - 2; i <= t.last; i++) generated.add(i);

// ---------- public repository, from git ----------
const pubHead = short(T.pub.rows[T.pub.rows.length - 1][2]);
const pub = lib.commitsOf(REPO, pubHead);
const pubBy = Object.fromEntries(pub.map(r => [r.short, r]));
check(pub.length === T.pub.rows.length, `public table has ${T.pub.rows.length} rows; ${pub.length} commits are reachable from its last row ${pubHead}`);
pub.forEach((r, i) => check(T.pub.raw[i] === lib.publicRow(r), `public row ${i + 1} (${r.short}) differs from git: ${T.pub.raw[i] ? T.pub.raw[i].slice(0, 80) : '(missing)'}`));
const head = pubBy[pubHead]; const pc = lib.counts(pub);

// ---------- origin repository: from the archive when given, else from the table ----------
let arch = null, oc = null;
const orgRows = T.org.rows.map((c, i) => ({ n: i + 1, date: c[1], short: short(c[2]), version: c[3], bytes: c[4], sha: c[5], label: c[6], message: c[7] }));
const orgBy = Object.fromEntries(orgRows.map(r => [r.short, r]));
orgRows.forEach((r, i) => { check(Number(T.org.rows[i][0]) === i + 1, `origin row ${r.short}: # is ${T.org.rows[i][0]}, expected ${i + 1}`); check(r.label === 'GitHub web-flow (signed)' || r.label === 'not web-flow', `origin row ${r.short}: committer cell "${r.label}"`); check(/^\d{4}-\d{2}-\d{2}$/.test(r.date), `origin row ${r.short}: date cell malformed`); });
const ot = orgRows.length, ow = orgRows.filter(r => r.label === 'GitHub web-flow (signed)').length, ol = ot - ow;
if (ARCHIVE) {
  arch = lib.commitsOf(ARCHIVE, 'origin/main'); oc = lib.counts(arch);
  check(arch.length === ot, `origin table has ${ot} rows; the archive holds ${arch.length} commits`);
  arch.forEach((r, i) => check(T.org.raw[i] === lib.originRow(r), `origin row ${i + 1} (${r.short}) differs from the archive`));
  const vl = lib.versionLineage(arch, pub); check(vl.length === T.ver.rows.length, `version lineage has ${T.ver.rows.length} rows; the archive implies ${vl.length}`);
  vl.forEach((l, i) => check(T.ver.raw[i] === lib.lineageRow(l), `version lineage row ${i + 1} (${l.version}) differs from the archive`));
  const fg = lib.featureGenesis(arch, pub); check(fg.length === T.feat.rows.length, `feature table has ${T.feat.rows.length} rows; the generator produces ${fg.length}`);
  fg.forEach((f, i) => check(T.feat.raw[i] === lib.featureRow(f), `feature row ${i + 1} differs from the archive: ${f.feature.slice(0, 50)}`));
  check(lib.git(ARCHIVE, 'ls-tree', '--name-only', arch[0].full).trim() === 'README.md', 'root commit tree is not README.md alone');
}
// origin tables, internal consistency (always)
const firstVersionRow = {}; for (const r of orgRows) if (r.version !== '–' && !(r.version in firstVersionRow)) firstVersionRow[r.version] = r;
const firstVersionPub = {}; for (const r of pub) if (!(r.version in firstVersionPub)) firstVersionPub[r.version] = r;
T.ver.rows.forEach(c => {
  const [version, cell, date, repo, bytes, sha] = c; const h = short(cell);
  if (repo === 'archive') { const o = firstVersionRow[version]; check(!!o && o.short === h, `version lineage ${version}: ${h} is not the first origin row carrying it`); if (o) check(o.date === date && o.bytes === bytes && o.sha === sha, `version lineage ${version}: date, bytes or sha ≠ origin row`); }
  else if (repo === 'public') { check(!(version in firstVersionRow), `version lineage ${version}: marked public but the origin table carries it`); const f = firstVersionPub[version]; check(!!f && f.short === h && f.date === date && num(bytes) === f.bytes && sha === '`' + f.sha256 + '`', `version lineage ${version}: row ≠ git`); }
  else check(false, `version lineage ${version}: repo cell "${repo}"`);
});
check(T.ver.rows.length === Object.keys(firstVersionRow).length + Object.keys(firstVersionPub).filter(v => !(v in firstVersionRow)).length, 'version lineage row count ≠ distinct versions in the two commit tables');
const markerCol = T.feat.header.findIndex(h => /Marker/.test(h));
T.feat.rows.forEach(c => {
  const feature = c[0].slice(0, 45), version = c[1], h = short(c[2]), date = c[3], repo = c[4];
  const strs = ((c[markerCol] || '').match(/`((?:[^`\\]|\\.)*)`/g) || []).map(x => x.slice(1, -1).replace(/\\\|/g, '|'));
  check(strs.length > 0, `feature "${feature}": no marker`);
  if (repo === 'origin') { const o = orgBy[h]; check(!!o, `feature "${feature}": ${h} not in the origin table`); if (o) check(o.date === date && o.version === version, `feature "${feature}": date or version ≠ origin row`); }
  else if (repo === 'public') { const first = pub.find(r => strs.every(s => r.text.includes(s))); check(!!first && first.short === h, `feature "${feature}": first public commit with its markers is ${first && first.short}, row says ${h}`); const f = pubBy[h]; check(!!f && f.date === date && f.version === version, `feature "${feature}": date or version ≠ git`); }
  else check(false, `feature "${feature}": repo cell "${repo}"`);
  check(strs.every(s => head.text.includes(s)) || repo === 'origin', `feature "${feature}": marker missing at ${pubHead}`);
});

// ---------- a commit named anywhere in prose: its date and version must match its row ----------
function rowFor(h) { if (pubBy[h]) return { date: pubBy[h].date, version: pubBy[h].version, iso: [pubBy[h].authorIsoUtc, pubBy[h].committerIsoUtc], repo: 'public' }; if (orgBy[h]) return { date: orgBy[h].date, version: orgBy[h].version, repo: 'origin' }; return null; }
const nextDay = d => new Date(Date.parse(d + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
function checkIso(h, iso, where) { const row = rowFor(h); if (!row) return check(false, `${where}: commit ${h} is in no table`); if (row.repo === 'public') check(row.iso.includes(iso), `${where}: ${iso} is neither the author nor the committer time of ${h}`); else check([row.date, nextDay(row.date)].includes(iso.slice(0, 10)), `${where}: ${iso} does not fall on ${h}'s row date ${row.date} (-05:00)`); }
lines.forEach((line, i) => {
  if (generated.has(i)) return;
  const re = /`([0-9a-f]{7})`(?:\]\([^)]*\))?/g; let m;
  while ((m = re.exec(line))) {
    const h = m[1]; const row = rowFor(h); const where = `line ${i + 1}, ${h}`;
    if (!row) { check(false, `${where}: commit is in no table`); continue; }
    let win = line.slice(m.index + m[0].length, m.index + m[0].length + 90); const cut = win.search(/`[0-9a-f]{7}`|\. |; |: | \| |\)/); if (cut >= 0) win = win.slice(0, cut);
    const iso = win.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/); const bare = win.replace(/\d{4}-\d{2}-\d{2}T[\d:]+Z/g, '').match(/(\d{4}-\d{2}-\d{2})/); const ver = win.match(/[(,·]\s?\**(v\d+(?:\.\d+)*|none)\b/);
    if (iso) checkIso(h, iso[1], where);
    if (bare) check(bare[1] === row.date, `${where}: stated date ${bare[1]} ≠ row date ${row.date}`);
    if (ver) check(ver[1] === row.version, `${where}: stated version ${ver[1]} ≠ row version ${row.version}`);
  }
});
// tables whose first cell lists dates for the commits named in the row, in order (shortlist, public writing)
for (const t of [T.shortlist, T.writing]) t.rows.forEach((c, i) => {
  if (!/^\d{4}-\d{2}-\d{2}( \/ \d{4}-\d{2}-\d{2})*$/.test(c[0])) return;
  const dates = c[0].split(' / '); const hashes = [...c.slice(1).join(' ').matchAll(/`([0-9a-f]{7})`/g)].map(x => x[1]);
  if (!hashes.length) return;
  dates.forEach((d, k) => { const h = hashes[k]; const row = h && rowFor(h); check(!!row && row.date === d, `dated row "${c[2] ? c[2].slice(0, 40) : c[1].slice(0, 40)}": date ${d} ≠ row date of ${h}`); });
});
// server-attested events: a commit's timestamp against its row; a merge time (GitHub's merged_at) against the merge commit's committer time, within 2 s
T.srv.rows.forEach(c => {
  const [iso, repo, event, detail] = c; const h = short(event) || short(detail);
  if (h && !/opened/.test(event)) checkIso(h, iso, `server-attested ${iso}`);
  const merged = (detail || '').match(/merged (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/); const prn = (event || '').match(/PR #(\d+)/);
  if (merged && prn && repo === 'public') { const mc = pub.find(r => r.subject.startsWith(`Merge pull request #${prn[1]} `)); check(!!mc && Math.abs(Date.parse(mc.committerIsoUtc) - Date.parse(merged[1])) <= 2000, `server-attested: public PR #${prn[1]} merged ${merged[1]} is not within 2 s of the merge commit time ${mc && mc.committerIsoUtc}`); }
  if (merged && prn && repo === 'origin' && arch) { const mc = arch.find(r => r.subject.startsWith(`Merge pull request #${prn[1]} `)); check(!!mc && Math.abs(Date.parse(mc.committerIsoUtc) - Date.parse(merged[1])) <= 2000, `server-attested: origin PR #${prn[1]} merged ${merged[1]} is not within 2 s of the merge commit time ${mc && mc.committerIsoUtc}`); }
});

// ---------- every statement of a count, wherever it appears ----------
function statedAll(re, what, fn) { const ms = [...text.matchAll(new RegExp(re.source, 'g'))]; check(ms.length > 0, `sentence not found: ${what}`); ms.forEach(m => fn(m.slice(1).map(numOf), m[0].slice(0, 70))); }
const pw = pc.webflow, pt = pc.total, pl = pt - pw;
statedAll(/As of the record date: (\d+) commits, head \[`([0-9a-f]{7})`\][^,]*, app version (v[\d.]+), (\w+) merged pull requests/, 'public snapshot', ([n, h, v, merges], s) => { check(n === pt, `"${s}": ${n} ≠ ${pt} public commits`); check(h === undefined, ''); checks--; check(text.includes('head [`' + pubHead + '`]'), `"${s}": head ≠ ${pubHead}`); check(v === undefined, ''); checks--; check(text.match(/app version (v[\d.]+), \w+ merged/)[1] === head.version, `"${s}": app version ≠ ${head.version}`); check(merges === pc.merges, `"${s}": ${merges} merged pull requests ≠ ${pc.merges} merge commits`); });
statedAll(/(\d+) commits from root `([0-9a-f]{7})` to head `([0-9a-f]{7})`/, 'origin count, root and head', ([n], s) => { check(n === ot, `"${s}": ${n} ≠ ${ot} origin rows`); const [, , r, h] = s.match(/(\d+) commits from root `([0-9a-f]{7})` to head `([0-9a-f]{7})`/); check(r === orgRows[0].short && h === orgRows[ot - 1].short, `"${s}": root or head ≠ table`); });
statedAll(/(\d+) of the (\d+) origin commits and (\d+) of the (\d+) public commits were committed by GitHub's `web-flow`/, 'web-flow counts', ([a, b, c, d], s) => { check(a === ow && b === ot, `"${s}": origin ${a}/${b} ≠ table ${ow}/${ot}`); check(c === pw && d === pt, `"${s}": public ${c}/${d} ≠ git ${pw}/${pt}`); });
statedAll(/(\w+) pull requests in the origin repository and (\w+) in the public repository add GitHub-side/, 'pull-request counts', ([a, b], s) => { check(a === orgRows.filter(r => /^Merge pull request #/.test(r.message)).length, `"${s}": origin pull requests ≠ merge rows`); check(b === pc.merges, `"${s}": public pull requests ≠ ${pc.merges}`); });
statedAll(/The (\d+) origin commits and (\d+) public commits not committed through GitHub's interface carry no signature/, 'unsigned counts', ([a, b], s) => { check(a === ol, `"${s}": ${a} ≠ ${ol} origin not-web-flow rows`); check(b === pl && pc.unsignedNonWebflow === pl, `"${s}": ${b} ≠ ${pl} public, or one of them is signed`); if (oc) check(oc.unsignedNonWebflow === a, `"${s}": archive shows ${oc.unsignedNonWebflow} unsigned`); });
statedAll(/[Oo]f the (\d+) public ones, (\d+) have a committer address at the organization's domain and (\d+) an Anthropic no-reply committer address, and (\d+) carry a `Claude-Session` trailer; of the (\d+) origin ones, all (\d+) have a committer address at the organization's domain and (\w+) carry that trailer/, 'non-web-flow committer classes', ([a, b, c, d, e, f, g], s) => { check(a === pl && b === (pc.nonWebflowCommitterClasses['organization domain'] || 0) && c === (pc.nonWebflowCommitterClasses['anthropic no-reply'] || 0) && d === pc.trailers, `"${s}": public figures ≠ git (${pl}, ${pc.nonWebflowCommitterClasses['organization domain'] || 0}, ${pc.nonWebflowCommitterClasses['anthropic no-reply'] || 0}, ${pc.trailers})`); check(e === ol && f === ol, `"${s}": origin figures ≠ ${ol}`); if (oc) check((oc.nonWebflowCommitterClasses['organization domain'] || 0) === f && oc.trailers === g, `"${s}": archive shows ${oc.nonWebflowCommitterClasses['organization domain'] || 0} and ${oc.trailers}`); });
statedAll(/All (\d+) origin commits and (\d+) of the (\d+) public commits are recorded under the organization's name/, 'author-name counts', ([a, b, c], s) => { check(a === ot, `"${s}": ${a} ≠ ${ot}`); check(b === pc.orgAuthored && c === pt, `"${s}": ${b}/${c} ≠ git ${pc.orgAuthored}/${pt}`); if (oc) check(oc.orgAuthored === a, `"${s}": archive shows ${oc.orgAuthored}`); });
statedAll(/an address at the organization's domain on (\d+) origin and (\d+) public commits, a Gmail address on (\d+) origin and (\d+) public, a GitHub no-reply address on (\d+) public and an Anthropic no-reply address on (\d+) public/, 'author address classes', ([a, b, c, d, e, f], s) => { const k = pc.authorAddressClasses; check(b === (k['organization domain'] || 0) && d === (k.gmail || 0) && e === (k['github no-reply'] || 0) && f === (k['anthropic no-reply'] || 0), `"${s}": public address classes ≠ git`); check(a + c === ot, `"${s}": origin classes ${a}+${c} ≠ ${ot}`); if (oc) check(a === (oc.authorAddressClasses['organization domain'] || 0) && c === (oc.authorAddressClasses.gmail || 0), `"${s}": archive address classes differ`); });
statedAll(/(\d+) of the (\d+) commits across both repositories are of that kind, and each of the remaining (\d+)/, 'both-repository sentence', ([a, b, c], s) => { check(a === ow + pw && b === ot + pt && c === ol + pl, `"${s}": ≠ ${ow + pw}/${ot + pt}/${ol + pl}`); });
statedAll(/each of the (\d+) public commits not committed through GitHub's interface is followed by a GitHub-committed commit within (\d+) hours, and each of the (\d+) origin ones within (\d+) hours/, 'gap to next GitHub-committed commit', ([a, b, c, d], s) => { check(a === pl && b === Math.ceil(pc.maxHoursToNextWebflow), `"${s}": public ≠ ${pl} within ${Math.ceil(pc.maxHoursToNextWebflow)}`); check(c === ol, `"${s}": origin count ≠ ${ol}`); if (oc) check(d === Math.ceil(oc.maxHoursToNextWebflow), `"${s}": archive gives ${Math.ceil(oc.maxHoursToNextWebflow)} hours`); });
statedAll(/so `fb4165e` has (\d+) ancestors/, 'ancestor count', ([n], s) => check(n === ot, `"${s}": ≠ ${ot}`));
statedAll(/the `GitHub` committer on the (\d+) server-side rows/, 'verify-recipe web-flow count', ([n], s) => check(n === ow, `"${s}": ≠ ${ow}`));
statedAll(/(\d+) commits from `([0-9a-f]{7})` to `([0-9a-f]{7})`, all `web-flow`/, 'all-web-flow span', ([n], s) => { const [, , a, b] = s.match(/(\d+) commits from `([0-9a-f]{7})` to `([0-9a-f]{7})`/); const A = orgBy[a], B = orgBy[b]; check(!!A && !!B && A.n === 1 && B.n === n && orgRows.slice(0, n).every(r => r.label === 'GitHub web-flow (signed)'), `"${s}": not rows 1..${n} or not all web-flow`); });
statedAll(/`e02d5ce` is the (\d+)(?:st|nd|rd|th)/, 'e02d5ce position', ([n], s) => check(orgBy.e02d5ce && orgBy.e02d5ce.n === n, `"${s}": row is ${orgBy.e02d5ce && orgBy.e02d5ce.n}`));
statedAll(/lineage (\d+) commits in\b/, 'commits-in count', ([n], s) => check(orgBy.e02d5ce && orgBy.e02d5ce.n - 1 === n, `"${s}": ≠ ${orgBy.e02d5ce && orgBy.e02d5ce.n - 1}`));
statedAll(/the (\d+) commits before it/, 'commits-before count', ([n], s) => check(orgBy.e02d5ce && orgBy.e02d5ce.n - 1 === n, `"${s}": ≠ ${orgBy.e02d5ce && orgBy.e02d5ce.n - 1}`));
{ const spans = [...text.matchAll(/(?:tracked between rows|\(rows) (\d+) (?:and|to) (\d+)/g)].map(m => m[1] + '-' + m[2]); check(spans.length > 0 && spans.every(s => s === spans[0]), `internal-document row spans disagree: ${spans.join(', ')}`); if (arch && spans.length) { const [lo, hi] = spans[0].split('-').map(Number); const tracked = arch.map(r => ['CLAUDE.md', 'CW_QA_RUNBOOK.md', 'HANDOFF.md'].some(f => { try { lib.git(ARCHIVE, 'cat-file', '-e', `${r.full}:${f}`); return true; } catch (e) { return false; } })); const ns = tracked.map((t, i) => t ? i + 1 : null).filter(Boolean); check(ns[0] === lo && ns[ns.length - 1] === hi, `internal documents tracked at rows ${ns[0]}..${ns[ns.length - 1]}, record says ${lo}..${hi}`); } }
// provenance table
{ const P = T.prov.rows.find(r => r[0].includes('LearningProducers/CombatWriting]')), O = T.prov.rows.find(r => r[0].includes('CombatWriting-archive'));
  check(!!P && short(P[3]) === pub[0].short && short(P[5]) === pubHead && num(P[6]) === pt && P[7] === '`' + head.sha256 + '`' && P[4] === pub[0].authorIsoUtc, 'provenance: public row ≠ git');
  check(!!O && short(O[3]) === orgRows[0].short && short(O[5]) === orgRows[ot - 1].short && num(O[6]) === ot && O[7] === orgRows[ot - 1].sha, 'provenance: origin row ≠ origin table'); }
// chain of custody and the verify recipe
check(orgRows[ot - 1].sha === '`' + pub[0].sha256 + '`', 'chain of custody: origin head sha ≠ public root sha');
for (const [, h, sha] of text.matchAll(/git show ([0-9a-f]{40}):index\.html \| sha256sum`\. The result must be `([0-9a-f]{64})`/g)) check(pubBy[h.slice(0, 7)] && pubBy[h.slice(0, 7)].sha256 === sha, `verify recipe: sha for ${h.slice(0, 7)}`);
for (const [, h, sha] of text.matchAll(/against `([0-9a-f]{40})` for v[\d.]+ and expect `([0-9a-f]{64})`/g)) check(pubBy[h.slice(0, 7)] && pubBy[h.slice(0, 7)].sha256 === sha, `verify recipe: sha for ${h.slice(0, 7)}`);

// ---------- the source at the pinned head: counts and quotations the record makes about index.html ----------
const steps = [...new Set(pub.filter(r => r.hasIndex).map(r => r.steps))]; if (arch) steps.push(...arch.filter(r => r.hasIndex).map(r => r.steps));
check(new Set(steps).size === 1, `STEP marker counts differ across commits: ${[...new Set(steps)].join(', ')}`);
const stepCount = steps[0];
for (const m of text.matchAll(/\b(\d+)[ -]steps?\b/g)) check(numOf(m[1]) === stepCount, `stated step count "${m[0]}" ≠ ${stepCount}`);
for (const m of text.matchAll(/STEP 1 to STEP (\d+)/g)) check(numOf(m[1]) === stepCount, `"${m[0]}" ≠ ${stepCount}`);
check(/holds \d+ steps/.test(text), 'the record states the step count');
const modes = (head.text.match(/mode==='/g) || []).length;
for (const m of text.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten) (?:critique |prompt )?modes\b/gi)) check(numOf(m[1]) === modes, `"${m[0]}" ≠ ${modes} mode branches at ${pubHead}`);
const preambles = (head.text.match(/return SCHOLAR_IDENTITY\+/g) || []).length;
for (const m of text.matchAll(/(\w+) of which \([^)]*\) open with a shared scholar-identity preamble/g)) check(numOf(m[1]) === preambles, `"${m[0].slice(0, 40)}" ≠ ${preambles} branches returning the preamble`);
const callSites = (head.text.match(/buildOllamaSystemPrompt\('/g) || []).length;
for (const m of text.matchAll(/called from (\w+) places, all in the local model's fire functions/g)) check(numOf(m[1]) === callSites, `"${m[0]}" ≠ ${callSites} call sites`);
const scaleCount = (head.text.match(/Use ratings 1-6 for problem documents/g) || []).length;
for (const m of text.matchAll(/scale text occurs (\w+), in the local model's rating contract/g)) check(numOf(m[1]) === scaleCount, `"${m[0]}" ≠ ${scaleCount}`);
const QUOTES = ['Heavy Source Material: 5–8 minutes', 'Typical: 2–5 minutes on Mac CPU', 'rate it on a scale from 1–10, you cannot use 7', 'title-fight', 'exhibition fight', 'Rating: [X]/10 on the first line, you cannot use 7', 'Combat Writing (CW) by Learning Producers, Inc. (Israel Hernandez)', 'Founder: Israel Hernandez'];
for (const q of QUOTES) { check(text.includes(q), `the record no longer quotes "${q.slice(0, 40)}"`); check(head.text.includes(q), `index.html at ${pubHead} does not contain "${q.slice(0, 40)}"`); }
check(head.text.includes('DISCOVERY IN PUBLISHING') && /Discovery in Publishing/.test(text), 'the Methodology tab heading quoted in the record is not in the source');
check(!/minutes, not seconds/.test(text.replace(/README/g, '')), 'the record attributes "minutes, not seconds" to the app');
check(!/[Rr]ate it 1–10/.test(text), 'the record quotes a rating prompt that is not in the file');
check(!/"title fight"/.test(text), 'the record quotes "title fight" where the file has "title-fight"');
check(!/earlier draft/.test(text), 'the record calls the published record of 2026-09-27 a draft');
check(!/\bmade from a local CLI\b/.test(text), 'the record calls non-web-flow commits local-CLI commits');
check(!/(?<![\/\w])[\w.+-]+@[\w-]+(\.[\w-]+)+/.test(text), 'an email address appears in the record');
check(!/18[ -]steps?\b/i.test(text), 'the retired 18-step figure appears');

// ---------- report ----------
for (const f of failures) console.log('FAIL ' + f);
console.log(`${checks - failures.length} of ${checks} checks passed${ARCHIVE ? ' (with the origin archive)' : ''}`);
process.exit(failures.length ? 1 : 0);
