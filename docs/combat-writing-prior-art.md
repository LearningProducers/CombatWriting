# Combat Writing — repository lineage and public prior-art dossier

A dated, commit-anchored working record of **Combat Writing**, a single-file browser application by Learning Producers, Inc., served at combatwriting.learningproducers.com and published as source at [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting). It is modeled on the account-wide prior-art dossier kept for the [ruvnet](https://github.com/ruvnet/ruvnet/blob/main/docs/ruvnet-prior-art.md) GitHub account and keeps the same separation between kinds of evidence:

- **Repository lineage:** a root commit proves that a repository's history contains that commit and its self-asserted Git author date. It does not by itself prove when GitHub first served the commit, when the repository became public, or when a later feature appeared. Repository `created_at`, pull-request timestamps, tags, commits signed by GitHub's own web-flow key, and independent archives are stronger public-appearance evidence.
- **Claimed novelty (scoped candidate):** where the application appears to contain a first-of-its-kind combination, the claim is written as an explicit predicate with named prior art and a confidence level. A commit is a lineage anchor, not by itself proof that every current feature existed at that commit; the feature-genesis table below ties each feature to the first commit whose source contains it.

Confidence reflects how defensible the scoped predicate is against the named prior art after a non-exhaustive related-work review. Git author dates are self-asserted; where a commit was created through GitHub's web interface its committer timestamp was set by GitHub's servers, and those rows are marked.

> **Technical and legal scope:** This is a technical provenance record and non-exhaustive related-work review, not a patentability, inventorship, freedom-to-operate, trademark, or legal prior-art opinion. Items published after a claim's cutoff date are subsequent related work, not prior art against that cutoff. Copyright in the application subsists independently of this document; this document does not grant a license.

> **Rights:** The repository carries no open-source license. All rights are reserved by Learning Producers, Inc. The application file's header states its terms: personal use, modification for one's own private use, and no distribution, sublicensing, sale, or publication of the software or derivatives without explicit written permission. Third-party components (Groq's API and the models served through it, Ollama, and the Dolphin3 model) belong to their providers under their own terms.

> **Privacy scope of this record:** This document names the application's author, because authorship is part of what a provenance record has to establish and the attribution is already public in the application and on the author's byline. It names no other individuals and contains no email addresses, customers, prospects, correspondence, or internal Learning Producers records. Commit rows carry the hash, the recorded author date, the app version, the content hash of `index.html`, whether GitHub's server set the timestamp, and the first line of the commit message.

Record date: **2026-09-27**. Figures marked "as of the record date" are snapshots and will drift.

## Lineage at a glance

- **What the application is:** one `index.html` (no build step, no server, no dependencies) that walks a human-written draft through four stages, Strategy, Sparring, Battle, Champion, against a "crew" of language models that rate, argue, synthesize each other's critiques, and run signal-to-noise and red-flag checks before publication. The crew is two cloud models from different model families through the author's own Groq API key, or one local model (Dolphin3 8B through Ollama) with nothing leaving the machine. All state lives in the browser's local storage; the whole session exports and imports as JSON. Tagline: *"Reading is Peace. Writing is War."*
- **Public repository:** [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting), created **2026-07-30T20:51:53Z** (GitHub `created_at`), public, no LICENSE file, GitHub Pages enabled with `CNAME` = `combatwriting.learningproducers.com`. Root commit [`fb4165e`](https://github.com/LearningProducers/CombatWriting/commit/fb4165e88f1cf41f1227417a31484e1fd28c4fdd) "Combat Writing v41.7 - public source", author date 2026-07-30T20:52:15Z, 22 seconds after repository creation. As of the record date: 9 commits, head [`be2de4c`](https://github.com/LearningProducers/CombatWriting/commit/be2de4cc90a34880847bb9ac6080aea0e0adedb7), app version v41.8, three merged pull requests, no releases, no tags.
- **Origin repository:** `LearningProducers/CombatWriting-archive`, created **2026-04-02T06:09:45Z** (GitHub `created_at`), **private** as of the record date, 67 commits from root `e02d5ce` (author date 2026-04-09 21:22 -05:00, which is 2026-04-10T02:22:20Z) to head `43825cf` (2026-07-30T20:37:54Z). Per the owner, this is the original repository, renamed on 2026-07-30 when the public repository was created; GitHub preserves `created_at` across renames, and the April creation date is consistent with that account.
- **Chain of custody between the two repositories:** the `index.html` in the public root commit `fb4165e` is byte-identical to the `index.html` at the origin repository's head `43825cf`. Both hash to SHA-256 `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07`. The public root was authored 14 minutes after the origin head was merged. The v41.7 source in the public repository therefore is the v41.7 source in the private history, not a rewrite.
- **Earliest dated evidence of the application:** the origin root commit already carries **v31.8** with every headline feature present (four stages, Groq crew, Ollama path, S/N and red-flag checks, Insight Vault, Canon, print summary, export/import, save slots, read-aloud, the tagline, and the all-rights-reserved header). Versions before v31.8 predate any repository and are not evidenced here. The root date is an upper bound on genesis, not the genesis.
- **Server-attested rows:** 49 of the 67 origin commits and 5 of the 9 public commits were committed by GitHub's `web-flow` user (browser upload, browser edit, or pull-request merge) and are signed with GitHub's key. Their committer timestamps were set by GitHub, not by the author's machine. Seven pull requests in the origin repository and three in the public repository add GitHub-side `created_at` and `merged_at` timestamps, listed below.
- **Public-appearance cutoff:** everything dated before 2026-07-30 in this record rests on the private origin repository plus GitHub server metadata that only an authenticated reader can confirm today. The earliest date a stranger can verify without help is **2026-07-30** (public repository) for the v41.7 source and **2026-09-21** for v41.8. For the method rather than the code, the X thread of **2025-10-25** is verifiable by anyone while the posts stay live. See "Strengthening the record" for how to close the gap on the code.
- **Authorship:** Combat Writing is by **Israel Hernandez**, founder of Learning Producers, Inc., which holds the copyright. The attribution is in the application itself: the session-context text the crew receives opens "Combat Writing (CW) by Learning Producers, Inc. (Israel Hernandez)" and has been present since the origin root commit `e02d5ce` (v31.8, 2026-04-09). Every commit in both repositories is recorded under the organization's name and GitHub account, not an individual's, so the git metadata attests to the organization; the individual attribution rests on the in-app text and on the author's public byline (next bullet).
- **Public writing that predates the repository:** the method was public well before any commit. In order:
  - **2025-09-30T14:39Z (owner-dated):** the Learning Producers blog post now titled ["Combat Writing: Discovery in Publishing"](https://www.learningproducers.com/blog/combat-writing-expressing-bold-ideas-in-a-complex-business-world) by Israel Hernandez, at an address that keeps its original title ("Expressing Bold Ideas in a Complex Business World"). Its current text names Combat Writing, the four stages, and multiple AI models alongside human feedback. "Discovery in Publishing" is also the heading of the application's Methodology tab since the origin root commit. The publish date comes from the site's own Squarespace data, which the owner controls.
  - **2025-10-25T00:50:02Z (third-party-dated):** a post on the organization's X account, [status 1981885932794986964](https://x.com/learningproduce/status/1981885932794986964), asks Grok to read "my Combat Writing method" and carries a link card to the September post, described as "a methodology using multiple AI models to discover hidden insights." Grok's reply, [status 1981886091314802788](https://x.com/grok/status/1981886091314802788) at 00:50:40Z, gives a breakdown naming the motto "Reading is peace. Writing is War.", multi-AI and human feedback with human-led decisions, and the stages beginning with Strategy. A follow-up, [status 1981887835331600722](https://x.com/learningproduce/status/1981887835331600722) at 00:57:36Z, asks for the method's most compelling component. The times are decoded from the posts' Snowflake IDs, which X's servers assign at creation; this record's tooling reproduced the decoding from the IDs. **This thread is the earliest third-party-dated evidence in this record:** it fixes that the September post and its method were public by 2025-10-25T00:50Z and records what an outside reader reported the method said that day.
  - **2025-11-11T19:50Z (owner-dated):** the Learning Producers blog post ["Words Received: (S/N) Signal-to-Noise Ratio in Evaluating Writing"](https://www.learningproducers.com/blog/words-received-sn-signal-to-noise-ratio-in-evaluating-writing) by Israel Hernandez describes sending a draft to multiple language models as separate receivers, with signal-to-noise as the measure. An earlier draft of this record carried an indexed date of 2026-03-18 for this post; that was an index or modification date, not the publish date.
  - **2026-01-14 (owner-confirmed):** the Medium post ["Battling AI Slop and Human Slop"](https://medium.com/@Learningproducers/battling-ai-slop-and-human-slop-a0f22f91728b) by Israel Hernandez names Combat Writing, its motto, and dialogue with multiple AI models.
  None of these pages was fetched by the tooling that built this record (the site, X, and Medium were unreachable from it); their dates and contents were confirmed by the owner from outside that environment, except the X timestamps, which follow from the IDs. What each can and cannot prove is set out in the honest scope notes.
- **Work clusters:** (A) the adversarial critique pipeline and its prompt contracts; (B) runtime, privacy, and model-resolution architecture; (C) authoring and record surfaces; (D) the methodology and ship doctrine.

## Evidence layers used in this record

| Layer | What it proves | Where it comes from |
|---|---|---|
| 1. Lineage | That the history contains a commit with a self-asserted author date | `git log` on either repository |
| 2. Server-attested | That GitHub's servers recorded an event at a time | `created_at` of repositories and pull requests, `merged_at`, tags, `web-flow` committer signatures |
| 3. Public appearance | That an unauthenticated reader could see it | Public repository since 2026-07-30; the GitHub Pages site (a Wayback Machine capture history was not retrievable from the environment that built this record and is listed as a to-do) |
| 4. Feature evidence | That a feature existed in a given version | The `index.html` at each commit; SHA-256 per version in the tables below |
| 5. Novelty | Scoped candidate claims | The claims sections, with named prior art and confidence |

## Repository provenance

| Repository | Visibility | GitHub `created_at` | Root commit | Root author date | Head (record date) | Commits | index.html at head |
|---|---|---|---|---|---|---|---|
| [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting) | public | 2026-07-30T20:51:53Z | [`fb4165e`](https://github.com/LearningProducers/CombatWriting/commit/fb4165e88f1cf41f1227417a31484e1fd28c4fdd) | 2026-07-30T20:52:15Z | [`be2de4c`](https://github.com/LearningProducers/CombatWriting/commit/be2de4cc90a34880847bb9ac6080aea0e0adedb7) · v41.8 | 9 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` |
| LearningProducers/CombatWriting-archive | private | 2026-04-02T06:09:45Z | `e02d5ce` | 2026-04-10T02:22:20Z (2026-04-09 21:22 -05:00) | `43825cf` · v41.7 | 67 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` |

Files ever tracked in the origin repository: `index.html`, `README.md`, `CNAME`, `.gitignore`, and three internal working documents (`CLAUDE.md`, `CW_QA_RUNBOOK.md`, `HANDOFF.md`) that were tracked between 2026-07-16 and 2026-07-30 and untracked at v41.7 before publication. Their contents are internal and are not reproduced or summarized here. The public repository tracks `index.html`, `README.md`, `CNAME`, `.gitignore`, and `gmail.html`, a separate one-page tool added on 2026-08-05 that the README states is not part of Combat Writing; it carries no claim in this record.

## Server-attested events

Timestamps in this table were recorded by GitHub, not by the author's machine.

| Date (UTC) | Repository | Event | Detail |
|---|---|---|---|
| 2026-04-02T06:09:45Z | origin | Repository created | `created_at` |
| 2026-04-10T02:22:20Z | origin | Root commit committed by `web-flow` | `e02d5ce` "buttons", v31.8; browser-side commit, GitHub-signed |
| 2026-04-10T02:39:41Z | origin | "Add files via upload" committed by `web-flow` | `65be896`, v31.9 |
| 2026-04-10 to 2026-05-14 | origin | 40 further `web-flow` commits | every version from v32.7 through v41.1 was committed through GitHub's interface; see the lineage table |
| 2026-07-16T23:23:49Z | origin | PR #1 opened | v41.2, Groq roster swap and per-model config registry; merged 2026-07-17T01:20:47Z |
| 2026-07-16T23:37:41Z | origin | PR #2 opened | repository working-rules document; merged 2026-07-17T01:21:15Z |
| 2026-07-17T03:55:27Z | origin | PR #3 opened | v41.3, expand-overlay paper mode; merged 2026-07-17T03:58:36Z |
| 2026-07-21T00:49:12Z | origin | PR #4 opened | v41.4, methodology Step 7 names Dolphin3; merged 2026-07-21T01:29:21Z |
| 2026-07-21T01:29:21Z | origin | Tag `pre-slotB-swap-2026-07-23` | points at the PR #4 merge commit `1b4f226` |
| 2026-07-23T18:59:42Z | origin | PR #5 opened | v41.5, council slot B moves to the Qwen family; merged 2026-07-23T19:19:43Z |
| 2026-07-30T17:51:34Z | origin | PR #6 opened | v41.6, public-presentation comment pass, zero behavior change; merged 2026-07-30T20:12:37Z |
| 2026-07-30T20:34:48Z | origin | PR #7 opened | v41.7, untrack internal docs; merged 2026-07-30T20:37:54Z (head `43825cf`) |
| 2026-07-30T20:51:53Z | public | Repository created | `created_at` |
| 2026-07-30T20:52:15Z | public | Root commit | `fb4165e`, v41.7 public source; `index.html` byte-identical to origin head |
| 2026-08-06T00:15:00Z | public | PR #1 opened | `gmail.html` launcher page, not part of Combat Writing; merged 2026-08-06T00:40:07Z |
| 2026-09-21T11:57:34Z | public | PR #2 opened | v41.8, council slots resolve from Groq's live catalog; merged 2026-09-21T19:36:47Z |
| 2026-09-22T19:07:11Z | public | PR #3 opened | README describes v41.8; merged 2026-09-22T19:18:49Z |

## Public writing and attribution outside GitHub

Ordered by date. "Owner-dated" means the date is set on a system the owner controls and can change; "third-party-dated" means a server outside the owner's control assigned it.

| Date (UTC) | Item | What it evidences | Date layer | Verification |
|---|---|---|---|---|
| 2025-09-30T14:39Z | Blog post ["Combat Writing: Discovery in Publishing"](https://www.learningproducers.com/blog/combat-writing-expressing-bold-ideas-in-a-complex-business-world), Israel Hernandez, learningproducers.com (address keeps the original title; the title has changed since) | The name, the four stages, multiple AI models alongside human feedback; the heading matches the app's Methodology tab | Owner-dated (Squarespace publish date, editable) | Confirmed by the owner outside the build environment from the page and the site's JSON data; not fetched by this record's tooling |
| 2025-10-25T00:50:02Z | X post [1981885932794986964](https://x.com/learningproduce/status/1981885932794986964) by the organization's account, asking Grok to read "my Combat Writing method", link card to the September post | That the September post and the method were public by this moment | Third-party-dated (X Snowflake ID) | Timestamp decoded from the ID by this record's tooling; content confirmed by the owner; page not fetched |
| 2025-10-25T00:50:40Z | Grok's reply, [1981886091314802788](https://x.com/grok/status/1981886091314802788) | An outside reader's same-day record of the method: the motto "Reading is peace. Writing is War.", multi-AI and human feedback with human-led decisions, stages beginning with Strategy | Third-party-dated (X Snowflake ID) | As above |
| 2025-10-25T00:57:36Z | Follow-up X post [1981887835331600722](https://x.com/learningproduce/status/1981887835331600722), "What is the most compelling component of Combat Writing?" | Continuation of the same public thread | Third-party-dated (X Snowflake ID) | As above |
| 2025-11-11T19:50Z | Blog post ["Words Received: (S/N) Signal-to-Noise Ratio in Evaluating Writing"](https://www.learningproducers.com/blog/words-received-sn-signal-to-noise-ratio-in-evaluating-writing), Israel Hernandez | Multiple language models as separate receivers of a draft; signal-to-noise as the measure | Owner-dated (Squarespace publish date, editable) | Confirmed by the owner outside the build environment; not fetched by this record's tooling |
| 2026-01-14 | Medium post ["Battling AI Slop and Human Slop"](https://medium.com/@Learningproducers/battling-ai-slop-and-human-slop-a0f22f91728b), Israel Hernandez | The name, the motto, dialogue with multiple AI models, authorship | Platform-dated (Medium publish date) | Confirmed by the owner outside the build environment; not fetched by this record's tooling |
| 2026-04-09 | In-app attribution "Combat Writing (CW) by Learning Producers, Inc. (Israel Hernandez)" in the crew session-context text, origin root commit `e02d5ce` | Authorship, in the artifact itself | Git author date; committed through GitHub's interface | Verified in source; public in the same text since `fb4165e` (2026-07-30) |

## Feature genesis

First commit whose `index.html` contains the feature. Origin-repository hashes are not publicly resolvable while that repository is private; the SHA-256 of the file at that commit is in the version lineage table so the claim can be checked against any copy of the file.

| Feature | First version | First commit | Date | Repo |
|---|---|---|---|---|
| Four-stage pipeline (STRATEGY, SPARRING, BATTLE, CHAMPION) with Source Material, Context Brief, Focus Question, Synthesis Focus Question, Navigation, Synthesis Navigation, Final Draft | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Groq cloud crew: two slots on different model families (Llama 3.3 70B and Qwen3 32B at v31.8), user-supplied API key in local storage, never exported | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Manual crew fields for models used outside the app (the methodology names Claude, Grok, and Perplexity) | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Offline path: local Ollama server called from the browser (`OLLAMA_ORIGINS=*`), Dolphin3 model | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Signal-to-noise check with a machine-parsable first line (`S/N RATIO: XX%`) delivered by a "signal analyst in a closed editorial tribunal" | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Red-flag check with a machine-parsable first line (`NO RED FLAGS` / `RED FLAGS FOUND: X`) and firsthand-account protection (the author's lived experience is never a red flag) | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| "Rate it 1–10, you cannot use 7" in the methodology text | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Third-person self-reference ban and roundtable self-identity injection for crew models | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Insight Vault, Canon, Flowchart tab, Methodology tab (19 steps) | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Five named save slots, EXPORT ALL / import as JSON, print summary, read-aloud (Web Speech API) with text cleaning for speech, single-click DOWNLOAD of the running file, mobile layout | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Tagline "Reading is Peace. Writing is War." and the all-rights-reserved header with personal-use terms | v31.8 | `e02d5ce` | 2026-04-09 | origin |
| Scholar identity preamble (models engage as thinking minds, refusal is the failure mode) | v32.9 | `a397d7a` | 2026-04-12 | origin |
| Per-slot crew memory (short session memory per model) | v34.9 | `24d2d32` | 2026-04-19 | origin |
| Knowledge-cutoff awareness clause in the red-flag contract (recent dates are not "future dates") | v34.9 | `24d2d32` | 2026-04-19 | origin |
| Paste sanitizer against URL-encoded clipboard content on iOS | v35.3 | `f802227` | 2026-04-23 | origin |
| GAUNTLET N: / ANSWER: pre-commitment format (verdict before argument) and intent inference | v35.6 | `d32d550` | 2026-04-24 | origin |
| Dolphin3 tribunal parity: the local model receives the same five prompt modes as the cloud crew, with divergences logged in source | v35.5–v35.6 | `d32d550` | 2026-04-24 | origin |
| Print Path Provenance: printout as a decision artifact ending in a provenance page with model attribution and disclosure | v36.0–v36.1 | `172a74e` | 2026-04-25 | origin |
| Memory-eviction disclosure and export-transparency notice | v37.0 | `eb2db17` | 2026-04-27 | origin |
| Capability disclosure banner for the local model, "no 7" enforced as a locked prompt contract, honest-time copy ("minutes, not seconds") | v38 | `9395fa6` | 2026-04-29 | origin |
| Stage tabs, focus mode, council-card layout for Sparring and Battle | v40.3–v40.6 | `0d711ed` | 2026-05-13 | origin |
| FILE MAP header (line-range map, doctrine lock, version-site count) | v40.8 | `874cddb` | 2026-05-13 | origin |
| MODEL_CONFIG registry: every model-dependent value is data, no code branches on a model-name substring; roster moves to the GPT-OSS family | v41.2 | `61bc109` | 2026-07-16 | origin |
| Expand-overlay paper mode (scoped light theme for reading) | v41.3 | `13abea8` | 2026-07-16 | origin |
| Two-family rule: the crew must carry two genuinely different model families (slot B moves to Qwen3.6 27B) | v41.5 | `1a7d52d` | 2026-07-23 | origin |
| Public-presentation comment pass; internal docs untracked; FILE MAP points to their external home | v41.6–v41.7 | `fddf085`, `f336155` | 2026-07-30 | origin |
| Slots resolve from Groq's live catalog (`GET /openai/v1/models`): a slot is a family, not an id; preferred id → newest in family → newest from an unused vendor → NULL shown as NO SECOND VOICE; two slots never share an id | v41.8 | [`fb22c27`](https://github.com/LearningProducers/CombatWriting/commit/fb22c2777a288d099ae387e1ee015ac13c9c0ca6) | 2026-09-21 | public |

Model roster history, for the record: v31.8 ran Llama 3.3 70B (slot A) and Qwen3 32B (slot B) with Llama 3.1 8B as a fallback; v41.2 (2026-07-16) moved both slots to OpenAI's GPT-OSS pair after Groq's deprecation notices; v41.5 (2026-07-23) moved slot B to Qwen3.6 27B to restore two families; v41.8 (2026-09-21) removed pinned ids entirely and resolves each slot from the live catalog by family.

## Scoped candidate claims

Working candidate claims, each scoped to a combination and each naming the prior art it is scoped against. None asserts that the underlying primitives (multi-agent debate, LLM-as-judge, single-file web apps, browser local storage, the Ollama HTTP API, model catalogs, the Web Speech API) were invented here. Prior-art dates are given to the month where the day was not verified.

1. **Staged, human-gated, multi-model adversarial critique of a human-written draft, delivered as one dependency-free HTML file** (lineage 2026-04-09, v31.8; public 2026-07-30). Predicate: a browser application in a single HTML file, with no build, server, or dependency, that takes a draft the human wrote, a context brief, and at least two language models from different families; runs named stages in which the models rate the draft on a forced-commitment scale, answer focus questions, read and synthesize each other's answers, and are redirected by the author; gates the final draft with a signal-to-noise verdict and a red-flag check; and records publication and outcomes. Prior art: AI-safety-via-debate (Irving, Christiano, Amodei, 2018-05), Constitutional AI critique-and-revise (Anthropic, 2022-12), Self-Refine (Madaan et al., 2023-03), multi-agent debate (Du et al., 2023-05), LLM-as-a-judge (Zheng et al., 2023-06), peer rank and discussion (PRD, 2023-07), ChatEval's referee team of diverse personas judging generated text (2023-08), ReConcile's round table of different model families (2023-09), panels of judges from disjoint families (PoLL, 2024-04), Mixture-of-Agents (2024-06), Language Model Council (2024-06), llm-council (Karpathy, 2025-11) and the council-style review skills derived from it in early 2026, and writing products with single-model critique (Grammarly, Hemingway, ProWritingAid, Sudowrite). Distinguishing edge: the human-written-only source rule, the stage gating, the two-family requirement, and the single-file delivery in one artifact. **Confidence: medium.**
2. **Family-scoped slot resolution from a provider's live model catalog with a visible null state** (public 2026-09-21, v41.8, commit `fb22c27`). Predicate: a client-side application with no server that pins no model id, reads the provider's model list at key save, at load, and on any 404, treats each crew slot as a model family, resolves it to the family's preferred id if live, else the newest live id in the family, else the newest live id from a vendor no other slot is on, else NULL; never resolves two slots to one id; and, on NULL, shows "NO SECOND VOICE" and refuses fires in one sentence rather than silently substituting. Prior art: client-side model discovery from the provider list (Niek/chatgpt-web, 2023-03), OpenRouter's `auto` alias (2023-11) and ordered model fallbacks, LiteLLM router fallbacks (2023), Vercel AI Gateway model fallbacks (2025-11), Groq's own deprecation schedule as the problem being solved. No prior client-only implementation of family-scoped, cross-vendor fallback was found (unverified negative). Distinguishing edge: family semantics with a cross-vendor diversity constraint, a visible refusal instead of a hidden safety net, and no server in the path. **Confidence: medium.**
3. **Tribunal parity between a cloud crew and a local uncensored 8B model, with an on-screen capability disclosure** (lineage 2026-04-24 for parity, 2026-04-29 for the disclosure; public 2026-07-30). Predicate: the same five critique modes (scholar identity, sparring rating, sparring dialogue, battle dialogue, signal-to-noise, red-flag) built by one shared prompt builder for both the cloud crew and a local Ollama model, with each intentional divergence logged in source, plus a banner that states what the small local model is and is not reliable for and honest latency copy. Prior art: Ollama browser front-ends (ollama-ui 2023-08, hollama 2023-11, Page Assist 2024-02, Open WebUI 2023-10 as a server), model cards (Mitchell et al., 2018), hardware-fit warnings in LM Studio and Jan, developer-facing capability notes for small on-device models. No prior end-user, task-specific capability banner was found (unverified negative). Distinguishing edge: parity as a maintained contract in a critique pipeline, not a chat shell, and the disclosure tied to the pipeline's tasks. **Confidence: medium-low.**
4. **Red-flag contract with firsthand-account protection and knowledge-cutoff awareness** (lineage 2026-04-09 for firsthand protection, 2026-04-19 for the cutoff clause; public 2026-07-30). Predicate: a publication-gate check whose first line is machine-parsable (`NO RED FLAGS` or `RED FLAGS FOUND: X`), that defines a red flag as a factual error or internal contradiction only, that instructs the model never to flag the author's firsthand observations even when unverifiable, and that instructs the model not to flag recent dates as future or fictional on training-cutoff grounds. Prior art: hallucination and factuality checkers (FActScore 2023, CriticGPT 2024-06), LLM-as-judge rubrics, fact-check prompt templates; "Auditing the Synthetic Memoir" (2026-08) is subsequent related work on confabulation in first-person writing. No pre-2026 tool advertising a red-flag check that protects firsthand accounts was found (unverified negative). Distinguishing edge: the firsthand exemption and the cutoff clause as a locked pair. **Confidence: low-medium.**
5. **Forced-commitment rating contract ("no 7") enforced across cloud and local models** (lineage 2026-04-09 in the method, 2026-04-29 as a prompt contract; public 2026-07-30). Predicate: a 1–10 rating with 7 banned, 1–6 reserved for documents with structural problems and 8–10 for documents that work, written into the system prompt of every rating fire rather than left to the user's prompt. Prior art: forced-choice and midpoint-free Likert scales in survey design (decades old), "no fence-sitting" prompt patterns. Distinguishing edge: application to model critique of drafts as an enforced contract. **Confidence: low.**
6. **Per-model session memory with eviction disclosure and export transparency** (lineage 2026-04-19 and 2026-04-27; public 2026-07-30). Predicate: each crew slot keeps a short memory of its last exchanges under a per-model token budget, the interface shows how many exchanges are stored and states that they may be evicted at fire time, and the export surface states what leaves the browser and what does not. Prior art: Reflexion's episodic reflection memory (2023-03), chat-history windows in every chat client, LangChain memory modules (2023), OpenAI "memory" (2024). Distinguishing edge: the disclosure of eviction as an honesty rule. **Confidence: low.**
7. **Session printout as a decision artifact ending in a provenance page** (lineage 2026-04-25, v36.0–v36.1; public 2026-07-30). Predicate: a print or plain-text export that lays out the session in fixed numbered sections from source material through final draft and closes with a provenance page naming which models contributed at which stage, the status of the piece, and a disclosure, without adding any persisted state. Prior art: chat transcript exports, document version histories, AI-use disclosure statements in publishing. Distinguishing edge: fixed-section provenance as part of a writing workflow's output. **Confidence: low-medium.**

The tagline *"Reading is Peace. Writing is War."* and the name *Combat Writing* are dated in code by the same commits (lineage 2026-04-09, public 2026-07-30), in the author's own writing by the blog post of 2025-09-30 (owner-dated), and by a third party in Grok's reply of 2025-10-25T00:50:40Z, which quotes the motto. This record does not assess trademark availability or priority for either.

## Detailed provenance by cluster

### A. Adversarial critique pipeline and prompt contracts

#### Four-stage pipeline — `e02d5ce` · **2026-04-09** · v31.8 (origin) → [`fb4165e`](https://github.com/LearningProducers/CombatWriting/commit/fb4165e88f1cf41f1227417a31484e1fd28c4fdd) · **2026-07-30** (public)
STRATEGY holds the human-written Source Material and the Context Brief. SPARRING runs solo ratings and dialogue rounds with each crew model. BATTLE runs Focus Question, Synthesis Focus Question, Navigation, and Synthesis Navigation rounds in which the crew reads each other's answers, then the Final Draft goes through the signal-to-noise and red-flag checks. CHAMPION records publication, metrics, results, and the insight kept in the vault. The Flowchart tab draws it; the Methodology tab writes it as 19 steps, with an explicit "without AI" variant for human teammates.

- **Scoped claim:** see claim 1. **Confidence: medium.**
- **Prior art:** debate (2018), Constitutional AI (2022), Self-Refine, multi-agent debate, LLM-as-a-judge, PRD, ChatEval, ReConcile (all 2023), PoLL, Mixture-of-Agents, Language Model Council (2024), llm-council (2025), council-review skills (2026-03), editorial peer review and writing-workshop practice.

#### Crew prompt contracts — `e02d5ce` · **2026-04-09** · v31.8, hardened through v38 · **2026-04-29**
A shared set of system-prompt rules for every crew fire: scholar identity (engage, commit to positions, refusal is the failure mode), first-person only with a third-person self-reference ban, direct address to the author, a multi-question protocol (count the question marks, answer in order), a per-question yes/no rule, a ban on self-generated questions, a meta-question rule (answer questions about the model's own context in one sentence), GAUNTLET N: / ANSWER: pre-commitment when the source material contains challenges, an under-300-words limit, and "censorship is noise". Rating fires carry the no-7 contract. Signal-to-noise fires return `S/N RATIO: XX%` on line one with cited signal and noise. Red-flag fires return `NO RED FLAGS` or `RED FLAGS FOUND: X` on line one, with the firsthand exemption and the cutoff clause.

- **Scoped claims:** 4 and 5. **Confidence: low-medium.**
- **Prior art:** persona prompting, LLM-as-judge rubrics, structured-output contracts, FActScore, CriticGPT.

#### Per-slot crew memory — `24d2d32` · **2026-04-19** · v34.9; eviction disclosure `eb2db17` · **2026-04-27** · v37.0
Each slot keeps its last exchanges under its model's token budget. Budget math in source treats the provider's rate limit as input plus reserved output, keeps a safety margin, and drops memory before dropping the draft. Badges show how many exchanges are stored and that they may be evicted at fire time.

- **Scoped claim:** 6. **Confidence: low.**
- **Prior art:** chat context windows, LangChain memory, provider "memory" features.

### B. Runtime, privacy, and model-resolution architecture

#### Single file, user-held key, browser-only state — `e02d5ce` · **2026-04-09** · v31.8
The whole application is one HTML file that runs from GitHub Pages or from disk. The Groq key is stored in local storage, never leaves the browser except to Groq, and is never included in exports. Sessions, the vault, the canon, and five save slots live in local storage and export and import as one JSON document. A DOWNLOAD button fetches the running page and saves it as a versioned file.

- **Scoped claim:** none on its own; this is an established pattern (single-file bring-your-own-key chat pages have existed since 2023). It is a component of claim 1.
- **Prior art:** Niek/chatgpt-web (2023-03, client-only with live model discovery), vanilla-chatgpt (2023-03, one `index.html` with the key in local storage and browser text-to-speech), chatty-gpt (2023-03, no build step), TypingMind and BetterChatGPT (2023-03), html-chat (2026-02, one HTML file across OpenAI, Ollama, and OpenRouter).

#### Offline path through Ollama with capability disclosure — `e02d5ce` · **2026-04-09** · v31.8; disclosure `9395fa6` · **2026-04-29** · v38
The browser calls a local Ollama server directly (the user starts it with `OLLAMA_ORIGINS=*` so the page's origin is allowed) and runs Dolphin3 8B with the same five prompt modes as the cloud crew. A banner states the model is reliable for structural critique, S/N, red flags, and gauntlet decisions, and that factual claims and named entities should be checked elsewhere. Interface copy says responses take minutes, not seconds.

- **Scoped claim:** 3. **Confidence: medium-low.**
- **Prior art:** Ollama's origin allow-list (2023-08) and `OLLAMA_ORIGINS`, ollama-ui (2023-08), hollama (2023-11), Page Assist (2024-02), LocalAIWriter (2026-03), model cards (2018), Dolphin 3.0 (Cognitive Computations, 2025-01).

#### Model registry as data, then live-catalog resolution — `61bc109` · **2026-07-16** · v41.2 (origin) → [`fb22c27`](https://github.com/LearningProducers/CombatWriting/commit/fb22c2777a288d099ae387e1ee015ac13c9c0ca6) · **2026-09-21** · v41.8 (public)
v41.2 moved every model-dependent value into one registry so a roster swap is a row edit and no code branches on a model name. v41.5 added the two-family rule. v41.8 builds the registry from Groq's live catalog: the page reads the model list with the user's key, keeps chat-capable records, persists the set so offline loads still work, and resolves each slot by family with cross-vendor fallback and a visible NULL state. The slot label always names what is actually running; the source calls this the rule against hidden safety nets.

- **Scoped claim:** 2. **Confidence: medium.** This is the one claim whose feature commit is publicly resolvable today.
- **Prior art:** OpenRouter fallbacks and routing, LiteLLM router, Vercel AI SDK, provider "auto" aliases, feature-flag registries.

### C. Authoring and record surfaces

#### Insight Vault and Canon — `e02d5ce` · **2026-04-09** · v31.8
The vault keeps what was learned per session; the canon keeps what was published. Both live in local storage and export with the session.

- **Scoped claim:** none. Established pattern (notes and archive tabs).

#### Print Path Provenance — `172a74e` · **2026-04-25** · v36.1
Print and plain-text export rebuilt as a decision artifact: cover, contents, Source Material, Context Brief, Sparring with model attribution and ratings, Human Processing, Battle by zone, Champion, Final Draft, then a Provenance page with the contributor lineup per stage and a disclosure. Empty sections skip but do not renumber, so gaps are visible. The printer reads live state and persists nothing.

- **Scoped claim:** 7. **Confidence: low-medium.**
- **Prior art:** transcript exports, version histories, AI-disclosure statements.

#### Read-aloud proofreading, paste sanitizer, paper mode — `e02d5ce` · **2026-04-09** (read-aloud); `f802227` · **2026-04-23** (paste sanitizer); `13abea8` · **2026-07-16** (paper mode)
Fields and crew responses can be read aloud through the Web Speech API after text cleaning for speech. A paste handler reconciles URL-encoded clipboard content that iOS Safari lands in text areas, with the hypothesis-and-falsification history kept in source comments. The expand overlay has a paper-white reading theme.

- **Scoped claim:** none. Read-aloud proofreading exists in Word, Grammarly, and browsers; paste handling is defensive engineering.

### D. Methodology and ship doctrine

#### The 19-step methodology — `e02d5ce` · **2026-04-09** · v31.8; Step 7 wording fixed `5eb1b6d` · **2026-07-20** · v41.4
Written into the application as its Methodology tab: choose a project with stakes, write the source material yourself, brief the crew on who you are and what is at stake, cold-read with at least three models rating 1–10 without 7, process each model's read separately, discuss with humans where the topic is human, revise on patterns, take sensitive topics to human collaborators or an offline uncensored model, inject a focus question, run synthesis rounds in which models read each other, navigate, iterate, ask for the signal-to-noise ratio and any red flags, publish, measure, acknowledge results, keep the insight. The tab presents the same steps "without AI".

- **Scoped claim:** the method is recorded here for date, not claimed as novel; workshop critique, peer review, and red-teaming are its ancestors. The boxing framing ("title fight" versus "exhibition fight", "fight camp", "pull punches or go for the KO") dates to the same commit.

#### Ship doctrine in the FILE MAP — `874cddb` · **2026-05-13** · v40.8; doctrine lock as published `fddf085` · **2026-07-30** · v41.6
The file header carries a line-range map, an ORIGIN note, and a doctrine lock: parser check before push, bump all nine version-string sites per ship, mobile review for mobile changes, CSS-only ships green-lit, DOM moves need explicit scope, and a pointer to the external QA runbook's 83 doctrines, 33 regression entries, and gauntlet ship gate.

- **Scoped claim:** none. Engineering practice, recorded for date.

## Scoped candidate claims — shortlist

Ordered by lineage date. "Public" is the first date an unauthenticated reader can verify the feature in source.

| Lineage date | Public date | Feature | Scoped claim | Conf. |
|---|---|---|---|---|
| 2026-04-09 | 2026-07-30 | Four-stage pipeline (`e02d5ce` → [`fb4165e`](https://github.com/LearningProducers/CombatWriting/commit/fb4165e88f1cf41f1227417a31484e1fd28c4fdd)) | Staged, human-gated, multi-model adversarial critique of a human-written draft in one dependency-free HTML file, with two model families, a forced-commitment rating, synthesis rounds, and S/N and red-flag gates before a publication record. | medium |
| 2026-04-09 / 2026-04-19 | 2026-07-30 | Red-flag contract (`e02d5ce`, `24d2d32`) | Machine-parsable red-flag gate that exempts the author's firsthand accounts and refuses to flag post-cutoff dates on cutoff grounds. | low-medium |
| 2026-04-09 / 2026-04-29 | 2026-07-30 | No-7 rating contract (`e02d5ce`, `9395fa6`) | Midpoint-banned 1–10 rating enforced in the system prompt of every rating fire across cloud and local models. | low |
| 2026-04-19 / 2026-04-27 | 2026-07-30 | Crew memory with eviction disclosure (`24d2d32`, `eb2db17`) | Per-model session memory under a per-model budget with on-screen eviction disclosure and export transparency. | low |
| 2026-04-24 / 2026-04-29 | 2026-07-30 | Tribunal parity and capability disclosure (`d32d550`, `9395fa6`) | Same five critique modes for a cloud crew and a local 8B model from one prompt builder, with a task-specific capability disclosure for the local model. | medium-low |
| 2026-04-25 | 2026-07-30 | Print Path Provenance (`172a74e`) | Session printout as a fixed-section decision artifact ending in a provenance page with per-stage model attribution and disclosure. | low-medium |
| 2026-09-21 | 2026-09-21 | Live-catalog slot resolution ([`fb22c27`](https://github.com/LearningProducers/CombatWriting/commit/fb22c2777a288d099ae387e1ee015ac13c9c0ca6)) | Client-side, server-free, family-scoped slot resolution from the provider's live catalog with cross-vendor fallback, a no-duplicate rule, and a visible NULL state instead of a hidden substitution. | medium |

## Version lineage

First commit carrying each `APP_VERSION` string, with the SHA-256 of `index.html` at that commit. Anyone holding a copy of a given version's file can hash it and match it to this table; origin-repository hashes become resolvable if that repository is published.

| App version | First commit | Date | Repo | index.html bytes | SHA-256 of index.html |
|---|---|---|---|---|---|
| v31.8 | `e02d5ce` | 2026-04-09 | archive | 209,324 | `0b1f31e1760c4b01b0c9a1ed5e2a5fec2c2d8b4a6805b1b0e2334c2a5563d989` |
| v31.9 | `65be896` | 2026-04-09 | archive | 209,746 | `512106654cd029e8c2890aa57a031e581349224e27e4d1585d514f8e3a57dbcb` |
| v32.1 | `31c77ad` | 2026-04-09 | archive | 211,783 | `276be8600eb5b2e214642722c82d4e4db637458a4bab83eebabf79cc7bca083f` |
| v32.2 | `dd2fcc0` | 2026-04-09 | archive | 211,947 | `2c2e56ad6d4dc99d0422e84af5f1ba585af0ad01d05e94b42d685e01560b3f7e` |
| v32.7 | `bc586bd` | 2026-04-10 | archive | 214,225 | `6cd24825aeda0436ed38b0c7b98425d3695ef83069be11b6824dc41afa196fc8` |
| v32.8 | `4663722` | 2026-04-11 | archive | 214,357 | `e5cc42a82a481e3204385a7b60b12c04dc20f4b06b9752c739a28f10b50505fa` |
| v32.9 | `a397d7a` | 2026-04-12 | archive | 215,180 | `7a3014a7bbfeaf81cc25ae9998bca224790066b234745be39ea0c7a7e2e7826d` |
| v33 | `8c06e55` | 2026-04-13 | archive | 215,917 | `05b2e79666940cbb40f232918fcbd884b1120f7286ee07d9b88e3e7febc408c2` |
| v33.1 | `16004e8` | 2026-04-14 | archive | 216,755 | `dfbda58bbc7922c974c5f761566ea07d504e80ed704cec99c16efc73f55da186` |
| v33.2 | `f9b6e82` | 2026-04-16 | archive | 222,022 | `abe44f8c65e039ede7846eee410438d8f50a936ce4def9ebdfe28f1e4d80674f` |
| v34.9 | `24d2d32` | 2026-04-19 | archive | 252,146 | `3b161594ac96222a24b718fb6c81e58568cd1644ec47813d3c1e9e9b5f115b20` |
| v34.10 | `1bcf7cd` | 2026-04-20 | archive | 253,032 | `6508c929208cb4e59594d57bef485ead6f2a43806a01e6ed5e194096c7d67b1d` |
| v35.0 | `50e0500` | 2026-04-20 | archive | 254,455 | `7130592c3cc0895181971ccefc499f410d4a38b1c00a187721c5132fbca25bb1` |
| v35.1 | `f1c84e8` | 2026-04-23 | archive | 256,483 | `c85b8a719d5cc97d0f634494f70a558b3645242e133c5a9d14a3ab0d44dc97ca` |
| v35.2 | `055bfde` | 2026-04-23 | archive | 259,457 | `bc8fe0ec190ee0b77b981c1b9665c2a742b88c0a99e82eb8361ec0e6c69020ed` |
| v35.3 | `f802227` | 2026-04-23 | archive | 262,226 | `7214f78ddc1b9a60d9b41b28ea76260dfd8ff42ee02ee5e8e974cffe29445c4d` |
| v35.4 | `8682282` | 2026-04-24 | archive | 266,202 | `f51eab4e8663c86103a6058c6f46c374ab592307f6f0083974dc0b0c3ab7996c` |
| v35.6 | `d32d550` | 2026-04-24 | archive | 281,923 | `53acd084640b73f0a1e28e2d6450d1af1fb12f2a9dbf4284fef40ff86f3eac88` |
| v36.1 | `172a74e` | 2026-04-25 | archive | 306,120 | `e3e2671894e683af075e6982c37ececc763add3dc133ca8c0a4ec5d78c7efc45` |
| v37.0 | `eb2db17` | 2026-04-27 | archive | 324,398 | `866f836c4cafd369d80e97c1e3bdd65d25a63d07ce57853fed561e820bca484a` |
| v37.1 | `3c61be1` | 2026-04-27 | archive | 326,130 | `a3d2346b4ddf219edfac98db01076cbf049b971365239ed4148ce0a03409a00f` |
| v37.2 | `6fdddd1` | 2026-04-27 | archive | 331,503 | `9b7018ce7a9b1784e3ef04d3d311877847ba6f6c132732f2ae75ffbf08ef4a57` |
| v37.4.1 | `71325fe` | 2026-04-28 | archive | 332,450 | `08ab95e30c50674e0bc992c39ee8bbc3dea0eeaf14031f278997eed5106c7ba5` |
| v38 | `9395fa6` | 2026-04-29 | archive | 335,619 | `e17c2035f343f07feacb9faaceb1c83d08388f59e34fa03aecd294ea6f8ae8ad` |
| v40.1 | `4b8bdd1` | 2026-05-07 | archive | 343,464 | `b5603c6c26c35d41e2b6a517c2559a3d7850d0f2c8b70cc45a258179b0d98afb` |
| v40.2 | `d8d5bb1` | 2026-05-07 | archive | 344,328 | `8cf0e164527cb711f9fce89cb3ac086a2de046eb536c1719106a9fdccf5d9d54` |
| v40.6 | `0d711ed` | 2026-05-13 | archive | 369,772 | `e3e92520f66e42a66c547492b8300e283346c1bfad73e7aba9789f7754dbb21e` |
| v40.7 | `dacaec5` | 2026-05-13 | archive | 369,759 | `d26c1f2c47531473a75b15d175191cab6cb6877ad01703c68e7f045f4e794a2b` |
| v40.8 | `874cddb` | 2026-05-13 | archive | 378,154 | `84499643b85e13b5957f709fca264343eefb5975163d12f7ac99a3339fb4d06e` |
| v40.9 | `4d9775b` | 2026-05-14 | archive | 378,649 | `97f7c2498cf8964978cc0f39ce4c4dffd737a6b7a8c744f15f7e0a0293e0bf0b` |
| v41.0 | `4766d05` | 2026-05-14 | archive | 382,689 | `ca333c30e283ac75b835b663e4f6146d42a9c508b1e5b19cb9d72a1c10a073a7` |
| v41.1 | `c66958d` | 2026-05-14 | archive | 383,968 | `5e8bd42991f93923dff029db96b78f33c4f0daf6a3eeb78bf2e78be23d3fe831` |
| v41.2 | `61bc109` | 2026-07-16 | archive | 377,669 | `2f8a3e2fda78c913fb7dce40dd440995f9e8814af8fe1a3f0b9cff4ae97c5f42` |
| v41.3 | `13abea8` | 2026-07-16 | archive | 384,077 | `a67843485e25bb5b73ac86f01a8c0b017d0f5235a08d5089d05c0f859ee42c4d` |
| v41.4 | `5eb1b6d` | 2026-07-20 | archive | 384,076 | `f585b8c33a7fe2ae713ae37a46a303c78edeba4c1e113730cb62f26d891a97db` |
| v41.5 | `1a7d52d` | 2026-07-23 | archive | 386,185 | `7e49c7d68cd20f8e332f978ce4179f3f2eb72ebe1e6a5d0bb745f7d3dffac50f` |
| v41.6 | `fddf085` | 2026-07-30 | archive | 386,215 | `044c5a9b08764dc8eeb1080e17ea6181f3f3fe0a52ee0c79195d1ecd6d5793a3` |
| v41.7 | `f336155` | 2026-07-30 | archive | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` |
| v41.8 | [`fb22c27`](https://github.com/LearningProducers/CombatWriting/commit/fb22c2777a288d099ae387e1ee015ac13c9c0ca6) | 2026-09-21 | public | 396,448 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` |

## Commit lineage — public repository

All rows resolve for an unauthenticated reader. "GitHub web-flow (signed)" means the commit was created through GitHub's interface and its committer timestamp was set by GitHub.

| # | Date (author, -05:00) | Commit | App version | index.html bytes | SHA-256 of index.html | Committer | First-line message |
|---|---|---|---|---|---|---|---|
| 1 | 2026-07-30 | [`fb4165e`](https://github.com/LearningProducers/CombatWriting/commit/fb4165e88f1cf41f1227417a31484e1fd28c4fdd) | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | local | Combat Writing v41.7 - public source |
| 2 | 2026-07-30 | [`895623e`](https://github.com/LearningProducers/CombatWriting/commit/895623e51c7857273130bc7e15c0abfe4ac6474e) | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | GitHub web-flow (signed) | Update README.md |
| 3 | 2026-07-30 | [`c5c98cb`](https://github.com/LearningProducers/CombatWriting/commit/c5c98cb0a2b439ac339320785e15416d4a121f4d) | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | GitHub web-flow (signed) | Update README.md |
| 4 | 2026-08-05 | [`ff95b4a`](https://github.com/LearningProducers/CombatWriting/commit/ff95b4a9e7ffb77d0407e3608c6915b792208c49) | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | local | STEP 4.5 field-relay launcher: /gmail.html reads to/subject/body from the hash fragment (never the query string, never s |
| 5 | 2026-08-05 | [`edd20f1`](https://github.com/LearningProducers/CombatWriting/commit/edd20f18fcb16ce0776b6251765647121f8d6475) | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | GitHub web-flow (signed) | Merge pull request #1 from LearningProducers/claude/gmail-launcher |
| 6 | 2026-09-21 | [`fb22c27`](https://github.com/LearningProducers/CombatWriting/commit/fb22c2777a288d099ae387e1ee015ac13c9c0ca6) | v41.8 | 396,448 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` | local | v41.8: council slots resolve from Groq's live catalog |
| 7 | 2026-09-21 | [`7136757`](https://github.com/LearningProducers/CombatWriting/commit/71367571c83d51fdb69f0d85bd3a152b85723755) | v41.8 | 396,448 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` | GitHub web-flow (signed) | Merge pull request #2 from LearningProducers/claude/cw-v41.8-catalog-slots |
| 8 | 2026-09-22 | [`c17444a`](https://github.com/LearningProducers/CombatWriting/commit/c17444a3487d6ab11503102133e2583426337728) | v41.8 | 396,448 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` | local | README describes v41.8: what it is, what it does, how to run it, what changed |
| 9 | 2026-09-22 | [`be2de4c`](https://github.com/LearningProducers/CombatWriting/commit/be2de4cc90a34880847bb9ac6080aea0e0adedb7) | v41.8 | 396,448 | `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294` | GitHub web-flow (signed) | Merge pull request #3 from LearningProducers/claude/readme-20260922 |

## Commit lineage — origin repository (private as of the record date)

Preserved as a labeled lineage snapshot. Hashes do not resolve for an unauthenticated reader until the repository is published. Three internal working documents tracked between rows 45 and 66 are named in the "Repository provenance" section and are not described further.

| # | Date (author, -05:00) | Commit | App version | index.html bytes | SHA-256 of index.html | Committer | First-line message |
|---|---|---|---|---|---|---|---|
| 1 | 2026-04-09 | `e02d5ce` | v31.8 | 209,324 | `0b1f31e1760c4b01b0c9a1ed5e2a5fec2c2d8b4a6805b1b0e2334c2a5563d989` | GitHub web-flow (signed) | buttons |
| 2 | 2026-04-09 | `65be896` | v31.9 | 209,746 | `512106654cd029e8c2890aa57a031e581349224e27e4d1585d514f8e3a57dbcb` | GitHub web-flow (signed) | Add files via upload |
| 3 | 2026-04-09 | `a9e8295` | v31.9 | 210,774 | `ce2c70c5bf56cf8be3bfd093ef8379fe71175d2173b0ffea40ca9e03358164c8` | GitHub web-flow (signed) | refining LLM awareness |
| 4 | 2026-04-09 | `5e3ffaa` | v31.9 | 211,717 | `d706e7d3f080f3da3db9584993801a82cba9ad8d23a42bbc59627110f502d368` | GitHub web-flow (signed) | prompt engineering |
| 5 | 2026-04-09 | `31c77ad` | v32.1 | 211,783 | `276be8600eb5b2e214642722c82d4e4db637458a4bab83eebabf79cc7bca083f` | GitHub web-flow (signed) | Llama fix |
| 6 | 2026-04-09 | `dd2fcc0` | v32.2 | 211,947 | `2c2e56ad6d4dc99d0422e84af5f1ba585af0ad01d05e94b42d685e01560b3f7e` | GitHub web-flow (signed) | Groq crew alignment |
| 7 | 2026-04-10 | `bc586bd` | v32.7 | 214,225 | `6cd24825aeda0436ed38b0c7b98425d3695ef83069be11b6824dc41afa196fc8` | GitHub web-flow (signed) | v32.7 |
| 8 | 2026-04-11 | `4663722` | v32.8 | 214,357 | `e5cc42a82a481e3204385a7b60b12c04dc20f4b06b9752c739a28f10b50505fa` | GitHub web-flow (signed) | helper text |
| 9 | 2026-04-11 | `a65e474` | v32.8 | 213,997 | `8bd78631d2ea518b377210bdda00144398a850391d987e791bb0d79fbba3902e` | GitHub web-flow (signed) | v32.8 |
| 10 | 2026-04-12 | `a397d7a` | v32.9 | 215,180 | `7a3014a7bbfeaf81cc25ae9998bca224790066b234745be39ea0c7a7e2e7826d` | GitHub web-flow (signed) | 32.9 |
| 11 | 2026-04-12 | `3b89e8a` | v32.9 | 215,491 | `cf4b492d8764560cbda88b291259272b2a9a1ad173d85039e115b7ea4890a1fe` | GitHub web-flow (signed) | References |
| 12 | 2026-04-13 | `8c06e55` | v33 | 215,917 | `05b2e79666940cbb40f232918fcbd884b1120f7286ee07d9b88e3e7febc408c2` | GitHub web-flow (signed) | button sequence |
| 13 | 2026-04-14 | `16004e8` | v33.1 | 216,755 | `dfbda58bbc7922c974c5f761566ea07d504e80ed704cec99c16efc73f55da186` | GitHub web-flow (signed) | Copy prompts |
| 14 | 2026-04-16 | `f9b6e82` | v33.2 | 222,022 | `abe44f8c65e039ede7846eee410438d8f50a936ce4def9ebdfe28f1e4d80674f` | GitHub web-flow (signed) | v33.2 |
| 15 | 2026-04-19 | `24d2d32` | v34.9 | 252,146 | `3b161594ac96222a24b718fb6c81e58568cd1644ec47813d3c1e9e9b5f115b20` | GitHub web-flow (signed) | [Memory]v34.9 |
| 16 | 2026-04-20 | `1bcf7cd` | v34.10 | 253,032 | `6508c929208cb4e59594d57bef485ead6f2a43806a01e6ed5e194096c7d67b1d` | GitHub web-flow (signed) | v34.10 |
| 17 | 2026-04-20 | `8d54ce4` | v34.10 | 253,481 | `764e467ec2fcec45c4e06bbe096a9a2b4b45b4dab433a61b97a0fcd3ed96fba1` | GitHub web-flow (signed) | mobile adjustments |
| 18 | 2026-04-20 | `50e0500` | v35.0 | 254,455 | `7130592c3cc0895181971ccefc499f410d4a38b1c00a187721c5132fbca25bb1` | GitHub web-flow (signed) | v35 |
| 19 | 2026-04-23 | `f1c84e8` | v35.1 | 256,483 | `c85b8a719d5cc97d0f634494f70a558b3645242e133c5a9d14a3ab0d44dc97ca` | GitHub web-flow (signed) | v35.1 |
| 20 | 2026-04-23 | `055bfde` | v35.2 | 259,457 | `bc8fe0ec190ee0b77b981c1b9665c2a742b88c0a99e82eb8361ec0e6c69020ed` | GitHub web-flow (signed) | v35.2 |
| 21 | 2026-04-23 | `f802227` | v35.3 | 262,226 | `7214f78ddc1b9a60d9b41b28ea76260dfd8ff42ee02ee5e8e974cffe29445c4d` | GitHub web-flow (signed) | v35.3 |
| 22 | 2026-04-24 | `8682282` | v35.4 | 266,202 | `f51eab4e8663c86103a6058c6f46c374ab592307f6f0083974dc0b0c3ab7996c` | GitHub web-flow (signed) | copy+paste corrections |
| 23 | 2026-04-24 | `d32d550` | v35.6 | 281,923 | `53acd084640b73f0a1e28e2d6450d1af1fb12f2a9dbf4284fef40ff86f3eac88` | GitHub web-flow (signed) | v35.6 |
| 24 | 2026-04-25 | `172a74e` | v36.1 | 306,120 | `e3e2671894e683af075e6982c37ececc763add3dc133ca8c0a4ec5d78c7efc45` | GitHub web-flow (signed) | Print Summaries Upgrade |
| 25 | 2026-04-27 | `eb2db17` | v37.0 | 324,398 | `866f836c4cafd369d80e97c1e3bdd65d25a63d07ce57853fed561e820bca484a` | GitHub web-flow (signed) | v37 |
| 26 | 2026-04-27 | `3c61be1` | v37.1 | 326,130 | `a3d2346b4ddf219edfac98db01076cbf049b971365239ed4148ce0a03409a00f` | GitHub web-flow (signed) | v37.1 |
| 27 | 2026-04-27 | `6fdddd1` | v37.2 | 331,503 | `9b7018ce7a9b1784e3ef04d3d311877847ba6f6c132732f2ae75ffbf08ef4a57` | GitHub web-flow (signed) | v37.2 |
| 28 | 2026-04-27 | `f94d56d` | v37.2 | 331,396 | `fb551d36de1c7573c1858355c6e67a12a075ebe02c8bae01aed4cba4a2f138dc` | GitHub web-flow (signed) | dolphin3 updates |
| 29 | 2026-04-27 | `dcf7fe4` | v37.2 | 334,494 | `f625b9251551ace612bab47f5239c87b25a8f9bc386d6329e21961db21152db5` | GitHub web-flow (signed) | ollama update |
| 30 | 2026-04-28 | `71325fe` | v37.4.1 | 332,450 | `08ab95e30c50674e0bc992c39ee8bbc3dea0eeaf14031f278997eed5106c7ba5` | GitHub web-flow (signed) | fixed offline bug |
| 31 | 2026-04-29 | `9395fa6` | v38 | 335,619 | `e17c2035f343f07feacb9faaceb1c83d08388f59e34fa03aecd294ea6f8ae8ad` | GitHub web-flow (signed) | v38 |
| 32 | 2026-05-07 | `4b8bdd1` | v40.1 | 343,464 | `b5603c6c26c35d41e2b6a517c2559a3d7850d0f2c8b70cc45a258179b0d98afb` | GitHub web-flow (signed) | v40.1 |
| 33 | 2026-05-07 | `d8d5bb1` | v40.2 | 344,328 | `8cf0e164527cb711f9fce89cb3ac086a2de046eb536c1719106a9fdccf5d9d54` | GitHub web-flow (signed) | v40.2 |
| 34 | 2026-05-07 | `145ff70` | v40.2 | 344,328 | `8cf0e164527cb711f9fce89cb3ac086a2de046eb536c1719106a9fdccf5d9d54` | GitHub web-flow (signed) | Update README.md |
| 35 | 2026-05-07 | `f857025` | v40.2 | 344,328 | `8cf0e164527cb711f9fce89cb3ac086a2de046eb536c1719106a9fdccf5d9d54` | GitHub web-flow (signed) | Update README.md |
| 36 | 2026-05-13 | `0d711ed` | v40.6 | 369,772 | `e3e92520f66e42a66c547492b8300e283346c1bfad73e7aba9789f7754dbb21e` | GitHub web-flow (signed) | 40.6 |
| 37 | 2026-05-13 | `dacaec5` | v40.7 | 369,759 | `d26c1f2c47531473a75b15d175191cab6cb6877ad01703c68e7f045f4e794a2b` | GitHub web-flow (signed) | v40.7 |
| 38 | 2026-05-13 | `874cddb` | v40.8 | 378,154 | `84499643b85e13b5957f709fca264343eefb5975163d12f7ac99a3339fb4d06e` | GitHub web-flow (signed) | v40.8 |
| 39 | 2026-05-13 | `ff2edc8` | v40.8 | 377,995 | `0a8ef90a30497f0cf2174d15fe521d7e882f9422e90df9bef6950b3beda42e2d` | GitHub web-flow (signed) | Infra changes |
| 40 | 2026-05-14 | `4d9775b` | v40.9 | 378,649 | `97f7c2498cf8964978cc0f39ce4c4dffd737a6b7a8c744f15f7e0a0293e0bf0b` | GitHub web-flow (signed) | v40.9 |
| 41 | 2026-05-14 | `4766d05` | v41.0 | 382,689 | `ca333c30e283ac75b835b663e4f6146d42a9c508b1e5b19cb9d72a1c10a073a7` | GitHub web-flow (signed) | Magnification of groq crew (v41.0) |
| 42 | 2026-05-14 | `c66958d` | v41.1 | 383,968 | `5e8bd42991f93923dff029db96b78f33c4f0daf6a3eeb78bf2e78be23d3fe831` | GitHub web-flow (signed) | v41.1 |
| 43 | 2026-07-16 | `61bc109` | v41.2 | 377,669 | `2f8a3e2fda78c913fb7dce40dd440995f9e8814af8fe1a3f0b9cff4ae97c5f42` | local | v41.2 — Groq roster swap: gpt-oss crew, per-model config registry |
| 44 | 2026-07-16 | `b86a8fb` | v41.2 | 381,325 | `8f41145bcbf80217fc75174b1c50a55bccb11a915b40510bac589d22058abff3` | local | v41.2 — port infrabot's two-constraint budget + pre-413 gate |
| 45 | 2026-07-16 | `9d56e12` | v41.1 | 383,968 | `5e8bd42991f93923dff029db96b78f33c4f0daf6a3eeb78bf2e78be23d3fe831` | local | Repo law: add CLAUDE.md (identity, doc pointers, never-stale law, debt) |
| 46 | 2026-07-16 | `d1ea614` | v41.2 | 381,921 | `461983d4c9518f5dbe4be2150bd636566c939596e4a8e3e54e0f4594335004c0` | local | v41.2 — CW_QA_RUNBOOK founding cut (R20) + pointer fix + provenance ruled |
| 47 | 2026-07-16 | `6407e09` | v41.2 | 382,091 | `a7151954346f0b704160cedbf36ed0e53d3ad2586658c503f368657e2b5c7004` | local | v41.2 — integrate the recovered v41.1 baseline as the runbook body |
| 48 | 2026-07-16 | `c5cd9d1` | v41.1 | 383,968 | `5e8bd42991f93923dff029db96b78f33c4f0daf6a3eeb78bf2e78be23d3fe831` | local | Repo law: reconcile with the 2026-07-16 rulings + doctrine 83 |
| 49 | 2026-07-16 | `15f7cc7` | v41.2 | 382,091 | `a7151954346f0b704160cedbf36ed0e53d3ad2586658c503f368657e2b5c7004` | local | v41.2 — record the ship gate: founder verdict PASS, outputs in PR #1 |
| 50 | 2026-07-16 | `fdf9b93` | v41.2 | 382,091 | `a7151954346f0b704160cedbf36ed0e53d3ad2586658c503f368657e2b5c7004` | local | v41.2 — doctrine 82 revised: the gate as actually run. Ship gate 4/4. |
| 51 | 2026-07-16 | `5b78509` | v41.2 | 382,091 | `a7151954346f0b704160cedbf36ed0e53d3ad2586658c503f368657e2b5c7004` | GitHub web-flow (signed) | Merge pull request #1 from LearningProducers/groq-roster-gpt-oss-v41.2 |
| 52 | 2026-07-16 | `1d85313` | v41.2 | 382,091 | `a7151954346f0b704160cedbf36ed0e53d3ad2586658c503f368657e2b5c7004` | GitHub web-flow (signed) | Merge pull request #2 from LearningProducers/claude/repo-law-claude-md-20260716 |
| 53 | 2026-07-16 | `13abea8` | v41.3 | 384,077 | `a67843485e25bb5b73ac86f01a8c0b017d0f5235a08d5089d05c0f859ee42c4d` | local | v41.3 — expand-overlay paper mode; scoped light theme + R21 |
| 54 | 2026-07-16 | `b93a146` | v41.3 | 384,077 | `a67843485e25bb5b73ac86f01a8c0b017d0f5235a08d5089d05c0f859ee42c4d` | GitHub web-flow (signed) | Merge pull request #3 from LearningProducers/claude/overlay-paper-mode-20260716 |
| 55 | 2026-07-17 | `e6b035e` | v41.3 | 384,077 | `a67843485e25bb5b73ac86f01a8c0b017d0f5235a08d5089d05c0f859ee42c4d` | local | fix(gitignore): drop trailing slash so the .claude fence symlink is ignored (slash patterns match directories only) |
| 56 | 2026-07-20 | `5eb1b6d` | v41.4 | 384,076 | `f585b8c33a7fe2ae713ae37a46a303c78edeba4c1e113730cb62f26d891a97db` | local | v41.4: fix methodology Step 7 to name Dolphin3, not Llama 3 |
| 57 | 2026-07-20 | `1b4f226` | v41.4 | 384,076 | `f585b8c33a7fe2ae713ae37a46a303c78edeba4c1e113730cb62f26d891a97db` | GitHub web-flow (signed) | Merge pull request #4 from LearningProducers/claude/step7-dolphin3-copyfix-20260720 |
| 58 | 2026-07-23 | `b4254e4` | v41.4 | 384,076 | `f585b8c33a7fe2ae713ae37a46a303c78edeba4c1e113730cb62f26d891a97db` | local | handoff: session start scaffold for slot B qwen swap |
| 59 | 2026-07-23 | `760d588` | v41.4 | 384,076 | `f585b8c33a7fe2ae713ae37a46a303c78edeba4c1e113730cb62f26d891a97db` | local | handoff: runbook read complete + full pre-code verification report |
| 60 | 2026-07-23 | `1a7d52d` | v41.5 | 386,185 | `7e49c7d68cd20f8e332f978ce4179f3f2eb72ebe1e6a5d0bb745f7d3dffac50f` | local | v41.5: council slot B swap, gpt-oss-20b out, qwen/qwen3.6-27b in (registry row edit, doctrine 79) |
| 61 | 2026-07-23 | `fa5dd72` | v41.5 | 386,185 | `7e49c7d68cd20f8e332f978ce4179f3f2eb72ebe1e6a5d0bb745f7d3dffac50f` | local | runbook v41.5: Entry 37 (slot B qwen swap), LOCKED COUNTS row, closing block; handoff updated |
| 62 | 2026-07-23 | `ef92831` | v41.5 | 386,185 | `7e49c7d68cd20f8e332f978ce4179f3f2eb72ebe1e6a5d0bb745f7d3dffac50f` | local | handoff: draft PR #5 opened for founder gauntlet run |
| 63 | 2026-07-23 | `478f734` | v41.5 | 386,185 | `7e49c7d68cd20f8e332f978ce4179f3f2eb72ebe1e6a5d0bb745f7d3dffac50f` | GitHub web-flow (signed) | Merge pull request #5 from LearningProducers/cw-slotB-qwen-2026-07-23 |
| 64 | 2026-07-30 | `fddf085` | v41.6 | 386,215 | `044c5a9b08764dc8eeb1080e17ea6181f3f3fe0a52ee0c79195d1ecd6d5793a3` | local | v41.6: public presentation, comment text only, zero behavior |
| 65 | 2026-07-30 | `d89466b` | v41.6 | 386,215 | `044c5a9b08764dc8eeb1080e17ea6181f3f3fe0a52ee0c79195d1ecd6d5793a3` | GitHub web-flow (signed) | Merge pull request #6 from LearningProducers/claude/cw-v41.6-public-presentation |
| 66 | 2026-07-30 | `f336155` | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | local | v41.7: untrack internal docs, FILE MAP pointers to lpi-ops home |
| 67 | 2026-07-30 | `43825cf` | v41.7 | 386,215 | `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07` | GitHub web-flow (signed) | Merge pull request #7 from LearningProducers/claude/cw-v41.7-untrack-pointers |

## How to verify this record

1. **Public repository, any reader.** Clone [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting) and run `git show fb4165e88f1cf41f1227417a31484e1fd28c4fdd:index.html | sha256sum`. The result must be `51a301d68b7a7a9f1f66191514fb8986cb1a5b6a5200c3a8a52c3b17549a6e07`. Run the same against `fb22c2777a288d099ae387e1ee015ac13c9c0ca6` for v41.8 and expect `76fded82380873c1ea1d2d94ff92f1501c725052c0d0a6632b7b404fa3c8b294`. GitHub's API returns `created_at` for the repository and `created_at` and `merged_at` for its pull requests without authentication.
2. **Any downloaded copy of the app.** Hash the file and look it up in the version lineage table. A match ties that copy to a dated commit.
3. **Origin repository, authenticated reader.** With read access, `git log --format='%h %ad %cn %G?' --date=iso-strict main` reproduces the lineage table's dates, the `GitHub` committer on the 49 server-side rows, and an `E` (signature present, GitHub's key) on the same rows. GitHub's API returns the seven pull requests and the one tag with server timestamps.
4. **Feature at version.** For any row of the feature-genesis table, `git show <commit>:index.html` and search for the quoted string. The first-appearance dates in that table were produced by scanning every commit's `index.html` for the strings listed there.

## Strengthening the record

Ordered by how much public verifiability each step adds. None has been done as of the record date unless stated.

1. **Publish the origin history.** Make `CombatWriting-archive` public, or push its full history as a read-only mirror, or graft it beneath the public root so `fb4165e` has 67 ancestors. Every hash in this record then resolves for a stranger, and the public-appearance cutoff for the April–July features moves from 2026-07-30 to the day of publication. Nothing sensitive remains in that history's tracked files at head, but three internal documents were tracked between 2026-07-16 and 2026-07-30 and would become readable at those commits; review them, or publish a history that starts at v41.1 (`c66958d`, 2026-05-14) and cite the untracked files' hashes separately.
2. **Archive the site and both repositories with third parties.** Request Wayback Machine captures of combatwriting.learningproducers.com, of the two blog posts, of the three X posts of 2025-10-25, of the 2026-01-14 Medium post, and of the repository pages, and submit the public repository to Software Heritage's "Save Code Now", which returns a content-derived SWHID (ISO/IEC 18670:2025). The Wayback Machine's own history of the site could not be retrieved from the environment that built this record; if captures from April 2026 exist, they are the strongest public evidence for the v31–v41.1 era and should be cited here. Capturing the X thread matters most: it is the only third-party-dated item before the public repository, and it survives only while the posts do.
3. **Cut releases on the public repository.** A GitHub release per shipped version attaches a server timestamp and an immutable tarball to each version string; a Zenodo deposit per release adds a DOI. The public repository has no releases or tags as of the record date.
4. **Sign commits from the author's machine.** The 18 origin commits and 4 public commits made from a local CLI are unsigned. Signed commits do not fix the clock problem, but they bind the commits to a key the organization controls.
5. **Timestamp the hash manifest.** The SHA-256 column of the version lineage table can be anchored with OpenTimestamps at no cost, giving a proof-of-existence date for the manifest independent of GitHub.
6. **Keep this document current.** Add a row per shipped version with its hash; a claim is only as good as its most recent verifiable commit.

## Honest scope notes

- **The root is not the origin.** The earliest commit already carries v31.8 with the full feature set. Thirty-one major versions precede it and are not evidenced by any repository. The lineage date 2026-04-09 is an upper bound on when those features existed.
- **The step count at the root commit was re-measured.** The Methodology tab holds 19 steps at `e02d5ce` (v31.8): on 2026-10-03 the `index.html` at that commit was read from the origin repository and its step-heading markup counted, and it runs STEP 1 to STEP 19. The same count holds in every public commit from `fb4165e` to `aef12ce`, taken the same way. An earlier draft of this record understated the count in three places; those were counting errors and are corrected.
- **The origin history is private.** Every date before 2026-07-30 in this record comes from a repository an unauthenticated reader cannot open. The server-attested rows (GitHub `web-flow` committer, pull-request timestamps, repository `created_at`) are real GitHub metadata but were read with authenticated access. Until the origin history is published, a stranger can verify v41.7 as of 2026-07-30 and v41.8 as of 2026-09-21, and nothing earlier.
- **What the public writing can and cannot prove.** The two blog posts carry publish dates from the site's own Squarespace data. The owner sets those dates and can change them, the September post's title has already changed since publication, and no independent copy of either post's text as of its publish date is known; so on their own they are owner assertions of date and of content. The X thread is different in kind: X's servers assign each post's ID at creation, the time is embedded in the ID, and the poster cannot set it. The thread therefore proves that a link card to the September post was public at 2025-10-25T00:50Z and that an outside reader, Grok, reported the same minute that the method carried the motto, a multi-AI structure with human-led decisions, and stages beginning with Strategy. Its limits: Grok's reply is a machine paraphrase and may have drawn on other pages of the site, an X post can be deleted, and X's paid edit feature can alter a post within a short window after posting, so the evidence depends on the posts staying live or being captured by a third party. The Medium post of 2026-01-14 carries Medium's publish date and was confirmed by the owner. None of these pages was opened by the tooling that built this record; the owner supplied the dates and contents, and this record's tooling independently reproduced only the Snowflake decoding. Every one of them is a page the owner could take down, which is why third-party captures are the first item under "Strengthening the record".
- **Git metadata attests to the organization, not the individual.** All 76 commits across both repositories are authored under the organization's name and GitHub account. Individual authorship by Israel Hernandez rests on the in-app attribution present since the root commit and on the public Medium byline, not on commit metadata.
- **The file's own ORIGIN note is imprecise about dates.** The FILE MAP header states the file "was originally generated by a build script in a Claude.ai sandbox, May 2026." The git history shows the file under active hand-edited versioning from 2026-04-09 (v31.8). The May reference matches the appearance of the generated FILE MAP header at v40.8 (2026-05-13), not the application's origin. A reader of the header alone would date the application three months too late; the header's wording should be corrected in a future ship.
- **Git author dates are self-asserted.** Commits made from a local CLI carry the author's clock. Commits made through GitHub's interface (browser upload, browser edit, pull-request merge) carry GitHub's clock; 54 of the 76 commits across both repositories are of that kind, and the remaining 22 are bracketed by server-attested merges within hours.
- **Underlying primitives are external.** Multi-agent debate, LLM-as-judge, single-file bring-your-own-key web pages, browser local storage, the Ollama HTTP API and its origin allow-list, provider model catalogs, forced-choice rating scales, the Web Speech API, and the models themselves (Llama, Qwen, GPT-OSS, Dolphin3) are credited to their originators in the related-work section. Claims are scoped to the stated combinations.
- **The closest prior art is close.** Multi-model panels that rate and discuss text existed by mid-2023 (PRD, ChatEval, ReConcile), panels from disjoint model families by 2024-04 (PoLL), ranked councils by 2024-06 (Language Model Council) and as a widely copied tool by 2025-11 (llm-council), and council-style review skills for coding agents in the weeks before 2026-04-09. Combat Writing's distinguishing predicate is the staged, human-gated pipeline for a human-written draft with publication gates and record, in one dependency-free file; the panel idea itself is not claimed.
- **Confidence is bounded by the review.** The related-work review was run from a network-restricted environment: arXiv, Medium, X, Hugging Face, Wikipedia, the Wayback Machine, Software Heritage, and the organization's own site were unreachable, so many prior-art dates come from search-index snippets. Items are marked where a date could not be confirmed. "First known" means first known to this review.
- **Nothing here is a legal opinion.** Copyright in the application exists from creation regardless of this document. A public, dated disclosure can serve as prior art against later patent claims by others (and, outside the one-year United States grace period, against the author's own), and it does not by itself create trademark rights in the name or the tagline. The mechanisms in "Strengthening the record" improve verifiability; they do not change what is protected.
- **What this record deliberately leaves out.** Email addresses, the names of anyone other than the author, customers, prospects, correspondence, sends, and the contents of the three internal working documents that were briefly tracked in the origin repository.

## Related work and references

Dates are as verified during the review; "(indexed)" marks a date taken from a search-index snippet rather than the page; "(unverified)" marks a date that could not be confirmed. Items dated after a claim's lineage date are subsequent related work, not prior art against it.

### Multi-model debate, critique, and judging
- Minsky, *The Society of Mind*, 1986.
- Irving, Christiano, Amodei, "AI safety via debate", arXiv:1805.00899, 2018-05.
- Perez et al., "Red Teaming Language Models with Language Models", arXiv:2202.03286, 2022-02.
- Ganguli et al., "Red Teaming Language Models to Reduce Harms", arXiv:2209.07858, 2022-08.
- Bai et al., "Constitutional AI: Harmlessness from AI Feedback", arXiv:2212.08073, 2022-12.
- Shinn et al., "Reflexion", arXiv:2303.11366, 2023-03.
- Madaan et al., "Self-Refine", arXiv:2303.17651, 2023-03.
- Li et al., "CAMEL", arXiv:2303.17760, 2023-03.
- Du et al., "Improving Factuality and Reasoning in Language Models through Multiagent Debate", arXiv:2305.14325, 2023-05.
- Liang et al., "Encouraging Divergent Thinking in LLMs through Multi-Agent Debate", arXiv:2305.19118, 2023-05.
- Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", arXiv:2306.05685, 2023-06.
- Li, Patel, Du, "PRD: Peer Rank and Discussion Improve LLM-based Evaluations", arXiv:2307.02762, 2023-07.
- Wang et al., "Solo Performance Prompting", arXiv:2307.05300, 2023-07.
- Qian et al., "ChatDev", arXiv:2307.07924, 2023-07; Hong et al., "MetaGPT", arXiv:2308.00352, 2023-08.
- Chan et al., "ChatEval: Towards Better LLM-based Evaluators through Multi-Agent Debate", arXiv:2308.07201, 2023-08.
- Chen, Saha, Bansal, "ReConcile: Round-Table Conference Improves Reasoning via Consensus among Diverse LLMs", arXiv:2309.13007, 2023-09.
- Khan et al., "Debating with More Persuasive LLMs Leads to More Truthful Answers", arXiv:2402.06782, 2024-02.
- Chiang et al., "Enhancing AI-Assisted Group Decision Making through LLM-Powered Devil's Advocate", IUI 2024, 2024-03.
- Verga et al., "Replacing Judges with Juries" (PoLL), arXiv:2404.18796, 2024-04.
- Wang et al., "Mixture-of-Agents Enhances Large Language Model Capabilities", arXiv:2406.04692, 2024-06; code at github.com/togethercomputer/moa.
- Zhao et al., "Language Model Council", arXiv:2406.08598, 2024-06.
- McAleese et al., "LLM Critics Help Catch LLM Bugs" (CriticGPT), arXiv:2407.00215, 2024-06.
- Hu et al., "Debate-to-Write", arXiv:2406.19643, 2024-06.
- "My Grade is Wrong!" (CAELF), arXiv:2409.07453, 2024-09.
- Bougie, Watanabe, "Generative Adversarial Reviews", arXiv:2412.10415, 2024-12.
- Jang et al., "LLM Agents at the Roundtable" (RES), arXiv:2509.14834, 2025-09.
- Karpathy, llm-council, github.com/karpathy/llm-council, 2025-11-22.
- Li et al., "LLM Review: Enhancing Creative Writing via Blind Peer Review Feedback", arXiv:2601.08003, 2026-01.
- "Who can we trust? LLM-as-a-jury", arXiv:2602.16610, 2026-02.
- Council-style review skills for coding agents: an "LLM Council" skill article, 2026-03-30 (indexed); github.com/ngmeyer/council-review and github.com/sherifkozman/the-llm-council (creation dates unverified); github.com/danielrosehill/Awesome-LLM-Council-Projects (index).
- Commercial councils: llmcouncil.ai and council-ai.app (launch dates unverified; self-described as post-2025-11).
- Renze, "Auditing the Synthetic Memoir", arXiv:2608.23640, 2026-08 (after the subject's lineage dates).

### Writing-critique and editing products
- Write or Die, 2008. Grammarly, 2009; GrammarlyGO, 2023-03. ProWritingAid, 2012; Chapter Critique and Virtual Beta Reader (dates unverified). Hemingway Editor, 2013–2014; AI rewrites, 2023-08. Marlowe (Authors A.I.), 2020-01. Sudowrite, 2020; persona-based Feedback, about 2026-05 (indexed; after the subject). Jasper, 2021-01. Lex, 2022-10. Notion AI, 2023-02. ChatGPT Canvas, 2024-10.
- Multi-model side-by-side chat aggregators (MultipleChat, DiffMind, and similar), 2025–2026 (launch dates unverified).
- Signal-to-noise as a prose-clarity metaphor: Bell System Technical Journal origin, 1923; applied to writing in many later guides (for example 2014 and 2025 posts). No publication by others was found in which a language model scores a draft's signal-to-noise ratio as a named metric; the subject's own post of 2025-11-11 (owner-dated) describes multiple models as separate receivers with signal-to-noise as the measure, and the closest outside work is AI-slop scoring (EQ-Bench Slop-Score, 2024–2025).

### Single-file and browser-only LLM clients
- Niek/chatgpt-web, repository created 2023-03-02: client-only, key in local storage, live model list from the provider.
- ztjhz/BetterChatGPT, 2023-03-03. TypingMind, 2023-03 (indexed). mckaywrigley/chatbot-ui, 2023-03-11. morphar/chatty-gpt, 2023-03-22 (no build step, key in local storage).
- casualwriter/vanilla-chatgpt, v0.65 on 2023-03-29: one self-contained `index.html`, key in local storage, browser text-to-speech added 2023-04-12.
- LibreChat, 2023-03 (server-based; noted for contrast). dmeldrum6/Local-LLM-Chat, 2024-04-18. N1xUser/OpenAI-HTML-Client, 2025-07-31. Cxmrykk/html-chat, 2026-02-21 (single HTML file, works with OpenAI, Ollama, OpenRouter).
- simonw/tools, single-page HTML tools with keys in local storage, 2024 onward (per-tool dates not verified).

### Browser front-ends for Ollama and local models
- Ollama origin allow-list: issue #300 (2023-08-06) and PR #301 merged 2023-08-08 add `--allowed-origins` with environment-variable support; the `OLLAMA_ORIGINS` name is documented in the Ollama FAQ (first appearance of the exact name unverified). PR #1357 (2023-12, closed unmerged) proposed a per-origin permission UI.
- ollama-ui/ollama-ui, 2023-08-03 (plain HTML calling localhost:11434). Open WebUI, 2023-10-06 (server-based; contrast). hollama, 2023-11-25 (static site, runs in the browser). Page Assist, Ollama support by 2024-02.
- LocalAIWriter, 2026-03-06 (Windows, Ollama-backed grammar and phrasing; no cloud path).
- Hardware-fit warnings in LM Studio and Jan (dates unverified); Private Mind PR #393, 2026-09-24 (after the subject). No prior product was found that shows a per-model "reliable for X, not for Y" capability banner tied to specific tasks; this is an unverified negative.
- Mitchell et al., "Model Cards for Model Reporting", arXiv:1810.03993, 2018-10.

### Models, provider catalog, and fallback routing
- Dolphin 3.0 (Dolphin3.0-Llama3.1-8B), Cognitive Computations, announced 2025-01-05 (indexed), Llama 3.1 license.
- Qwen3 family, Alibaba, 2025-04-29. gpt-oss-120b and gpt-oss-20b, OpenAI, 2025-08-05, Apache-2.0.
- GroqCloud API, 2024-02-19, OpenAI-compatible base path; `GET /openai/v1/models` returns the active model list; Groq's deprecations page records retirements that strand pinned ids (for example the 2025-05-31 Llama 3 retirements and later ones).
- OpenRouter `openrouter/auto` alias, 2023-11-08 (indexed); OpenRouter ordered model fallbacks (first-offered date unverified). LiteLLM router fallbacks (first-offered date unverified; project dates to 2023). Vercel AI Gateway model fallbacks, 2025-11-10 (indexed).
- Niek/chatgpt-web's client-side model discovery, 2023, is the earliest browser-side "resolve from the live catalog" example found. No prior client-only implementation of family-scoped fallback with a cross-vendor diversity rule was found; this is an unverified negative.

### Read-aloud proofreading
- Microsoft Word "Speak", Word 2010; Word "Read Aloud", 2017-08, marketed for catching errors by ear. Ginger Software text reader (date unverified). Web Speech API specification, 2012-10-19; Chrome 33 shipped speech synthesis in early 2014. vanilla-chatgpt used browser text-to-speech in a single-file client in 2023-04.

### The name and the tagline
- No prior product, course, or book titled "Combat Writing" was found; the phrase appears descriptively in military-writing contexts. Adjacent titles: *Writing Fight Scenes* (2011), *Fight Write* (2019), the Army's "Better Military Writing" course, the Combat Paper Project.
- No prior use of "Reading is Peace. Writing is War." or of "Writing is war" as a slogan was found outside the subject's own channels. The earliest third-party-dated record of the motto is Grok's reply of 2025-10-25T00:50:40Z on X; the earliest owner-dated use is the blog post of 2025-09-30 (see "Public writing and attribution outside GitHub"). The nearest unrelated item is "Read. Write. Fight." (U.S. Naval Institute Proceedings, 2016-06). Absence of a search hit is not proof of novelty.

### Provenance mechanisms and what they achieve
- IP.com Prior Art Database: paid, dated, examiner-searchable defensive publication; establishes a citable publication date, confers no exclusive right.
- USPTO MPEP §2128: an internet publication is a printed publication as of the date it was publicly posted; an undated page cannot be relied upon. 35 U.S.C. §102(b)(1)(A): an inventor's own disclosure starts a one-year United States grace period; most other jurisdictions apply absolute novelty.
- *Valve Corp. v. Ironburg Inventions*, 8 F.4th 1364 (Fed. Cir. 2021-08-17): Wayback Machine captures accepted as evidence of public accessibility.
- Software Heritage "Save Code Now" (2019-01-10) and SWHIDs, standardized as ISO/IEC 18670:2025 (2025-04-23): independent archival date and content integrity; does not validate the dates inside the repository.
- Zenodo–GitHub release archiving with DOIs (since 2014).
- OpenTimestamps (2016-09-15): Bitcoin-anchored proof that a hash existed before a block; proves existence, not authorship or public accessibility.
- GitHub commit signature verification: a "Verified" badge binds a commit to a key; author and committer dates on locally made commits come from the local clock and are displayed without validation. Server-side events (repository and pull-request timestamps, releases) are the independent dates.

*Built from GitHub repository metadata, the git history of both repositories, and the application source at each commit. Repository lineage, server-attested timestamps, public availability, feature evidence, and novelty are separate evidentiary layers and are reported as such.*
