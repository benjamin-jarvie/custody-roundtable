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
in `BACKLOG.md`. Nothing else counts as a status. No status means closed. A
published node takes replies for as long as the project runs, and `resolved`
returns to `contested` if a later reply reopens it. Do not say a node
"expires", "closes", or "is due".

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
`nodes.json`. The project reads and writes `wss://relay.ditto.pub` (Soapbox)
and `wss://nos.lol`. Both were tested on 2026-08-05 and accept writes from the
project key. `wss://relay.damus.io` refused the connection and is not used.

**NIP-07**: the browser extension standard (Alby, nos2x) that signs a
reader's reply on a computer. The site never touches a private key.

**NIP-46**, or **remote signer**: the phone path. A signer app (Amber,
nsec.app) holds the key and approves each signature over a relay. The reader
connects by pasting a **bunker string**, the `bunker://` URI their signer app
gives them. Say "remote signer" in prose and "bunker string" for the URI. Do
not say "login" or "account", because neither exists here.

**deep link**: the `nostr:` link labelled "Reply in your Nostr app". It opens
the thread in the reader's own client. Built into the page at build time.

**how to comment**: the help section at the bottom of every node page, anchor
`#how-to-comment`. The composer links to it as "Having issues commenting?".
It covers why Nostr, getting a key, the computer and phone routes, and why
the roundtable view shows some names first. Edit it in one place, the
`howToComment()` function in `build-nodes.js`, then rebuild.

**thread reader**: `comments.js`, this project's own comment code. It
replaced the planned ZapThreads fork. See `design.md` for why.

## Writing

No em dashes anywhere in this repo. Use a comma, a colon, a full stop, or
parentheses. This applies to `design.md`, `nodes.json`, generated pages, and
commit messages.

Do not use the "not X, it's Y" construction.
