# Custody Roundtable

A public decision tree for Bitcoin self-custody, built one question at a time
from the answers of people who design and use these setups.

**Live site**: https://benjamin-jarvie.github.io/custody-roundtable/

## Why

Self-custody advice is scattered, and most of it jumps to tools before it
states the problem. The gap is knowledge, not difficulty.

This project works from one thread: *how do I know I am the only one who knows
this secret, while minimizing dependency on any one piece of hardware or
software.* Every question follows from that.

The premise is not up for debate. Bitcoin's properties, savings that can't be
inflated and payments that can't be censored, only hold if you are the bearer.
A custodian reintroduces the counterparty risk Bitcoin exists to remove.

The result feeds two later projects: the content for a self-custody wizard,
and a quiz that routes a person to their own tradeoffs.

## What

Seventeen decision nodes. Four pillars, plus A.5, which was added once it was
clear the original draft assumed seed words were a whole backup:

- **A. Certainty of the secret**: does anyone else know it, provably.
- **A.5. What has to survive on a backup**: seed words alone are not enough.
- **B. Minimizing dependency**: not betting everything on one vendor, one
  device, or one location.
- **C. Continuity**: inheritance, incapacity, and migration.
- **D. Living with it**: privacy and UTXO management after the setup is sound.

Each node has a question, a starter framing, and the branches drafted from
replies. `BACKLOG.md` tracks all of them. `design.md` is the full process.
`CONTEXT.md` defines the terms used throughout.

**Where answers disagree, the tree branches.** Divergence is the content, not
a problem to fix. Each branch carries an "applies when" tag and the name of
whoever argued for it.

## How

One new question opens per week. **No question has a deadline.** Every
published node keeps taking replies for as long as the project runs, so a
reply months later is still worth having, and a settled node reopens if
someone argues against it.

Answers are Nostr comments signed with your own key. Reply on the node page
itself, whatever device you are on:

- **On a computer**: a NIP-07 browser extension such as Alby or nos2x.
- **On a phone**: a NIP-46 remote signer such as Amber or nsec.app. Paste the
  bunker string once and the page remembers the connection.
- **Or from your own client**: one tap on "Reply in your Nostr app" opens the
  thread in Damus, Primal or Amethyst. Nothing to copy.

Your key never reaches this page in any of these. Your reply appears
attributed to your key, and nothing you sign can be edited or deleted by this
project.

Comments have two views. **Roundtable only** is the default and shows the
pubkeys in `whitelist.json`. **Everyone** shows every reply.

Whitelisted people show their name and face. Everyone else shows a shortened
public key. The pictures are copied into `avatars/` and served from this site,
never hotlinked from wherever the profile keeps them, so reading the page sends
nothing to any third party.

That whitelist is public on purpose. It is a display default, not moderation
and not access control. Anyone can post, nothing is hidden from the relays,
and every reply stays one click away. The point is that a handful of people
with deep experience do not get buried under bots and drive-by opinions.
Deciding whose answer carries weight is human judgment, and this project
treats that judgment as part of the work rather than something to hide.

Relays: `wss://relay.ditto.pub` and `wss://nos.lol`.

## Who

Kiwi (Bitcoin Butlers) is the editor of record and the only committer. There
are no pull requests. He compiles replies into branches, tags attribution, and
never rewrites what a named person attached to their own branch without asking
them first.

The core roundtable: Ben Kaufman, Piers Cockram, Jesse Posner, Fractal
Encrypt, Giacomo Zucco, Jimbo (Seed Picker Solitaire), and if time allows Rob
Hamilton and Francis Pouliot.

Anyone can answer. Core roundtable replies carry roundtable weight when
branches are drafted. Public replies can still surface a branch and need the
editor's judgment to promote.

## Repo

| File | What it is |
|---|---|
| `index.html` | the tree and the node index |
| `nodes.json` | node content, anchor event, and relays. Source of truth |
| `build-nodes.js` | generates `nodes/*.html` from `nodes.json`. Run after any edit |
| `comments.js` | the Nostr thread reader, signing, and the whitelist filter |
| `vendor/nostr-tools.js` | vendored MIT library, loaded only when signing |
| `whitelist.json` | pubkeys shown in the default comment view |
| `avatars/` | profile pictures, copied here so none are hotlinked |
| `fetch-avatars.mjs` | refetches those pictures. Run by hand |
| `design.md` | the full process design |
| `BACKLOG.md` | status of all nodes |
| `CONTEXT.md` | the vocabulary this project uses |
| `.nojekyll` | tells GitHub Pages to publish these files as they are |

No build step beyond `node build-nodes.js`, and no package manager. The one
library, `nostr-tools`, is committed under `vendor/` rather than pulled from a
CDN, so the published page depends on no third party at runtime. Reading the
thread never downloads it. Only signing does.

## Writing rule

No em dashes anywhere in this repo.
