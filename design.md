# Custody Roundtable: Design Doc

Date: 2026-08-04
Status: Approved by Kiwi, ready for implementation plan

## Purpose

Build a public, async process that turns the NYKNYC / DYOR / Don't-Trust-Verify
philosophy into a concrete decision tree for Bitcoin self-custody: threat
models, tool paths, and tradeoffs. The process gets named-expert buy-in and
publishes the result as a living document.

This tree is the source of truth for two later, separate projects:
- The FOSS concierge wizard's "why" and "what" content (Coldcard removed,
  Jade and Seed Signer kept).
- A quiz that routes a person through the tree to their own tradeoffs.

Both of those are out of scope for this document. This design covers only the
roundtable process and the living document it produces.

## Named participants

Ben Kaufman, Piers Cockram, Jesse Posner, Fractal Encrypt, Giacomo Zucco,
Jimbo (Seed Picker Solitaire), and if time allows, Rob Hamilton and Francis
Poliout ("core roundtable"). The public can also submit answers and questions,
but cannot edit the document directly (no PRs). Kiwi is the sole editor of
record.

## Structure

**Repo**: new standalone public repo, e.g. `BitcoinButlers/custody-roundtable`,
open license (MIT or CC-BY). Hosted as a static page (GitHub Pages). The root
page lists the tree by pillar along a spine, with each node's status, and
links to a page per node. Mermaid was dropped on 2026-08-05: it was a CDN
dependency on a page arguing against trusting third parties, and it rendered
as an unreadable box chain that overflowed on a phone.

**Node cadence**: one decision node per week, built ground-up from a single
epistemic thread, not from a threat-model list. The thread: *how do I know I
am the only one who knows this secret, while minimizing dependency on any one
piece of hardware or software.* Everything is organized into four pillars.

**Pillar 0: Premise, not a debated node.** Goes in the document's intro, not
a weekly question. Bitcoin's properties, savings that can't be inflated and
payments that can't be censored, only hold if you are the bearer. A
custodian reintroduces the counterparty risk Bitcoin exists to remove, links
your identity to your holdings, and makes you a named target for a wrench
attack you didn't need to invite. This is the NYKNYC framing that motivates
every node after it and does not need reconciling across experts.

**Pillar A: Certainty of the secret** (does anyone else know it, provably,
not probably):
1. Self-custody vs. collaborative custody vs. exchange. What accountability
   are you actually taking on, and what did you avoid? (Collaborative custody
   as "abdication-as-a-service" is a live position to test here, not the
   document's stance.)
2. Should you roll your own entropy, and what changes if you don't?
3. If you combine entropy sources (device + dice, via XOR), how do you
   *verify* the mixing rather than trust it? Deterministic steps (hashing,
   XOR, checksums) can be replicated on a second vendor's device to confirm a
   match; non-deterministic randomness itself cannot be replicated or proven,
   only sourced by you.
4. Seed format: BIP-39 vs. raw BIP-32 vs. Codex32. What each buys or costs
   for backup, recovery, and error correction.

**Pillar A.5: What actually has to survive on a backup** (added 2026-08-04,
was missing from the original draft): seed words alone are not a complete
backup for anything beyond the simplest single-sig case.
5. The complete material per key: seed words, derivation path (e.g.
   `m/48'/0'/0'/2'` for multisig P2WSH), script type, and the master
   fingerprint (root XFP). Without all four, restoring the words elsewhere
   can silently derive the wrong addresses and show a correct-looking, empty
   wallet.
6. The passphrase, if used, is a separate secret with no checksum, so a typo
   is undetectable and opens a different, valid, empty wallet. It must be
   backed up with more rigor than the seed, and never co-located with the
   seed itself, or the "second factor" collapses back into one.
7. Open question for the roundtable, not a settled claim: for multisig, is a
   separate descriptor/policy backup actually necessary, or is it recoverable
   from the seeds alone? A descriptor can be engraved on metal like a seed,
   but in practice most people will keep it in a wallet file or cloud backup
   instead. Reconstructing it from seeds alone requires *every* cosigner's
   seed present (not just a spending quorum, which is a strictly harder bar),
   plus separately remembering the script type, every derivation path, and the
   quorum, none of which live inside the seed data itself. Whether that
   residual out-of-band knowledge is small enough to just remember, or is
   itself a backup requirement, is the actual question to put to the
   roundtable.

**Pillar B: Minimizing dependency** (not betting everything on one thing):
8. Single-sig vs. multisig. Frame as: people already build informal, ad hoc
   multisig without naming it. A spare seed copy is 1-of-2, a passphrase
   kept separately is 2-of-2, SeedXOR is 2-of-2, an encrypted backup is
   2-of-2. The question is whether to do that on purpose, with a scheme
   designed for it, or by accident.
9. If multisig, single-vendor or multi-vendor? What failure mode does vendor
   diversity actually address (firmware bug, discontinued product, single
   point of coercion) versus what it costs in complexity.
10. Air-gapped signing and transport. How a PSBT physically moves between
    devices (QR, SD card, USB) is itself a dependency and attack-surface
    question, not a solved detail. Missing from the original draft entirely.
11. Physical/geographic redundancy of the backups themselves. A fire or a
    single burglary defeats a cryptographically perfect setup exactly like a
    single vendor's firmware bug does. Not addressed anywhere in the original
    draft, which covered only cryptographic and vendor dependency.
12. Full end-to-end verification: seed → xpub → addresses → signing,
    reproduced independently on a second vendor's device, so the setup is
    *known*, not trusted, to do what it claims. This node also requires
    rehearsing recovery from the cold backup materials alone, with no wallet
    software available. The setup being mathematically correct is not the
    same as someone being able to actually read it back under pressure. This
    is the seed of the "Don't Trust, Verify" article (see
    `content/dtv-article-draft.md`).

**Pillar C: Continuity without creating a new dependency**
13. Inheritance. How heirs get access without a live single point of failure
    (a person who can rush you, an executor who can be coerced) existing
    years before it's needed.
14. Retirement/incapacity. The same problem with a different trigger.
15. Rotation and migration. What happens when a seed is suspected exposed, a
    vendor is discontinued, or a firmware change breaks an assumption the
    setup relied on. Migrating to a new setup without reintroducing the same
    trust problem being solved was missing from the original draft entirely.

**Pillar D: Living with it**
16. UTXO management and privacy. Once custody is sound, how ongoing use
    doesn't quietly reintroduce the surveillance/deanonymization risk
    self-custody was meant to remove. Name concrete tool categories
    (coinjoin, PayJoin, label-based UTXO management) rather than leaving this
    as a vague "privacy tools" bullet.

**Synthesis node (last)**: stitch the pillars into named end-to-end paths
(e.g. "solo hobbyist," "family with heirs," "high-net-worth multi-vendor").
This is the skeleton the eventual quiz walks a person through.

Each node gets its own file (`nodes/01-collaborative-vs-self.md`, etc.) and
its own comment thread (see Comments below).

**Weekly loop**:
1. Monday. Kiwi publishes the node's question and starter framing on the
   page, and posts it publicly on X/Nostr tagging the named experts.
2. Through the week, replies land in the node's comment thread (core
   roundtable experts DM'd directly with a link; public sees the same thread
   via the public post).
3. Following Monday. Kiwi drafts the node's branches from that week's
   replies so far, commits them to the page, and opens the next node's
   question.
4. A backlog file (`BACKLOG.md`) tracks which nodes are open/contested vs.
   resolved.

**No deadline on any node (added 2026-08-05)**: the weekly cadence sets how
often a *new* question opens. It does not close the old ones. Every published
node stays open for replies for as long as the project runs. A reply that
arrives months later is still worth having, and the tree is a living document
rather than a set of closed polls.

What this means in practice:
- A node never moves to `resolved` because time passed. It moves when its
  branches have been stable for a week or more with no new argument against
  them, and it moves back to `contested` if a later reply reopens it.
- Experts are never late. Someone who answers node 1 in week nine is answering
  an open question, not a closed one, and their branch gets drafted the same
  way.
- The invite text says the question has no deadline, so nobody stays quiet
  because they think they missed it.
- Several nodes are open at once by design. This is expected, not a backlog
  problem to clear.

**Fragmentation, not forced consensus**: when experts disagree, the node's
Mermaid sub-tree branches instead of collapsing to one answer. Each branch
carries a one-line "applies when" tag (e.g. "applies if you self-custody
>$50k" or "applies if you have heirs who aren't technical") and attribution to
whoever argued for it. Divergence is content, not a problem to resolve. It
feeds the eventual quiz's branching logic.

**Editorial role**: Kiwi is the compiler and editor of record. He merges
replies into branch text, tags attribution, and closes out settled nodes, but
never overwrites what a named expert attached to their own branch without
asking them first.

**Scope guardrail**: nodes cover why/what (threat models, tool tradeoffs), not
step-by-step procedures. "The how" is a separate, later project.

**Attribution gate (hard requirement, added 2026-08-04)**: any node or article
draft built from a named expert's private messages or DMs, and not from
something they posted publicly, cannot be published, even in draft form on the public
repo, until that person has explicitly confirmed the compiled text is
accurate and approved for republication under their name. This applies now to
`content/dtv-article-draft.md`, built entirely from Jimbo's written comments
to Kiwi. Currently unconfirmed. This is not optional editorial polish. It is
someone else's specific technical claims and voice being attributed to them
publicly without their sign-off.

## Comments

Comment mechanism (revised 2026-08-05): the project's own thread reader,
`comments.js`. It reads kind-1 replies to a node's anchor event straight from
the relays over WebSocket, renders them, and signs new replies with a NIP-07
browser extension such as Alby or nos2x. No build step and no third-party
bundle. Chosen over GitHub Discussions/giscus because:

- Comments are signed with a Nostr key, not tied to a GitHub account. This
  fits the sovereignty framing of the project itself.
- Named experts are all Bitcoin-native and near-certain to already hold a
  Nostr key; friction is low for the audience that matters most.

The original plan was `codonaft/zapthreads-codonaft`, a moderated fork of
ZapThreads. That was dropped for two reasons found on 2026-08-05. The fork is
not published to npm, so using it means committing a self-built bundle into
this repo. Upstream ZapThreads also has no whitelist, allowlist, or
trusted-author attribute, so the roundtable filter below had to be our own
code either way. Owning the render loop is simpler than filtering someone
else's rendered DOM.

**Whitelist filter (added 2026-08-05)**: a node's thread opens on the core
roundtable by default. A reader can switch to `Everyone` to read every reply.
The whitelisted pubkeys live in `whitelist.json` at the repo root, one entry
per named participant plus Kiwi as editor of record.

This is a display default, not moderation. Anyone with a Nostr key can still
post, and every reply stays readable one click away. The point is that expert
signal is what a visitor sees first, matching the editorial rule that only
core-roundtable replies carry roundtable weight when Kiwi drafts branches.

**Avatars (added 2026-08-06)**: whitelisted people show a profile picture
beside their name. The images are copied into `avatars/` and served from this
site rather than hotlinked. The pictures in people's kind-0 profiles sit on
third parties, currently `m.primal.net`, `image.nostr.build` and
`pbs.twimg.com`, so hotlinking would hand every visitor's IP address to Primal,
nostr.build and X. The same reasoning that vendored `nostr-tools` applies to a
decorative image. Only whitelisted keys get a picture. Refresh them with
`node fetch-avatars.mjs`.

The page does not read kind-0 at runtime. The name in `whitelist.json` is the
one Kiwi vouched for, so a compromised key cannot change how a name reads on
the page.

Filling `whitelist.json` needs care. Take each npub from the person directly
or from a post they signed, never from a search result. A wrong npub gives an
impersonator roundtable weight on the page.

The whitelist is public on purpose (confirmed by Kiwi 2026-08-05). Publishing
who carries roundtable weight is honest about an editorial choice the project
is making anyway. The reason for having it: a handful of people with deep
experience should not be buried under bots and drive-by opinions. Deciding
whose answer carries weight is human judgment, and that judgment is part of
the work rather than something to hide behind an algorithm. Every reply stays
readable one click away, so nobody is silenced by the default.

**Relays (set 2026-08-05)**: `wss://relay.ditto.pub` (Soapbox) and
`wss://nos.lol`. Both were tested end to end with the project key and accept
writes. `wss://relay.damus.io` refused the connection and was dropped. Running
a relay of our own is not needed yet and would add an uptime dependency the
project does not have to carry.

**Opening a node's thread**: publish one kind-1 event from the project key,
then paste its event id into that node's `anchorEvent` in `nodes.json` and
re-run `build-nodes.js`. A node with `anchorEvent: null` shows "This node's
thread is not open yet" and takes no replies. This is the Monday step in the
weekly loop.

Moderation model: the reader queries a specific relay (or small relay set)
that the project controls or curates by default. Filtering and hiding happen
at the display layer only. Nothing is force-deleted from the network,
consistent with how Nostr moderation works generally.

**Signing on a phone (added 2026-08-05)**: NIP-07 browser extensions are
desktop only, so an extension-only page has a reply box that half the audience
cannot use. The page now offers two ways in. A NIP-07 extension covers
computers. A NIP-46 remote signer (Amber, nsec.app, any bunker) covers phones:
the visitor pastes a bunker string once, the page stores the connection, and
the signer app approves each signature. The private key never reaches the page
in either case.

This needed real cryptography (NIP-44 is ChaCha20-Poly1305 plus secp256k1
ECDH), so `nostr-tools` is vendored under `vendor/`, committed rather than
pulled from a CDN. A page about not trusting third parties should not load
code from one at runtime. The library loads lazily, only when a visitor
chooses to sign, so reading the thread stays dependency-free.

There is also a "Reply in your Nostr app" link, a `nostr:` deep link built
into the page at build time. One tap opens the thread in whatever client the
person already uses, with no ids to copy.

Known limitation, accepted: visitors with no Nostr key at all cannot comment.
They read everything, and the page tells them why replies are signed. This
holds the sovereignty framing rather than adding an unsigned fallback channel.

Older note, now partly addressed: some public visitors without a Nostr
extension will not comment. This is an acceptable tradeoff given the priority on
key-signed, undeletable-by-Kiwi expert input.

## Video answers (added 2026-08-05)

Approved contributors (the named core roundtable, keyed by their Nostr
pubkey) may submit a video answer to a node instead of, or alongside, a text
comment. Process, since there is no upload backend on this static site yet:

1. Contributor sends Kiwi the video directly (whatever channel is easiest for
   them).
2. Kiwi transcribes it to text and posts the transcript on the node page
   (`nodes.json` → that node's `videos` array), attributed to them.
3. The raw video file is kept in Bitcoin Butlers' own media store for
   promotion and social use. It does not need to live in this public repo.

Automating intake (a real upload form, gated by pubkey signature, automatic
transcription) is a separate infra project once this manual version proves
the format is worth the effort. Building that now, before a single video has
been submitted, would be solving a problem that doesn't exist yet.

## Voice-to-text for comments (added 2026-08-05)

The comment box is text-only today. A voice-to-text input (browser
`SpeechRecognition` API filling the reply textarea, no server required) is
planned. Since the comment reader is now this project's own code
(`comments.js`), this is a local change rather than a PR to someone else's
codebase. Not built yet.

## Success criteria

- At least half the named list has visibly participated or signed off.
- Every major branch has a named attribution, not just "the community."
- Coverage is complete enough (major threat models and tool paths present)
  that the wizard team can start converting the tree into wizard logic
  without waiting on further rounds.

## Risks

- **Expert non-response**: mitigated by low weekly ask (one question) and no
  requirement to answer every week.
- **Public noise drowning expert signal**: only core-roundtable replies get
  "core roundtable" attribution weight when drafting branches; public replies
  can still surface a branch but need Kiwi's editorial judgment to promote.
- **Scope creep into "the how"**: explicitly excluded per node.
- **Never converging**: not a failure mode by design. A node is "done" when
  its branches are stable for a week, not when everyone agrees. "Done" also
  never means closed. A resolved node still takes replies and can reopen.

## Explicitly out of scope for this project

- FOSS concierge wizard content changes (Coldcard removal, Jade/Seed Signer
  copy).
- The end-of-tree quiz.
- The MCP-based import/distribution architecture for exchanges, consultants,
  educators, regional partner shops, and butlers.

These are follow-on projects that consume this document's output and should
each get their own design once this one is running.
