# CLAUDE.md: the law of this repo, for any contributor's coding agent

## What the product is
Combat Writing is ONE file: `index.html`. No build step and no
dependencies. Read the header banner of `index.html` first: it is the file
map, with line ranges per section.

## The gate
Before any pull request, every check in `tests/` named `*_check.js` is
green: `node tests/<name>_check.js`, run from the repo root. GitHub runs
the same checks on every pull request and every push to main: the `checks`
job in `.github/workflows/checks.yml`.

## One change, one pull request
One change per pull request. Open every pull request as a DRAFT. Never
merge; a human merges.

## The commit shape
The last line of a commit message is exactly `Co-Authored-By: Claude`. No
session link and no session URL anywhere in a commit message or a pull
request body. The route a cloud session posts through can append a footer
carrying a session link after the body it was given, so a session that
opens a pull request reads the body back and deletes any appended footer
carrying a session link before it reports.

## Privacy
- Test data is invented: example.com, `.invalid` hosts, made-up people and
  customers. No check holds a private person's name, a customer, a phone
  number or a street address. A check may hold a public name that the
  product or its public record already names.
- `.claude`, `CW_QA_RUNBOOK.md` and `HANDOFF.md` are gitignored and stay
  that way. Never commit them, never un-ignore them.

## The API key
The Groq key lives in the browser only. It is never written to a file,
never pasted into a shell command, never put in a test, a fixture or a
commit.
