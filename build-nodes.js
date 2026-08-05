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
    <p class="mic-note">Comments are signed with your own Nostr key through a NIP-07 extension. The thread opens on the core roundtable by default. Switch to Everyone to read every reply. Voice-to-text input is planned and is not live yet, so type for now.</p>
    <div
      data-roundtable-comments
      data-anchor="${escapeHtml(node.anchorEvent || "")}"
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
