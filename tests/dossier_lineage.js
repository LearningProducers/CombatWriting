#!/usr/bin/env node
'use strict';
// Computes every lineage table and count in docs/combat-writing-prior-art.md from git.
// Plain Node and git; no other program is called. Used two ways:
//
//   node tests/dossier_lineage.js --archive <clone of the origin repository> [--public <this repository>] [--public-head aef12ce] [--json]
//     prints the four generated tables (public commits, origin commits, version lineage, feature genesis)
//     as Markdown, or everything as JSON with --json.
//
//   require('./dossier_lineage') from tests/dossier_check.js, which re-derives the record's rows and counts.
//
// Web-flow is decided from the raw commit object: committer address at GitHub's no-reply host and a
// gpgsig header present. GnuPG is never invoked, so the result is the same on every machine.

const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const MSG_LEN = 120;                    // first-line message column width
const TZ_OFFSET_MS = -5 * 3600 * 1000;  // the tables' "Date (author, -05:00)" column
const STEP_MARKER = 'class="meth-step-head">STEP';
const PUBLIC_COMMIT_URL = 'https://github.com/LearningProducers/CombatWriting/commit/';
const ORG_NAMES = ['Learning Producers', 'LearningProducers'];
const ORG_DOMAIN = 'learningproducers.com';

function git(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); }
function gitBuf(repo, ...args) { return execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); }
function isoUtc(ts) { return new Date(ts * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function dateAt05(ts) { return new Date(ts * 1000 + TZ_OFFSET_MS).toISOString().slice(0, 10); }
function addressClass(email) {
  const e = String(email || '').toLowerCase();
  if (e.endsWith('@' + ORG_DOMAIN)) return 'organization domain';
  if (e.endsWith('@gmail.com')) return 'gmail';
  if (e.endsWith('users.noreply.github.com')) return 'github no-reply';
  if (e.endsWith('@anthropic.com')) return 'anthropic no-reply';
  return 'other';
}

/** Every commit reachable from `head`, oldest first, in `git rev-list --reverse` order. */
function commitsOf(repo, head) {
  const out = [];
  const hashes = git(repo, 'rev-list', '--reverse', head).trim().split('\n').filter(Boolean);
  hashes.forEach((full, i) => {
    const [at, an, ae, cn, ce, ct, subj, parents] = git(repo, 'log', '-1', '--format=%at%x00%an%x00%ae%x00%cn%x00%ce%x00%ct%x00%s%x00%P', full).replace(/\n$/, '').split('\0');
    const raw = git(repo, 'cat-file', '-p', full);
    const headers = raw.split('\n\n')[0];
    const gpgsig = /^gpgsig /m.test(headers);
    const sigKind = gpgsig ? ((headers.match(/BEGIN ([A-Z ]*)SIGNATURE/) || [, ''])[1].trim() || 'PGP') : '';
    const body = git(repo, 'log', '-1', '--format=%B', full);
    const r = {
      n: i + 1, full, short: full.slice(0, 7), authorTs: Number(at), authorName: an, authorAddressClass: addressClass(ae),
      committerName: cn, committerAddressClass: addressClass(ce), committerTs: Number(ct), subject: subj,
      parents: parents.split(/\s+/).filter(Boolean), gpgsig, sigKind, trailer: /^Claude-Session:/m.test(body),
    };
    r.merge = r.parents.length > 1;
    r.date = dateAt05(r.authorTs);
    r.authorIsoUtc = isoUtc(r.authorTs); r.committerIsoUtc = isoUtc(r.committerTs);
    r.webflow = ce === 'noreply@github.com' && gpgsig;
    r.committerLabel = r.webflow ? 'GitHub web-flow (signed)' : 'not web-flow';
    r.orgAuthored = ORG_NAMES.includes(an);
    r.messageCell = subj.slice(0, MSG_LEN).replace(/\|/g, '\\|');
    try {
      const blob = gitBuf(repo, 'show', `${full}:index.html`);
      r.hasIndex = true; r.bytes = blob.length; r.sha256 = crypto.createHash('sha256').update(blob).digest('hex');
      r.text = blob.toString('utf8');
      const m = r.text.match(/APP_VERSION\s*=\s*['"]([^'"]*)['"]/); r.version = m ? m[1] : 'none';
      r.steps = r.text.split(STEP_MARKER).length - 1;
    } catch (e) { r.hasIndex = false; r.bytes = null; r.sha256 = null; r.text = ''; r.version = '–'; r.steps = 0; }
    out.push(r);
  });
  return out;
}

/** First row whose index.html contains every marker. */
function firstWith(rows, markers) { return rows.find(r => r.hasIndex && markers.every(m => r.text.includes(m))) || null; }

/** Feature rows: text, the exact strings searched for, and which repository's history is scanned. */
const FEATURES = [
  ['Four-stage pipeline (STRATEGY, SPARRING, BATTLE, CHAMPION) with Source Material, Context Brief, Focus Question, Synthesis Focus Question, Navigation, Synthesis Navigation, Final Draft', ['CHAMPION', 'id="final-draft"'], 'archive'],
  ['Manual crew fields for models used outside the app (the methodology names Claude, Grok, and Perplexity)', ['id="r-perp"'], 'archive'],
  ['Offline path: local Ollama server called from the browser (`OLLAMA_ORIGINS=*`)', ['OLLAMA_ORIGINS'], 'archive'],
  ['Dolphin3 named as the offline model', ['Dolphin3'], 'archive'],
  ['Signal-to-noise check with a machine-parsable first line (`S/N RATIO: XX%`)', ['S/N RATIO:'], 'archive'],
  ['Red-flag field: a manual red-flag check recorded before publication', ['id="red-flag"'], 'archive'],
  ['Red-flag check with a machine-parsable first line (`NO RED FLAGS` / `RED FLAGS FOUND: X`)', ['RED FLAGS FOUND'], 'archive'],
  ["Firsthand-account protection in the red-flag contract (the author's lived experience is never a red flag)", ['firsthand'], 'archive'],
  ['"rate it on a scale from 1–10, you cannot use 7" in the methodology text', ['cannot use 7'], 'archive'],
  ['Groq cloud crew: user-supplied API key in local storage, never exported; two slots on different model families (Llama 3.3 70B and Qwen3 32B when the crew first appears)', ['api.groq.com', 'llama-3.3-70b', 'Qwen3 32B'], 'archive'],
  ['Third-person self-reference ban and roundtable self-identity injection for crew models', ['This is your name in this session', 'third person'], 'archive'],
  ['Insight Vault and Canon', ['cw_vault', 'cw_canon'], 'archive'],
  ['Flowchart tab and Methodology tab with 19 steps', ['FLOWCHART', 'meth-step-head">STEP 19'], 'archive'],
  ['Named save slots, EXPORT ALL / import as JSON, print summary, read-aloud (Web Speech API), mobile layout', ['ldSlots', 'function exportAll', 'function importState', 'function printSummary', 'speechSynthesis', 'max-width:800px'], 'archive'],
  ['Single-click DOWNLOAD of the running file', ['function downloadApp'], 'archive'],
  ['Tagline "Reading is Peace. Writing is War." and the all-rights-reserved header with personal-use terms', ['Reading is Peace', 'All rights reserved'], 'archive'],
  ['Footer attribution "Founder: Israel Hernandez"', ['Founder: Israel Hernandez'], 'archive'],
  ['In-app attribution "Combat Writing (CW) by Learning Producers, Inc. (Israel Hernandez)" in the crew session-context text', ['Learning Producers, Inc. (Israel Hernandez)'], 'archive'],
  ['Scholar identity preamble (models engage as thinking minds, refusal is the failure mode)', ['SCHOLAR IDENTITY'], 'archive'],
  ['Per-slot crew memory (short session memory per model)', ['groqMemory'], 'archive'],
  ['Knowledge-cutoff awareness clause in the red-flag contract (recent dates are not "future dates")', ['KNOWLEDGE CUTOFF'], 'archive'],
  ['Paste sanitizer against URL-encoded clipboard content on iOS', ['__cwShadow'], 'archive'],
  ['GAUNTLET N: / ANSWER: pre-commitment format (verdict before argument) and intent inference', ['GAUNTLET N:', 'INTENT INFERENCE'], 'archive'],
  ["Dolphin3 tribunal parity: the local model's system prompts come from one builder whose modes mirror the cloud crew's inline prompts", ['function buildOllamaSystemPrompt'], 'archive'],
  ['Print Path Provenance: printout as a decision artifact ending in a provenance page with model attribution and disclosure', ['PROVENANCE'], 'archive'],
  ['Memory-eviction disclosure (the model is told when prior turns were dropped)', ['buildEvictedMessages'], 'archive'],
  ['Capability disclosure banner for the local model, the rating scale locked in the local model\'s prompt contract, and honest-time copy ("Typical: 2–5 minutes on Mac CPU")', ['capability disclosure', 'RATING SCALE', 'Typical: 2–5 minutes on Mac CPU'], 'archive'],
  ['Stage tabs, focus mode (collapseAllStages), council-card layout for Sparring and Battle', ['stage-tab', 'collapseAllStages'], 'archive'],
  ['FILE MAP header (line-range map, doctrine lock, version-site count)', ['FILE MAP'], 'archive'],
  ['MODEL_CONFIG registry: every model-dependent value is data, no code branches on a model-name substring; roster moves to the GPT-OSS family', ['MODEL_CONFIG'], 'archive'],
  ['Expand-overlay paper mode (scoped light theme for reading)', ['paper mode'], 'archive'],
  ['Two-family rule: the crew must carry two genuinely different model families (slot B moves to Qwen3.6 27B)', ['qwen3.6'], 'archive'],
  ['Public-presentation comment pass (ORIGIN note reworded for public presentation)', ['ruled 2026-07-16'], 'archive'],
  ['Internal docs untracked; FILE MAP points to their external home', ['lpi-ops'], 'archive'],
  ["Slots resolve from Groq's live catalog (`GET /openai/v1/models`): a slot is a family, not an id; preferred id → newest in family → newest from an unused vendor → NULL shown as NO SECOND VOICE; two slots never share an id", ['GROQ_CATALOG_URL'], 'public'],
];

const fmtBytes = b => (b === null ? '–' : b.toLocaleString('en-US'));
const fmtSha = s => (s ? '`' + s + '`' : '–');
const link = r => `[\`${r.short}\`](${PUBLIC_COMMIT_URL}${r.full})`;
const cellFor = (r, repo) => (repo === 'public' ? link(r) : '`' + r.short + '`');

function publicRow(r) { return `| ${r.n} | ${r.date} | ${link(r)} | ${r.version} | ${fmtBytes(r.bytes)} | ${fmtSha(r.sha256)} | ${r.committerLabel} | ${r.messageCell} |`; }
function originRow(r) { return `| ${r.n} | ${r.date} | \`${r.short}\` | ${r.version} | ${fmtBytes(r.bytes)} | ${fmtSha(r.sha256)} | ${r.committerLabel} | ${r.messageCell} |`; }

/** Version lineage: first commit carrying each APP_VERSION string, archive first, then public-only strings. */
function versionLineage(arch, pub) {
  const rows = [], seen = new Set();
  for (const [repo, list] of [['archive', arch], ['public', pub]]) {
    for (const r of list) {
      if (!r.hasIndex || r.version === '–' || seen.has(r.version)) continue;
      seen.add(r.version); rows.push({ version: r.version, r, repo });
    }
  }
  return rows;
}
function lineageRow(l) { return `| ${l.version} | ${cellFor(l.r, l.repo)} | ${l.r.date} | ${l.repo} | ${fmtBytes(l.r.bytes)} | ${fmtSha(l.r.sha256)} |`; }

function featureGenesis(arch, pub) {
  return FEATURES.map(([feature, markers, scan]) => {
    const r = firstWith(scan === 'archive' ? arch : pub, markers);
    if (!r) throw new Error('marker set never found: ' + JSON.stringify(markers));
    return { feature, markers, r, repo: scan === 'archive' ? 'origin' : 'public' };
  });
}
function featureRow(f) {
  const marks = f.markers.map(m => '`' + m.replace(/\|/g, '\\|') + '`').join(', ');
  return `| ${f.feature} | ${f.r.version} | ${cellFor(f.r, f.repo)} | ${f.r.date} | ${f.repo} | ${marks} |`;
}

/** Hours from each non-web-flow commit to the next GitHub-committed commit, by committer time. */
function hoursToNextWebflow(rows) {
  const wf = rows.filter(r => r.webflow).map(r => r.committerTs);
  return rows.filter(r => !r.webflow).map(r => { const later = wf.filter(t => t >= r.committerTs); return { short: r.short, hours: later.length ? (Math.min(...later) - r.committerTs) / 3600 : null }; });
}

function counts(rows) {
  const c = {
    total: rows.length, webflow: rows.filter(r => r.webflow).length, merges: rows.filter(r => r.merge).length,
    orgAuthored: rows.filter(r => r.orgAuthored).length, otherAuthorNames: [...new Set(rows.filter(r => !r.orgAuthored).map(r => r.authorName))],
    unsignedNonWebflow: rows.filter(r => !r.webflow && !r.gpgsig).length, trailers: rows.filter(r => r.trailer).length,
    authorAddressClasses: {}, nonWebflowCommitterClasses: {}, steps: [...new Set(rows.filter(r => r.hasIndex).map(r => r.steps))],
  };
  c.notWebflow = c.total - c.webflow;
  for (const r of rows) c.authorAddressClasses[r.authorAddressClass] = (c.authorAddressClasses[r.authorAddressClass] || 0) + 1;
  for (const r of rows.filter(r => !r.webflow)) c.nonWebflowCommitterClasses[r.committerAddressClass] = (c.nonWebflowCommitterClasses[r.committerAddressClass] || 0) + 1;
  const gaps = hoursToNextWebflow(rows).map(g => g.hours).filter(h => h !== null);
  c.maxHoursToNextWebflow = gaps.length ? Math.max(...gaps) : null;
  return c;
}

function strip(rows) { return rows.map(r => { const o = { ...r }; delete o.text; return o; }); }

function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const archive = opt('--archive'); const pubRepo = opt('--public', path.resolve(__dirname, '..')); const pubHead = opt('--public-head', 'aef12ce');
  if (!archive) { console.error('usage: dossier_lineage.js --archive <origin clone> [--public <repo>] [--public-head <commit>] [--json]'); process.exit(2); }
  const arch = commitsOf(archive, 'origin/main'); const pub = commitsOf(pubRepo, pubHead);
  const lineage = versionLineage(arch, pub); const features = featureGenesis(arch, pub);
  if (args.includes('--json')) {
    const out = { archive: strip(arch), public: strip(pub), lineage: lineage.map(l => ({ version: l.version, short: l.r.short, repo: l.repo })), features: features.map(f => ({ feature: f.feature, markers: f.markers, short: f.r.short, repo: f.repo })), counts: { origin: counts(arch), public: counts(pub) }, rootTree: git(archive, 'ls-tree', '--name-only', arch[0].full).trim().split('\n') };
    process.stdout.write(JSON.stringify(out, null, 1)); return;
  }
  const p = s => process.stdout.write(s + '\n');
  p('## public'); pub.map(publicRow).forEach(p); p(''); p('## origin'); arch.map(originRow).forEach(p); p('');
  p('## version lineage'); lineage.map(lineageRow).forEach(p); p(''); p('## feature genesis'); features.map(featureRow).forEach(p);
}

module.exports = { MSG_LEN, STEP_MARKER, ORG_NAMES, git, gitBuf, isoUtc, dateAt05, addressClass, commitsOf, firstWith, FEATURES, publicRow, originRow, versionLineage, lineageRow, featureGenesis, featureRow, hoursToNextWebflow, counts, link };
if (require.main === module) main();
