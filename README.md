# Combat Writing

**"Reading is Peace. Writing is War."**

Combat Writing is a single HTML file that battle-tests your communications.
You bring the draft and the context; a crew of AI models attacks it from
several angles; the weak parts get exposed and the strong parts survive.
This README describes v41.8.

## What it does

One session, four stages, each a card on the SESSION tab:

- **STRATEGY.** Your source material and a context brief.
- **SPARRING.** Rounds with the crew on your pieces. The crew reads your
  source material and brief on its own; fire a slot, or send a custom round.
- **BATTLE.** The final draft under fire: signal-to-noise and red-flag
  checks read the draft automatically; synthesis rounds answer what you put
  in the field.
- **CHAMPION.** Publish, and record what worked.

Around the session: FLOWCHART and METHODOLOGY explain the process; the
INSIGHT VAULT keeps what you learned; CANON holds what you published. The
fields open fullscreen and copy with one click, and the source material,
the brief and the crew's responses can be read aloud for proofreading by
ear. EXPORT ALL saves everything (the session, the vault, the canon, the
saved slots) as JSON and import restores it; a print summary lays the
session out on paper.

**Groq Cloud Crew.** One API key, saved in the app, and you have two slots
from two different model families, picked from Groq's live catalog. The
page reads the catalog when you save the key, at load, and whenever a model
id stops answering; slot A takes an OpenAI open-weight model and slot B a
Qwen model, the preferred id if it is live, else the newest live one in the
family, else the newest from another vendor, else the slot reads NO SECOND
VOICE. No model id is pinned in the code, so a retired model never strands a
slot, and the label always names what is running. Each slot keeps a short
session memory. The key stays in your browser's storage and is never
exported with a session.

**Offline AI.** Run the crew's judging locally with Ollama and the Dolphin3
model (8B). Desktop only. The setup drawer walks you through it: install
Ollama, `ollama pull dolphin3` once, then start it with
`OLLAMA_ORIGINS=* ollama serve` and leave that terminal open for the
session. Nothing leaves your machine; responses take minutes, not seconds.
When you switch offline mode on, a banner above the drawer says for a few
seconds what the local model is reliable for and what it is not.

## How to run it

Open [combatwriting.learningproducers.com](https://combatwriting.learningproducers.com).

Or press DOWNLOAD in the header, save the file it offers
(`CombatWriting_v41.8.html`), and open it from your disk: the app runs from a
file, works offline once you have a copy, and keeps your session in the
browser's own storage. No build, no server, no dependencies. The page has a
phone layout; offline AI needs a desktop with Ollama.

## What changed at v41.8

The previous README was born with the v41.7 public source and had its crew
sentence updated at v41.8; everything else on this page is new.

- **v41.8.** The crew slots resolve from Groq's live model catalog instead
  of ids written into the file. A model Groq retires no longer leaves a
  slot showing an error: the slot re-reads the catalog and moves to the
  next live model in its family, or to another vendor's, or reads NO
  SECOND VOICE, and says which.

The repository also carries `gmail.html`, a separate one-page tool that
opens a prefilled Gmail compose from a link. It is not part of Combat
Writing.

## Terms

The app file's header carries its terms: personal use, modify it for
yourself, no redistribution without written permission. Groq's API and the
models served through it, Ollama, and the Dolphin3 model belong to their
providers under their own terms; nothing here claims otherwise.
