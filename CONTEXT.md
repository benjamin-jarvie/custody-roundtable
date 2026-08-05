# CONTEXT

The words this repo uses. The code, the docs, the tickets and Ben all use
these terms for these things. Use the term given here and no synonym.

## Content

**node**: one weekly decision point in the tree. It has a question, a
framing, and later a set of branches. One file per node in `nodes.json`, one
generated page in `nodes/`. Numbered `01`, `02`, and so on. Do not call a node
a "topic", a "post", or an "issue".

**pillar**: one of the four groups a node belongs to. A (certainty of the
secret), A.5 (what has to survive on a backup), B (minimizing dependency), C
(continuity), D (living with it). Pillar 0 is the premise and is never
debated.

**premise**: the NYKNYC framing every node assumes. Not up for debate, so it
is not a node.

**branch**: one answer path drafted from a week's replies. Each branch has an
"applies when" tag and a named attribution. Experts who disagree get separate
branches. Do not call a branch an "option" or a "recommendation".

**synthesis**: the final node. It stitches the branches into named
end-to-end paths for the eventual quiz.

**status**: a node is `open`, `active`, `contested`, or `resolved`. Tracked
in `BACKLOG.md`. Nothing else counts as a status.

**editor of record**: Kiwi. The only person who commits changes to the
document. There are no PRs from contributors.

**attribution gate**: the rule that text compiled from a named expert's
private messages cannot be published anywhere public until that person
confirms it. See `design.md`.

## Comments

**core roundtable**: the named participants listed in `design.md`. Their
replies carry roundtable weight when Kiwi drafts branches. The public can
reply too, but public replies need Kiwi's editorial judgment to promote.

**whitelist**: the pubkeys in `whitelist.json`. Comments from these keys show
in the default view. Nothing else. Do not call it a "allowlist", a "filter
list", or "moderation".

**roundtable only**: the default comment view. It shows whitelisted pubkeys
only.

**everyone**: the other comment view. It shows every reply the relays
return. A reader switches to it with the toggle.

Filtering is a display choice. It is not moderation. Anyone can still post,
and nothing is deleted from the relays.

**anchor event**: the Nostr event Kiwi publishes once per node. Replies tag
it, and the thread reader fetches replies by it. Set per node in
`nodes.json`. A node with no anchor event has no open thread.

**relay**: a Nostr relay URL the thread reader queries. Set per node in
`nodes.json`.

**NIP-07**: the browser extension standard (Alby, nos2x) that signs a
reader's reply. The site never touches a private key.

**thread reader**: `comments.js`, this project's own comment code. It
replaced the planned ZapThreads fork. See `design.md` for why.

## Writing

No em dashes anywhere in this repo. Use a comma, a colon, a full stop, or
parentheses. This applies to `design.md`, `nodes.json`, generated pages, and
commit messages.

Do not use the "not X, it's Y" construction.
