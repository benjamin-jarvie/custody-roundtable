// Custody Roundtable comment thread.
//
// Reads kind-1 replies to a node's anchor event straight from the relays over
// WebSocket, renders them, and signs new replies with a NIP-07 extension.
// No build step and no third-party bundle, so the whitelist filter runs inside
// our own render loop instead of scraping someone else's DOM.
//
// Two views:
//   "roundtable" (default) shows only pubkeys listed in whitelist.json.
//   "everyone"             shows every reply the relays return.
// Both views read the same events. Filtering is a display choice, not
// moderation. Nothing is hidden from the network.

const KIND_TEXT_NOTE = 1;
const REPLY_LIMIT = 500;
const EOSE_TIMEOUT_MS = 6000;

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
    this.relays = config.relays || [];
    this.whitelist = config.whitelist; // Map of hex pubkey to display name
    this.mode = "roundtable"; // the default view
    this.events = new Map(); // event id to event
    this.sockets = [];
    this.loading = true;

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

  buildComposer() {
    const form = el("form", "comment-form");
    const box = el("textarea", "comment-input");
    box.rows = 4;
    box.placeholder = "Reply with your Nostr key…";
    box.setAttribute("aria-label", "Your reply");

    const send = el("button", "comment-send", "Sign and post");
    send.type = "submit";

    const note = el("p", "comment-note");
    note.textContent =
      "Replies are signed with your own Nostr key through a NIP-07 extension such as Alby or nos2x. Anyone can post. The Roundtable only view changes what this page shows, not who may reply.";

    form.append(box, send, note);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = box.value.trim();
      if (!content) return;
      if (!window.nostr) {
        note.textContent = "No Nostr extension found. Install a NIP-07 extension such as Alby or nos2x to sign a reply.";
        return;
      }
      if (!this.anchor) {
        note.textContent = "This node's thread is not open yet.";
        return;
      }
      send.disabled = true;
      note.textContent = "Waiting for your extension to sign…";
      try {
        const signed = await window.nostr.signEvent({
          kind: KIND_TEXT_NOTE,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["e", this.anchor, this.relays[0] || "", "root"]],
          content,
        });
        this.publish(signed);
        box.value = "";
        note.textContent = "Posted. It appears once a relay echoes it back.";
      } catch (err) {
        console.warn("roundtable: signing failed", err);
        note.textContent = "Signing was cancelled or failed. Nothing was posted.";
      } finally {
        send.disabled = false;
      }
    });

    return form;
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
  const thread = new Thread(mount, { anchor, relays, whitelist });
  thread.connect();
  return thread;
}

// Auto-mount when the page provides a target.
if (typeof document !== "undefined") {
  const target = document.querySelector("[data-roundtable-comments]");
  // Exposed so the thread can be inspected and exercised from the console.
  if (target) mountComments(target).then((t) => (window.roundtableThread = t));
}
