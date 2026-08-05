// Custody Roundtable comment thread.
//
// Reads kind-1 replies to a node's anchor event straight from the relays over
// WebSocket and renders them, so the whitelist filter runs inside our own
// render loop instead of scraping someone else's DOM.
//
// Reading needs nothing but this file. Signing a reply lazily loads
// vendor/nostr-tools.js, which is committed here rather than pulled from a
// CDN, so the page depends on no third party at runtime. A visitor who only
// reads never downloads it.
//
// Two views:
//   "roundtable" (default) shows only pubkeys listed in whitelist.json.
//   "everyone"             shows every reply the relays return.
// Both views read the same events. Filtering is a display choice, not
// moderation. Nothing is hidden from the network.

const KIND_TEXT_NOTE = 1;
const REPLY_LIMIT = 500;
const EOSE_TIMEOUT_MS = 6000;
const BUNKER_STORAGE_KEY = "custody-roundtable:bunker";
const DEFAULT_NOTE =
  "Replies are signed with your own Nostr key, so nobody can edit or delete what you wrote, including us. Anyone may reply. The Roundtable only view changes what this page shows first, not who may post.";

// --- bech32 (npub) decoding -------------------------------------------------
// Kept inline so the page has no external dependency. Decodes npub1... to the
// 32-byte hex pubkey the relays use.

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
    if (value < 0 || value >> from !== 0) return null;
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (to - bits)) & maxv);
  } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
    return null;
  }
  return out;
}

// Returns the 64-char hex pubkey, or null if the string is not a valid npub.
function npubToHex(npub) {
  if (typeof npub !== "string") return null;
  const s = npub.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(s)) return s; // already a raw hex pubkey
  const sep = s.lastIndexOf("1");
  if (sep < 1 || sep + 7 > s.length) return null;
  const hrp = s.slice(0, sep);
  if (hrp !== "npub") return null;
  const data = [];
  for (const ch of s.slice(sep + 1)) {
    const idx = BECH32_CHARSET.indexOf(ch);
    if (idx === -1) return null;
    data.push(idx);
  }
  if (bech32Polymod(bech32HrpExpand(hrp).concat(data)) !== 1) return null;
  const bytes = convertBits(data.slice(0, -6), 5, 8, false);
  if (!bytes || bytes.length !== 32) return null;
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- helpers ----------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent, never innerHTML
  return node;
}

function shortKey(hex) {
  return hex.slice(0, 8) + "…" + hex.slice(-4);
}

function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/../g).map((b) => parseInt(b, 16)));
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timeAgo(unixSeconds) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  const steps = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [size, label] of steps) {
    if (seconds >= size) return Math.floor(seconds / size) + label + " ago";
  }
  return "just now";
}

// --- the thread -------------------------------------------------------------

class Thread {
  constructor(mount, config) {
    this.mount = mount;
    this.anchor = config.anchor;
    this.nevent = config.nevent || ""; // bech32 form, built into the page
    this.relays = config.relays || [];
    this.whitelist = config.whitelist; // Map of hex pubkey to display name
    this.mode = "roundtable"; // the default view
    this.events = new Map(); // event id to event
    this.sockets = [];
    this.loading = true;

    // Signing state. Null until a visitor connects a key.
    this.signer = null;
    this.signerPubkey = null;
    this.signerHow = null;
    this.toolsPromise = null;
    this.bunkerRow = null;

    this.listEl = el("div", "comment-list");
    this.statusEl = el("p", "comment-status");
    this.mount.append(this.buildToggle(), this.statusEl, this.listEl, this.buildComposer());
    this.render();
  }

  buildToggle() {
    const bar = el("div", "comment-filter");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter comments");

    const make = (mode, label) => {
      const b = el("button", "filter-btn", label);
      b.type = "button";
      b.dataset.mode = mode;
      b.setAttribute("aria-pressed", String(this.mode === mode));
      b.addEventListener("click", () => this.setMode(mode));
      return b;
    };

    this.roundtableBtn = make("roundtable", "Roundtable only");
    this.everyoneBtn = make("everyone", "Everyone");
    bar.append(this.roundtableBtn, this.everyoneBtn);
    return bar;
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.roundtableBtn.setAttribute("aria-pressed", String(mode === "roundtable"));
    this.everyoneBtn.setAttribute("aria-pressed", String(mode === "everyone"));
    this.render();
  }

  visibleEvents() {
    const all = [...this.events.values()].sort((a, b) => a.created_at - b.created_at);
    if (this.mode === "everyone") return all;
    return all.filter((e) => this.whitelist.has(e.pubkey));
  }

  render() {
    this.listEl.replaceChildren();
    const visible = this.visibleEvents();

    for (const ev of visible) {
      const item = el("article", "comment");
      const name = this.whitelist.get(ev.pubkey);
      const head = el("div", "comment-head");
      head.append(el("span", "comment-author", name || shortKey(ev.pubkey)));
      if (name) head.append(el("span", "roundtable-badge", "roundtable"));
      head.append(el("time", "comment-time", timeAgo(ev.created_at)));
      item.append(head, el("div", "comment-body", ev.content));
      this.listEl.append(item);
    }

    this.statusEl.textContent = this.statusText(visible.length);
  }

  statusText(shown) {
    if (!this.anchor) {
      return "This node's thread is not open yet. The anchor event is pending.";
    }
    if (this.loading) return "Loading comments…";
    const total = this.events.size;
    if (this.mode === "roundtable") {
      if (this.whitelist.size === 0) {
        return "No roundtable pubkeys are configured yet, so this view is empty. Switch to Everyone to read all " + total + " comments.";
      }
      if (shown === 0 && total > 0) {
        return "No roundtable replies yet. Switch to Everyone to read all " + total + " comments.";
      }
      if (shown === 0) return "No comments yet.";
      return "Showing " + shown + " of " + total + " comments, from the core roundtable only.";
    }
    if (total === 0) return "No comments yet.";
    return "Showing all " + total + " comments, roundtable and public.";
  }

  connect() {
    if (!this.anchor || this.relays.length === 0) {
      this.loading = false;
      this.render();
      return;
    }
    const req = JSON.stringify([
      "REQ",
      "roundtable",
      { kinds: [KIND_TEXT_NOTE], "#e": [this.anchor], limit: REPLY_LIMIT },
    ]);

    for (const url of this.relays) {
      let socket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        console.warn("roundtable: cannot open relay", url, err);
        continue;
      }
      this.sockets.push(socket);
      socket.addEventListener("open", () => socket.send(req));
      socket.addEventListener("message", (msg) => this.onRelayMessage(msg.data));
      socket.addEventListener("error", () => console.warn("roundtable: relay error", url));
    }

    // Relays that never send EOSE must not leave the page stuck on "Loading".
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.render();
      }
    }, EOSE_TIMEOUT_MS);
  }

  onRelayMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return;
    }
    if (msg[0] === "EVENT" && msg[2] && !this.events.has(msg[2].id)) {
      this.events.set(msg[2].id, msg[2]);
      this.render();
    } else if (msg[0] === "EOSE") {
      this.loading = false;
      this.render();
    }
  }

  // --- signing ---------------------------------------------------------------
  // Two ways in. A NIP-07 browser extension (Alby, nos2x) covers desktop. A
  // NIP-46 remote signer (Amber, nsec.app, any bunker) covers phones, where no
  // extension exists. Either way the private key never reaches this page.

  async loadNostrTools() {
    if (!this.toolsPromise) this.toolsPromise = import("../vendor/nostr-tools.js");
    return this.toolsPromise;
  }

  setSigner(signer, pubkey, how) {
    this.signer = signer;
    this.signerPubkey = pubkey;
    this.signerHow = how;
    this.renderSignerBar();
  }

  clearSigner() {
    if (this.signer && this.signerHow === "bunker") {
      try { this.signer.close(); } catch (err) { /* already gone */ }
    }
    this.signer = null;
    this.signerPubkey = null;
    this.signerHow = null;
    try { localStorage.removeItem(BUNKER_STORAGE_KEY); } catch (err) { /* private mode */ }
    this.setNote(DEFAULT_NOTE);
    this.renderSignerBar();
  }

  signerLabel() {
    const name = this.whitelist.get(this.signerPubkey);
    return name || shortKey(this.signerPubkey);
  }

  renderSignerBar() {
    this.signerBar.replaceChildren();

    if (this.signerPubkey) {
      const who = el("span", "signer-who", "Signing as " + this.signerLabel());
      const off = el("button", "signer-link", "disconnect");
      off.type = "button";
      off.addEventListener("click", () => this.clearSigner());
      this.signerBar.append(who, off, this.helpLink("Having issues commenting?"));
      this.sendBtn.disabled = false;
      return;
    }

    this.sendBtn.disabled = true;
    this.signerBar.append(el("span", "signer-who", "To reply, connect your key:"));

    if (window.nostr) {
      const ext = el("button", "signer-btn", "Browser extension");
      ext.type = "button";
      ext.addEventListener("click", () => this.connectExtension());
      this.signerBar.append(ext);
    }

    const remote = el("button", "signer-btn", "Remote signer");
    remote.type = "button";
    remote.addEventListener("click", () => this.promptBunker());
    this.signerBar.append(remote, this.helpLink("Having issues commenting?"));
  }

  // Points at the how-to section further down the same page, so nobody loses
  // a half-written reply by navigating away.
  helpLink(text) {
    const link = el("a", "help-link", text);
    link.href = "#how-to-comment";
    return link;
  }

  async connectExtension() {
    this.setNote("Waiting for your extension…");
    try {
      const pubkey = await window.nostr.getPublicKey();
      this.setSigner(window.nostr, pubkey, "extension");
      this.setNote("Connected. Write your reply.");
    } catch (err) {
      console.warn("roundtable: extension refused", err);
      this.setNote("Your extension refused the connection. Nothing was shared.");
    }
  }

  // Inline input rather than window.prompt, which blocks the page.
  promptBunker() {
    if (this.bunkerRow) return this.bunkerRow.querySelector("input").focus();
    const row = el("div", "bunker-row");
    const input = el("input", "bunker-input");
    input.type = "text";
    input.placeholder = "bunker://…";
    input.setAttribute("aria-label", "Remote signer connection string");
    const go = el("button", "signer-btn", "Connect");
    go.type = "button";
    const help = el("p", "comment-note");
    help.textContent =
      "Paste the bunker string from your signer app (Amber on Android, nsec.app, or any NIP-46 signer). Your key stays in that app and never reaches this page. The app asks you to approve each signature.";
    row.append(input, go, help);
    go.addEventListener("click", () => this.connectBunker(input.value.trim()));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this.connectBunker(input.value.trim()); }
    });
    this.bunkerRow = row;
    this.signerBar.after(row);
    input.focus();
  }

  async connectBunker(uri, savedClientSk) {
    if (!uri) return this.setNote("Paste a bunker string first.");
    this.setNote("Connecting to your signer…");
    try {
      const tools = await this.loadNostrTools();
      const pointer = await tools.parseBunkerInput(uri);
      if (!pointer) throw new Error("not a bunker string");
      const clientSk = savedClientSk ? hexToBytes(savedClientSk) : tools.generateSecretKey();
      const signer = tools.BunkerSigner.fromBunker(clientSk, pointer, {
        onauth: (url) => {
          const link = el("a", "signer-link", "approve in your signer");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener";
          this.noteEl.replaceChildren(document.createTextNode("Your signer needs approval: "), link);
        },
      });
      await signer.connect();
      const pubkey = await signer.getPublicKey();
      this.setSigner(signer, pubkey, "bunker");
      try {
        localStorage.setItem(BUNKER_STORAGE_KEY, JSON.stringify({ uri, clientSk: bytesToHex(clientSk) }));
      } catch (err) { /* private mode, connection just will not persist */ }
      if (this.bunkerRow) { this.bunkerRow.remove(); this.bunkerRow = null; }
      this.setNote("Connected. Write your reply.");
    } catch (err) {
      console.warn("roundtable: bunker connect failed", err);
      this.setNote("Could not reach that signer. Check the bunker string and try again.");
    }
  }

  async restoreBunker() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(BUNKER_STORAGE_KEY) || "null");
    } catch (err) {
      return;
    }
    if (saved && saved.uri) await this.connectBunker(saved.uri, saved.clientSk);
  }

  setNote(text) {
    this.noteEl.textContent = text;
  }

  buildComposer() {
    const form = el("form", "comment-form");

    this.signerBar = el("div", "signer-bar");

    const box = el("textarea", "comment-input");
    box.rows = 4;
    box.placeholder = "Write your reply…";
    box.setAttribute("aria-label", "Your reply");

    this.sendBtn = el("button", "comment-send", "Sign and post");
    this.sendBtn.type = "submit";

    this.noteEl = el("p", "comment-note", DEFAULT_NOTE);

    form.append(this.signerBar, box, this.sendBtn, this.noteEl, this.buildDeepLink());
    this.renderSignerBar();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = box.value.trim();
      if (!content) return;
      if (!this.signer) return this.setNote("Connect your key first.");
      if (!this.anchor) return this.setNote("This node's thread is not open yet.");

      this.sendBtn.disabled = true;
      this.setNote(this.signerHow === "bunker" ? "Approve the signature in your signer app…" : "Waiting for your extension to sign…");
      try {
        const signed = await this.signer.signEvent({
          kind: KIND_TEXT_NOTE,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", this.anchor, this.relays[0] || "", "root"]],
          content,
        });
        this.publish(signed);
        box.value = "";
        this.setNote("Posted. It appears once a relay echoes it back.");
      } catch (err) {
        console.warn("roundtable: signing failed", err);
        this.setNote("Signing was cancelled or failed. Nothing was posted.");
      } finally {
        this.sendBtn.disabled = false;
      }
    });

    return form;
  }

  // For anyone who would rather answer from the client they already use. One
  // tap opens the thread in their app, with no ids to copy.
  buildDeepLink() {
    const wrap = el("div", "deep-link-row");
    if (!this.anchor || !this.nevent) return wrap;
    const link = el("a", "deep-link", "Reply in your Nostr app");
    link.href = "nostr:" + this.nevent; // built into the page, no library needed
    wrap.append(link);
    return wrap;
  }

  publish(signedEvent) {
    const frame = JSON.stringify(["EVENT", signedEvent]);
    for (const socket of this.sockets) {
      if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    }
  }
}

// --- boot -------------------------------------------------------------------

async function loadWhitelist(url) {
  const map = new Map();
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    for (const group of ["roundtable", "editor"]) {
      for (const person of data[group] || []) {
        const hex = npubToHex(person.npub || "");
        if (hex) map.set(hex, person.name);
        else if (person.npub) console.warn("roundtable: invalid npub for", person.name);
      }
    }
  } catch (err) {
    console.warn("roundtable: whitelist unavailable, roundtable view will be empty", err);
  }
  return map;
}

export async function mountComments(mount) {
  const whitelist = await loadWhitelist(mount.dataset.whitelist || "../whitelist.json");
  const relays = (mount.dataset.relays || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const anchor = mount.dataset.anchor || "";
  const nevent = mount.dataset.nevent || "";
  const thread = new Thread(mount, { anchor, nevent, relays, whitelist });
  thread.connect();
  thread.restoreBunker(); // reconnect a signer the visitor already approved
  return thread;
}

// Auto-mount when the page provides a target.
if (typeof document !== "undefined") {
  const target = document.querySelector("[data-roundtable-comments]");
  // Exposed so the thread can be inspected and exercised from the console.
  if (target) mountComments(target).then((t) => (window.roundtableThread = t));
}
