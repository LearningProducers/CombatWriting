#!/usr/bin/env node
'use strict';
// Re-derives, from git and from the dossier's own tables, every count and row that
// docs/combat-writing-prior-art.md states about the public repository, and checks
// the counts it states about the origin repository against its own origin table.
// Plain Node, no dependencies. Exit 0 when everything agrees, 1 otherwise.
//
//   node tests/dossier_check.js            (from the repository root or anywhere inside it)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const DOSSIER = path.join(REPO, 'docs', 'combat-writing-prior-art.md');
const MSG_LEN = 120;                  // width of the first-line message column
const TZ_OFFSET_MS = -5 * 3600 * 1000; // the tables' "Date (author, -05:00)" column
const STEP_MARKER = 'class="meth-step-head">STEP';

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const failures = [];
let checks = 0;
function check(ok, what) { checks++; if (!ok) failures.push(what); }
function git(...args) { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
function gitBuf(...args) { return execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 28 }); }

// ---------- dossier parsing ----------
const text = fs.readFileSync(DOSSIER, 'utf8');
const lines = text.split('\n');
function splitRow(line) {
  // split on pipes that are not escaped as \|
  const cells = line.replace(/^\|/, '').replace(/\|\s*$/, '').split(/(?<!\\)\|/);
  return cells.map(c => c.trim());
}
function tableAfter(heading) {
  const start = lines.findIndex(l => l.trim() === heading);
  if (start < 0) throw new Error('heading not found: ' + heading);
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith('|')) i++;
  const header = splitRow(lines[i]);
  i += 2; // header + separator
  const rows = [];
  while (i < lines.length && lines[i].startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
  return { header, rows };
}
const short = cell => (cell.match(/`([0-9a-f]{7})`/) || [])[1];
const num = cell => Number(cell.replace(/,/g, ''));

// ---------- git facts for the public repository ----------
function commitFacts(h) {
  const [full, at, an, ce, sig, subj] = git('log', '-1', '--format=%H%x00%at%x00%an%x00%ce%x00%G?%x00%s', h).replace(/\n$/, '').split('\0');
  const f = { full, short: full.slice(0, 7), authorTs: Number(at), authorName: an, subject: subj };
  f.date = new Date(f.authorTs * 1000 + TZ_OFFSET_MS).toISOString().slice(0, 10);
  f.webflow = ce === 'noreply@github.com' && sig !== 'N';
  f.committerLabel = f.webflow ? 'GitHub web-flow (signed)' : 'local';
  f.messageCell = subj.slice(0, MSG_LEN).replace(/\|/g, '\\|');
  f.parents = git('log', '-1', '--format=%P', h).trim().split(/\s+/).filter(Boolean);
  try {
    const blob = gitBuf('show', `${full}:index.html`);
    f.hasIndex = true; f.bytes = blob.length; f.sha256 = crypto.createHash('sha256').update(blob).digest('hex');
    const s = blob.toString('utf8'); f.text = s;
    const m = s.match(/APP_VERSION\s*=\s*['"]([^'"]*)['"]/); f.version = m ? m[1] : 'none';
    f.steps = s.split(STEP_MARKER).length - 1;
  } catch (e) { f.hasIndex = false; f.bytes = null; f.sha256 = null; f.version = '–'; f.text = ''; f.steps = 0; }
  return f;
}

// ---------- 1. public commit table, row by row against git ----------
const pubTable = tableAfter('## Commit lineage — public repository');
const pubRows = pubTable.rows;
check(pubRows.length > 0, 'public table has rows');
const pubHead = short(pubRows[pubRows.length - 1][2]);
const expectedOrder = git('rev-list', '--reverse', pubHead).trim().split('\n').map(h => h.slice(0, 7));
check(expectedOrder.length === pubRows.length, `public table rows (${pubRows.length}) = commits reachable from its last row ${pubHead} (${expectedOrder.length})`);
const pubFacts = {};
pubRows.forEach((r, i) => {
  const [n, date, commitCell, version, bytes, shaCell, committer, message] = r;
  const h = short(commitCell);
  const f = commitFacts(h); pubFacts[h] = f;
  check(Number(n) === i + 1, `public row ${h}: # is ${n}, expected ${i + 1}`);
  check(expectedOrder[i] === h, `public row ${i + 1}: commit ${h} is not ${expectedOrder[i]} in rev-list order`);
  check(commitCell.includes(`/commit/${f.full})`), `public row ${h}: link does not carry the full hash`);
  check(date === f.date, `public row ${h}: date ${date} ≠ git ${f.date}`);
  check(version === f.version, `public row ${h}: version ${version} ≠ git ${f.version}`);
  check(num(bytes) === f.bytes, `public row ${h}: bytes ${bytes} ≠ git ${f.bytes}`);
  check(shaCell === '`' + f.sha256 + '`', `public row ${h}: sha ≠ git`);
  check(committer === f.committerLabel, `public row ${h}: committer "${committer}" ≠ git "${f.committerLabel}"`);
  check(message === f.messageCell, `public row ${h}: message ≠ git first line (${MSG_LEN} chars, | escaped)`);
  check(f.steps === 19, `public row ${h}: index.html holds ${f.steps} STEP markers, expected 19`);
});
const pubWebflow = Object.values(pubFacts).filter(f => f.webflow).length;
const pubLocal = pubRows.length - pubWebflow;
const pubMerges = Object.values(pubFacts).filter(f => f.parents.length > 1).length;
const pubOrgAuthored = Object.values(pubFacts).filter(f => ['Learning Producers', 'LearningProducers'].includes(f.authorName)).length;

// ---------- 2. origin commit table: internal consistency ----------
const orgTable = tableAfter('## Commit lineage — origin repository (private as of the record date)');
const orgRows = orgTable.rows;
const orgByShort = {};
orgRows.forEach((r, i) => {
  const h = short(r[2]);
  check(Number(r[0]) === i + 1, `origin row ${h}: # is ${r[0]}, expected ${i + 1}`);
  check(/^\d{4}-\d{2}-\d{2}$/.test(r[1]), `origin row ${h}: date cell malformed`);
  check(r[6] === 'GitHub web-flow (signed)' || r[6] === 'local', `origin row ${h}: committer cell "${r[6]}"`);
  orgByShort[h] = { n: i + 1, date: r[1], version: r[3], bytes: r[4], sha: r[5], committer: r[6] };
});
const orgTotal = orgRows.length;
const orgWebflow = orgRows.filter(r => r[6] === 'GitHub web-flow (signed)').length;
const orgLocal = orgTotal - orgWebflow;
const orgRoot = short(orgRows[0][2]);
const orgHead = short(orgRows[orgRows.length - 1][2]);

// ---------- 3. counts stated in prose, each against the tables or git ----------
function stated(re, what) { const m = text.match(re); check(!!m, `sentence not found: ${what}`); return m ? m.slice(1).map(x => (/^\d+$/.test(x) ? Number(x) : x)) : null; }
let m;
m = stated(/As of the record date: (\d+) commits, head \[`([0-9a-f]{7})`\]/, 'public "as of the record date" count');
if (m) { check(m[0] === pubRows.length, `stated ${m[0]} public commits ≠ ${pubRows.length} rows`); check(m[1] === pubHead, `stated head ${m[1]} ≠ last public row ${pubHead}`); }
m = stated(/app version v([\d.]+), (\w+) merged pull requests/, 'public merged pull requests');
if (m) { check(WORDS[m[1].toLowerCase()] === pubMerges, `stated ${m[1]} merged public pull requests ≠ ${pubMerges} merge commits`); check(m[0] === pubFacts[pubHead].version.replace(/^v/, ''), `stated app version v${m[0]} ≠ head's ${pubFacts[pubHead].version}`); }
m = stated(/(\d+) commits from root `([0-9a-f]{7})`[^`]*to head `([0-9a-f]{7})`/, 'origin count, root and head');
if (m) { check(m[0] === orgTotal, `stated ${m[0]} origin commits ≠ ${orgTotal} rows`); check(m[1] === orgRoot, `stated origin root ${m[1]} ≠ first row ${orgRoot}`); check(m[2] === orgHead, `stated origin head ${m[2]} ≠ last row ${orgHead}`); }
m = stated(/(\d+) of the (\d+) origin commits and (\d+) of the (\d+) public commits were committed by GitHub's `web-flow`/, 'web-flow counts');
if (m) { check(m[0] === orgWebflow && m[1] === orgTotal, `stated ${m[0]}/${m[1]} origin web-flow ≠ table ${orgWebflow}/${orgTotal}`); check(m[2] === pubWebflow && m[3] === pubRows.length, `stated ${m[2]}/${m[3]} public web-flow ≠ git ${pubWebflow}/${pubRows.length}`); }
m = stated(/(\w+) pull requests in the origin repository and (\w+) in the public repository add GitHub-side/, 'pull-request counts');
if (m) { check(WORDS[m[1].toLowerCase()] === pubMerges, `stated ${m[1]} public pull requests ≠ ${pubMerges} merge commits`); const orgMerges = orgRows.filter(r => /^Merge pull request #/.test(r[7])).length; check(WORDS[m[0].toLowerCase()] === orgMerges, `stated ${m[0]} origin pull requests ≠ ${orgMerges} merge rows`); }
m = stated(/The (\d+) origin commits and (\d+) public commits made from a local CLI are unsigned/, 'local-CLI counts');
if (m) { check(m[0] === orgLocal, `stated ${m[0]} local origin commits ≠ table ${orgLocal}`); check(m[1] === pubLocal, `stated ${m[1]} local public commits ≠ git ${pubLocal}`); }
m = stated(/All (\d+) origin commits and (\d+) of the (\d+) public commits are recorded under the organization's name/, 'authorship counts');
if (m) { check(m[0] === orgTotal, `stated ${m[0]} origin commits ≠ ${orgTotal} rows`); check(m[1] === pubOrgAuthored && m[2] === pubRows.length, `stated ${m[1]}/${m[2]} public commits under the organization's name ≠ git ${pubOrgAuthored}/${pubRows.length}`); }
m = stated(/(\d+) of the (\d+) commits across both repositories are of that kind, and the remaining (\d+)/, 'both-repository web-flow sentence');
if (m) { check(m[0] === orgWebflow + pubWebflow, `stated ${m[0]} web-flow across both ≠ ${orgWebflow + pubWebflow}`); check(m[1] === orgTotal + pubRows.length, `stated ${m[1]} total ≠ ${orgTotal + pubRows.length}`); check(m[2] === orgLocal + pubLocal, `stated remaining ${m[2]} ≠ ${orgLocal + pubLocal}`); }
m = stated(/so `fb4165e` has (\d+) ancestors/, 'ancestor count');
if (m) check(m[0] === orgTotal, `stated ${m[0]} ancestors ≠ ${orgTotal} origin rows`);
m = stated(/the `GitHub` committer on the (\d+) server-side rows/, 'verify-recipe web-flow count');
if (m) check(m[0] === orgWebflow, `stated ${m[0]} server-side rows ≠ ${orgWebflow}`);
m = stated(/(\d+) commits from `([0-9a-f]{7})` to `([0-9a-f]{7})`, all `web-flow`/, 'all-web-flow span');
if (m) { const a = orgByShort[m[1]], b = orgByShort[m[2]]; check(a && b && a.n === 1 && b.n === m[0], `span ${m[1]}..${m[2]} is not rows 1..${m[0]}`); if (a && b) check(orgRows.slice(a.n - 1, b.n).every(r => r[6] === 'GitHub web-flow (signed)'), `span rows ${a.n}..${b.n} are not all web-flow`); }
m = stated(/`e02d5ce` is the (\d+)(?:st|nd|rd|th) of the (\d+) commits/, 'e02d5ce position');
if (m) { check(orgByShort['e02d5ce'] && orgByShort['e02d5ce'].n === m[0], `stated e02d5ce position ${m[0]} ≠ row ${orgByShort['e02d5ce'] && orgByShort['e02d5ce'].n}`); check(m[1] === orgTotal, `stated total ${m[1]} ≠ ${orgTotal}`); }
m = stated(/tracked between rows (\d+) and (\d+)/, 'internal-document row span');
if (m) check(m[0] >= 1 && m[1] <= orgTotal && m[0] < m[1], `row span ${m[0]}..${m[1]} outside the origin table`);

// ---------- 4. repository provenance table ----------
const prov = tableAfter('## Repository provenance');
const provPub = prov.rows.find(r => r[0].includes('LearningProducers/CombatWriting]'));
const provOrg = prov.rows.find(r => r[0].includes('CombatWriting-archive'));
check(!!provPub && !!provOrg, 'provenance table has both repository rows');
if (provPub) {
  check(short(provPub[3]) === expectedOrder[0], `provenance: public root ${short(provPub[3])} ≠ first commit ${expectedOrder[0]}`);
  check(short(provPub[5]) === pubHead, `provenance: public head ${short(provPub[5])} ≠ last public row ${pubHead}`);
  check(num(provPub[6]) === pubRows.length, `provenance: public commit count ${provPub[6]} ≠ ${pubRows.length}`);
  check(provPub[7] === '`' + pubFacts[pubHead].sha256 + '`', 'provenance: public head index.html sha ≠ git');
}
if (provOrg) {
  check(short(provOrg[3]) === orgRoot, `provenance: origin root ${short(provOrg[3])} ≠ first origin row ${orgRoot}`);
  check(short(provOrg[5]) === orgHead, `provenance: origin head ${short(provOrg[5])} ≠ last origin row ${orgHead}`);
  check(num(provOrg[6]) === orgTotal, `provenance: origin commit count ${provOrg[6]} ≠ ${orgTotal}`);
  check(provOrg[7] === orgRows[orgRows.length - 1][5], 'provenance: origin head sha ≠ last origin row sha');
}

// ---------- 5. chain of custody ----------
const pubRootFacts = pubFacts[expectedOrder[0]];
check(orgRows[orgRows.length - 1][5] === '`' + pubRootFacts.sha256 + '`', 'chain of custody: origin head index.html sha ≠ public root index.html sha');
check(text.includes(pubRootFacts.sha256), 'chain-of-custody sha appears in the text');

// ---------- 6. version lineage ----------
const vl = tableAfter('## Version lineage');
const firstVersionRowInOrigin = {};
orgRows.forEach(r => { const v = r[3]; if (v !== '–' && !(v in firstVersionRowInOrigin)) firstVersionRowInOrigin[v] = r; });
const firstVersionInPublic = {};
expectedOrder.forEach(h => { const v = pubFacts[h].version; if (!(v in firstVersionInPublic)) firstVersionInPublic[v] = h; });
vl.rows.forEach(r => {
  const [version, commitCell, date, repo, bytes, sha] = r; const h = short(commitCell);
  if (repo === 'archive') {
    const o = firstVersionRowInOrigin[version];
    check(!!o && short(o[2]) === h, `version lineage ${version}: ${h} is not the first origin row carrying it (${o ? short(o[2]) : 'none'})`);
    if (o) { check(o[1] === date, `version lineage ${version}: date ${date} ≠ origin row ${o[1]}`); check(o[4] === bytes && o[5] === sha, `version lineage ${version}: bytes/sha ≠ origin row`); }
  } else if (repo === 'public') {
    check(!(version in firstVersionRowInOrigin), `version lineage ${version}: marked public but the origin table carries it`);
    check(firstVersionInPublic[version] === h, `version lineage ${version}: ${h} is not the first public commit carrying it (${firstVersionInPublic[version]})`);
    const f = pubFacts[h]; check(f && f.date === date && num(bytes) === f.bytes && sha === '`' + f.sha256 + '`', `version lineage ${version}: row ≠ git`);
  } else check(false, `version lineage ${version}: repo cell "${repo}"`);
});
check(vl.rows.length === Object.keys(firstVersionRowInOrigin).length + Object.keys(firstVersionInPublic).filter(v => !(v in firstVersionRowInOrigin)).length, `version lineage has ${vl.rows.length} rows; tables imply ${Object.keys(firstVersionRowInOrigin).length + Object.keys(firstVersionInPublic).filter(v => !(v in firstVersionRowInOrigin)).length}`);

// ---------- 7. feature genesis ----------
const fg = tableAfter('## Feature genesis');
const markerCol = fg.header.findIndex(h => /Marker/.test(h));
check(markerCol >= 0, 'feature-genesis table has a marker column');
fg.rows.forEach(r => {
  const feature = r[0], version = r[1], h = short(r[2]), date = r[3], repo = r[4];
  const markers = (r[markerCol] || '').match(/`((?:[^`\\]|\\.)*)`/g) || [];
  const strs = markers.map(x => x.slice(1, -1).replace(/\\\|/g, '|'));
  check(strs.length > 0, `feature "${feature.slice(0, 40)}": no marker`);
  if (repo === 'origin') {
    const o = orgByShort[h];
    check(!!o, `feature "${feature.slice(0, 40)}": commit ${h} not in origin table`);
    if (o) { check(o.date === date, `feature "${feature.slice(0, 40)}": date ${date} ≠ origin row ${o.date}`); check(o.version === version, `feature "${feature.slice(0, 40)}": version ${version} ≠ origin row ${o.version}`); }
  } else if (repo === 'public') {
    const first = expectedOrder.find(x => strs.every(s => pubFacts[x].text.includes(s)));
    check(first === h, `feature "${feature.slice(0, 40)}": first public commit with its markers is ${first}, row says ${h}`);
    const f = pubFacts[h]; check(f && f.date === date && f.version === version, `feature "${feature.slice(0, 40)}": date/version ≠ git`);
  } else check(false, `feature "${feature.slice(0, 40)}": repo cell "${repo}"`);
});

// ---------- 8. step count and the retired figure ----------
check(!/18[ -]steps?\b/i.test(text), 'the text still contains an 18-step figure');
check(/holds 19 steps/.test(text), 'the text states the 19-step count');
m = stated(/the same (\w+) critique modes/, 'critique-mode count');
if (m) check(WORDS[m[0]] === (pubFacts[pubHead].text.match(/mode==='/g) || []).length, `stated ${m[0]} critique modes ≠ ${(pubFacts[pubHead].text.match(/mode==='/g) || []).length} mode branches in index.html at ${pubHead}`);

// ---------- 9. verify-recipe hashes ----------
for (const [, h, sha] of text.matchAll(/git show ([0-9a-f]{40}):index\.html \| sha256sum`\. The result must be `([0-9a-f]{64})`/g)) { const f = commitFacts(h.slice(0, 7)); check(f.sha256 === sha, `verify recipe: sha for ${h.slice(0, 7)} ≠ git`); }
for (const [, h, sha] of text.matchAll(/against `([0-9a-f]{40})` for v[\d.]+ and expect `([0-9a-f]{64})`/g)) { const f = commitFacts(h.slice(0, 7)); check(f.sha256 === sha, `verify recipe: sha for ${h.slice(0, 7)} ≠ git`); }

// ---------- report ----------
for (const f of failures) console.log('FAIL ' + f);
console.log(`${checks - failures.length} of ${checks} checks passed`);
process.exit(failures.length ? 1 : 0);
