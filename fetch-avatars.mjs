#!/usr/bin/env node
// Fetches each whitelisted person's profile picture once and stores it under
// avatars/, then records the filename in whitelist.json.
//
// Why copy instead of hotlink: the avatars in people's kind-0 profiles live on
// third parties, currently m.primal.net, image.nostr.build and pbs.twimg.com.
// Pointing at those would hand every visitor's IP address to Primal,
// nostr.build and X. This is a page arguing against trusting third parties, so
// it serves its own images.
//
// Run it by hand when someone joins the whitelist or changes their picture:
//   node fetch-avatars.mjs
//
// Needs macOS `sips` for the resize, which is fine because this is a
// maintenance script that only the editor runs. Nothing at runtime needs it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const dir = path.dirname(fileURLToPath(import.meta.url));
const nostr = await import(path.join(dir, "vendor", "nostr-tools.js"));

const RELAYS = ["wss://relay.ditto.pub", "wss://nos.lol", "wss://relay.primal.net"];
const SIZE = 96; // rendered at 28px, so this stays sharp on a retina screen
const avatarDir = path.join(dir, "avatars");
const whitelistPath = path.join(dir, "whitelist.json");

const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));
const people = [...whitelist.roundtable, ...whitelist.editor].filter((p) => p.npub);

if (people.length === 0) {
  console.log("No npubs in whitelist.json yet. Nothing to fetch.");
  process.exit(0);
}

const byPubkey = new Map();
for (const person of people) {
  try {
    const { type, data } = nostr.decode(person.npub);
    if (type !== "npub") throw new Error("not an npub");
    byPubkey.set(data, person);
  } catch (err) {
    console.warn("skipping", person.name, "-", err.message);
  }
}

function query(url, filter) {
  return new Promise((resolve) => {
    const found = [];
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      return resolve(found);
    }
    const done = () => { try { ws.close(); } catch {} resolve(found); };
    const timer = setTimeout(done, 8000);
    ws.onopen = () => ws.send(JSON.stringify(["REQ", "profiles", filter]));
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg[0] === "EVENT") found.push(msg[2]);
      else if (msg[0] === "EOSE") { clearTimeout(timer); done(); }
    };
    ws.onerror = () => { clearTimeout(timer); done(); };
  });
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Newest kind-0 wins, across every relay we ask.
const newest = new Map();
for (const relay of RELAYS) {
  for (const ev of await query(relay, { kinds: [0], authors: [...byPubkey.keys()] })) {
    const prev = newest.get(ev.pubkey);
    if (!prev || ev.created_at > prev.created_at) newest.set(ev.pubkey, ev);
  }
}

fs.mkdirSync(avatarDir, { recursive: true });
let changed = false;

for (const [pubkey, person] of byPubkey) {
  const ev = newest.get(pubkey);
  if (!ev) {
    console.log(person.name.padEnd(32), "no profile found on any relay");
    continue;
  }
  let picture;
  try {
    picture = JSON.parse(ev.content).picture;
  } catch (err) {
    picture = null;
  }
  if (!picture) {
    console.log(person.name.padEnd(32), "profile has no picture");
    continue;
  }

  const slug = slugify(person.name);
  const file = slug + ".jpg";
  const target = path.join(avatarDir, file);
  const tmp = path.join(avatarDir, slug + ".tmp");

  try {
    const res = await fetch(picture, { redirect: "follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    // Square crop to the middle, then scale down, then re-encode as jpeg.
    execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(SIZE), tmp, "--out", target], {
      stdio: "ignore",
    });
    fs.unlinkSync(tmp);
    const kb = (fs.statSync(target).size / 1024).toFixed(1);
    console.log(person.name.padEnd(32), file, kb + "kb", "from", new URL(picture).host);
    if (person.avatar !== file) { person.avatar = file; changed = true; }
  } catch (err) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.warn(person.name.padEnd(32), "failed:", err.message);
  }
}

if (changed) {
  fs.writeFileSync(whitelistPath, JSON.stringify(whitelist, null, 2) + "\n");
  console.log("\nwhitelist.json updated");
} else {
  console.log("\nwhitelist.json unchanged");
}
process.exit(0);
