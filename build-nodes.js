#!/usr/bin/env node
// Generates nodes/<id>.html from nodes.json. Re-run after editing nodes.json
// or adding a new weekly node. No dependencies, no build step beyond this.
const fs = require("fs");
const path = require("path");

const nodes = JSON.parse(fs.readFileSync(path.join(__dirname, "nodes.json"), "utf8"));
const outDir = path.join(__dirname, "nodes");

// Reader-facing wording for each status, since "drafted" and "open" describe
// our workflow rather than what a visitor can do.
const STATE = {
  active: { label: "Open for answers", cls: "" },
  drafted: { label: "Next up", cls: "is-next" },
  contested: { label: "Open, branches disputed", cls: "" },
  resolved: { label: "Settled for now", cls: "is-pending" },
  open: { label: "Not published yet", cls: "is-pending" },
};

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- bech32 nevent, built here so the page needs no library to link out ------
// A "Reply in your Nostr app" link needs the NIP-19 bech32 form of the anchor
// event. Computing it at build time keeps the runtime read path free of any
// dependency.

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}

function bech32HrpExpand(hrp) {
  const out = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function convertBits(data, from, to, pad) {
  let acc = 0;
  let bits = 0;
  const out = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & maxv);
  return out;
}

function bech32Encode(hrp, data) {
  const values = bech32HrpExpand(hrp).concat(data, [0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const checksum = [];
  for (let i = 0; i < 6; i++) checksum.push((polymod >> (5 * (5 - i))) & 31);
  return hrp + "1" + data.concat(checksum).map((i) => BECH32_CHARSET[i]).join("");
}

// Plain note1 form. Some clients resolve this when they ignore an nevent.
function noteEncode(idHex) {
  return bech32Encode("note", convertBits([...idHex.match(/../g).map((b) => parseInt(b, 16))], 8, 5, true));
}

// NIP-19 TLV: type 0 is the event id, type 1 is a relay hint.
function neventEncode(idHex, relays) {
  const bytes = [];
  const push = (type, value) => {
    bytes.push(type, value.length, ...value);
  };
  push(0, [...idHex.match(/../g).map((b) => parseInt(b, 16))]);
  for (const relay of relays || []) push(1, [...Buffer.from(relay, "ascii")]);
  return bech32Encode("nevent", convertBits(bytes, 8, 5, true));
}

function videoBlock(node) {
  if (!node.videos || node.videos.length === 0) {
    return `<div class="video-slot">
      No video answers yet. Approved contributors can submit a video response;
      we transcribe it to text here and keep the original for promotion.
      See the process note in <code>design.md</code>.
    </div>`;
  }
  return node.videos
    .map(
      (v) => `<div class="video-slot filled">
        <span class="attribution">${escapeHtml(v.name)} (${escapeHtml(v.pubkey.slice(0, 12))}…)</span>
        <video controls preload="none" poster="${escapeHtml(v.poster || "")}">
          <source src="${escapeHtml(v.src)}" type="video/mp4">
        </video>
        <div class="transcript">${escapeHtml(v.transcript)}</div>
      </div>`
    )
    .join("\n");
}

// The same help section on every node page, so the "Having issues
// commenting?" link beside the composer never leaves the page.
function howToComment() {
  return `<p class="section" id="how-to-comment">How to comment</p>

  <div class="howto">
    <h3>Why Nostr and not a normal comment box</h3>
    <p>
      Your reply is signed with your own key. That has three consequences that
      matter for a document built out of other people's arguments.
    </p>
    <ul>
      <li>Nobody can edit what sits under your name, including us. We compile
        replies into branches, and you can always check the original.</li>
      <li>Nobody can delete your argument either. A signed event does not
        depend on us keeping it. If this project disappears, your answer is
        still on the relays.</li>
      <li>There is no account, no email, and no password. Nothing to sign up
        for and nothing for us to leak.</li>
    </ul>
    <p>
      A project about not trusting third parties should not ask you to trust
      one to hold your words.
    </p>

    <h3>Getting a key, about two minutes</h3>
    <p>
      A Nostr key is a keypair, the same idea as a Bitcoin key. The public half
      (<code>npub</code>) is your name. The private half (<code>nsec</code>) is
      your password and your identity. Back it up. Losing it means losing the
      identity, and there is no reset.
    </p>
    <ul>
      <li><strong>On a phone</strong>: install
        <a href="https://github.com/greenart7c3/Amber" rel="noopener">Amber</a>
        (Android), or open <a href="https://nsec.app" rel="noopener">nsec.app</a>
        in any mobile browser. Create a key.</li>
      <li><strong>On a computer</strong>: install
        <a href="https://getalby.com" rel="noopener">Alby</a> or
        <a href="https://github.com/fiatjaf/nos2x" rel="noopener">nos2x</a> as a
        browser extension. Create a key.</li>
    </ul>
    <p>
      If you already answer on Nostr from Damus, Primal or Amethyst, you have a
      key already. Skip this.
    </p>

    <h3>Commenting from a computer</h3>
    <ol>
      <li>Install Alby or nos2x and create or import your key.</li>
      <li>Press <strong>Browser extension</strong> above the reply box.</li>
      <li>Approve the connection when the extension asks. It shares your public
        key only.</li>
      <li>Write your reply and press <strong>Sign and post</strong>. The
        extension asks you to approve the signature.</li>
    </ol>

    <h3>Commenting from a phone</h3>
    <p>
      Alby and nos2x are desktop browser extensions, and no Nostr extension
      exists for Safari on iPhone, so the <strong>Browser extension</strong>
      button is switched off on a phone. Phones use a signer app instead. Your
      key stays inside that app and never reaches this page, and the app asks
      you to approve every signature.
    </p>
    <ol>
      <li>Install Amber, or open nsec.app, and create or import your key.</li>
      <li>In that app, copy its connection string. It starts with
        <code>bunker://</code>, which is the Nostr standard for remote signing
        and has nothing to do with any hardware vendor.</li>
      <li>Press <strong>Signer app</strong> above the reply box, paste the
        string, and press <strong>Connect</strong>.</li>
      <li>Approve the connection in your signer app.</li>
      <li>Write your reply and press <strong>Sign and post</strong>, then
        approve the signature in the signer app.</li>
    </ol>
    <p>
      This page remembers the connection, so you only paste that string once on
      this device.
    </p>

    <h3>Or answer from the app you already use</h3>
    <p>
      The reliable way, and the one we suggest: press <strong>Copy the note
      id</strong> under the reply box, open the Nostr app you already use, and
      paste the id into its search. That opens this thread, and you reply there
      as you would to any note. No key to connect here, and your reply still
      appears on this page.
    </p>
    <p>
      <strong>Reply in your Nostr app</strong> beside it tries to open the
      thread directly. Some apps honour it and some ignore it and open on their
      own home screen, so treat it as a shortcut and fall back to pasting the
      id.
    </p>
    <p>
      If the id does not resolve in your app, that app is probably not reading
      any relay we publish to. We use relay.damus.io, relay.ditto.pub, nos.lol,
      relay.primal.net and offchain.pub. Tell Kiwi which relays you read and we
      will add them, because a missing relay is our problem to fix, not yours
      to work around.
    </p>

    <h3>Why some names show first</h3>
    <p>
      The thread opens on <strong>Roundtable only</strong>, which shows the
      people listed in
      <a href="../whitelist.json">whitelist.json</a>. <strong>Everyone</strong>
      shows every reply. Both views read the same relays.
    </p>
    <p>
      This is a display default. It is not moderation and it is not permission.
      Anyone can post, no reply is hidden from the relays, and every reply is
      one press away. The list is public so you can see exactly whose answers
      are being weighted.
    </p>
    <p>
      The reason for it: a handful of people with deep experience should not be
      buried under bots and drive-by opinions. Deciding whose answer carries
      weight is human judgment, and this project treats that as part of the
      work rather than something to hide behind an algorithm. Public replies
      can still raise a branch and reach the tree on their merits.
    </p>

    <h3>Still stuck</h3>
    <p>
      Post your answer publicly on Nostr and tag
      <code>npub1ddeduk2zx9wpu86v2d3t0qxdgz4yymyt2ake5kll3sl6w3f2qvdqcevr7n</code>,
      or raise it on the
      <a href="https://github.com/benjamin-jarvie/custody-roundtable" rel="noopener">repo</a>.
      There is no deadline on any question, so there is no rush.
    </p>
  </div>`;
}

function nodeHtml(node, prev, next) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Node ${node.id}: ${escapeHtml(node.title)} | Custody Roundtable</title>
<meta name="description" content="${escapeHtml(node.question).slice(0, 150)}">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<div class="wrap">
  <a class="crumb" href="../index.html">&larr; The tree</a>

  <p class="eyebrow">
    <span>Node ${node.id}</span>
    <span>${escapeHtml(node.pillar)}</span>
    <span class="state-tag ${STATE[node.status] ? STATE[node.status].cls : ""}">${STATE[node.status] ? STATE[node.status].label : escapeHtml(node.status)}</span>
  </p>
  <h1>${escapeHtml(node.title)}</h1>

  <p class="question">${escapeHtml(node.question)}</p>

  ${node.premise ? `<p class="section">The premise this assumes</p>
  <div class="premise"><p>${escapeHtml(node.premise)}</p></div>` : ""}

  <p class="section">A position to test</p>
  <div class="framing"><p>${escapeHtml(node.framing)}</p></div>

  <p class="section">Branches</p>
  <p class="empty">None drafted yet. Branches are compiled from the answers below, and each one carries an "applies when" tag and the name of whoever argued for it.</p>

  <p class="section">Video answers</p>
  ${videoBlock(node)}

  <p class="section">Answer this question</p>
  <div class="comments-section">
    <p class="mic-note">Answer here, or copy the note id below and reply from the Nostr app you already use. Sign in with a browser extension on a computer, or a signer app on a phone. Your key never reaches this page. The thread opens on the core roundtable by default, and Everyone shows every reply. This question has no deadline.</p>
    <div
      data-roundtable-comments
      data-anchor="${escapeHtml(node.anchorEvent || "")}"
      data-nevent="${node.anchorEvent ? neventEncode(node.anchorEvent, node.relays) : ""}"
      data-note="${node.anchorEvent ? noteEncode(node.anchorEvent) : ""}"
      data-relays="${escapeHtml((node.relays || []).join(","))}"
      data-whitelist="../whitelist.json"
      data-avatars="../avatars/"></div>
    <script type="module" src="../comments.js"></script>
  </div>

  ${howToComment()}

  <nav class="page-nav">
    ${prev ? `<a href="${prev.id}-${prev.slug}.html">&larr; Node ${prev.id}</a>` : "<span></span>"}
    ${next ? `<a href="${next.id}-${next.slug}.html">Node ${next.id} &rarr;</a>` : "<span></span>"}
  </nav>

  <footer class="colophon">
    <span>Bitcoin Butlers</span>
    <a href="../index.html">The tree</a>
    <a href="https://github.com/benjamin-jarvie/custody-roundtable">Source</a>
  </footer>
</div>
</body>
</html>
`;
}

fs.mkdirSync(outDir, { recursive: true });
nodes.forEach((node, i) => {
  const prev = nodes[i - 1];
  const next = nodes[i + 1];
  const file = path.join(outDir, `${node.id}-${node.slug}.html`);
  fs.writeFileSync(file, nodeHtml(node, prev, next));
  console.log("wrote", file);
});
