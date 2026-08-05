#!/usr/bin/env node
// Generates nodes/<id>.html from nodes.json. Re-run after editing nodes.json
// or adding a new weekly node. No dependencies, no build step beyond this.
const fs = require("fs");
const path = require("path");

const nodes = JSON.parse(fs.readFileSync(path.join(__dirname, "nodes.json"), "utf8"));
const outDir = path.join(__dirname, "nodes");

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
  <nav class="breadcrumb"><a href="../index.html">&larr; Custody Roundtable tree</a></nav>
  <p><span class="status-pill ${node.status}">${node.status}</span> &nbsp; <span style="color:var(--fg-muted)">${escapeHtml(node.pillar)}</span></p>
  <h1>Node ${node.id}: ${escapeHtml(node.title)}</h1>

  ${node.premise ? `<h2>Premise</h2><p>${escapeHtml(node.premise)}</p>` : ""}

  <h2>The question</h2>
  <p>${escapeHtml(node.question)}</p>
  <p>${escapeHtml(node.framing)}</p>

  <h2>Branches</h2>
  <p style="color:var(--fg-muted)">To be filled in from replies. Each branch gets an "applies when" tag and attribution. See the fragmentation policy in <code>design.md</code>. None drafted yet.</p>

  <h2>Video answers</h2>
  ${videoBlock(node)}

  <h2>Discuss</h2>
  <div class="comments-section">
    <p class="mic-note">Answer here. Sign with a browser extension (Alby, nos2x) on a computer, or a remote signer (Amber, nsec.app) on a phone. Your key never reaches this page. The thread opens on the core roundtable by default, and Everyone shows every reply. This question has no deadline.</p>
    <div
      data-roundtable-comments
      data-anchor="${escapeHtml(node.anchorEvent || "")}"
      data-nevent="${node.anchorEvent ? neventEncode(node.anchorEvent, node.relays) : ""}"
      data-relays="${escapeHtml((node.relays || []).join(","))}"
      data-whitelist="../whitelist.json"></div>
    <script type="module" src="../comments.js"></script>
  </div>

  <footer>
    ${prev ? `<a href="${prev.id}-${prev.slug}.html">&larr; Node ${prev.id}</a>` : ""}
    ${prev && next ? " &nbsp;·&nbsp; " : ""}
    ${next ? `<a href="${next.id}-${next.slug}.html">Node ${next.id} &rarr;</a>` : ""}
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
