// Scene copy is data. Visual and interaction changes never need to edit it.

export const SCRIPTS = {
  generation: {
    welcome: [
      "Every seed begins as a claim about randomness.",
      "Choose a format, then compare what the chip asks you to trust with what the dice let you witness."
    ],
    format: {
      bip39: "BIP-39 turns entropy into words with a checksum. The words are readable. The randomness behind them is still the ceremony.",
      bip32: "Raw BIP-32 keeps the seed as key material. No friendly words exist, so the generating machine owns the whole ceremony.",
      codex32: "Codex32 can be generated and checked by hand. The worksheet makes the arithmetic visible without trusting a device."
    },
    signers: {
      single: "One signer means one seed ceremony and one root of trust.",
      multi: "Three signers mean three separate ceremonies. Keep each honest on its own before you ask them to form a quorum."
    },
    vendors: {
      one: "The devices share one maker and one implementation. Their cases multiply. Their trust path does not.",
      multi: "Unrelated devices make one hidden implementation error less likely to touch every key."
    },
    vendorLocked: "Vendor diversity begins when more than one device signs. Choose multisig first.",
    device: [
      "The chip returns a seed instantly.",
      "You can test the checksum and reproduce every deterministic step after generation. You cannot prove that its original randomness was honest."
    ],
    dice: [
      "The dice make the entropy source visible.",
      "Record enough fair rolls, then let the deterministic conversion be reproduced independently. Entropy cannot be verified after the fact. It can only be sourced."
    ],
    object: {
      dice: "Physical entropy. Slow, observable, and only as fair as the dice and the way you roll them.",
      device: "A signing device can protect a seed well. Its random number generator still asks for trust at the first moment.",
      worksheet: "The Codex32 worksheet turns generation into arithmetic a person can inspect and repeat."
    }
  },
  inUse: {
    welcome: [
      "A seed at work should never leave its signer.",
      "Build the transaction outside, carry only the PSBT across the air gap, and make every screen earn your approval."
    ],
    format: {
      bip39: "BIP-39 describes how the signer began. During a spend, the private seed remains inside while the PSBT carries only what must be signed.",
      bip32: "Raw BIP-32 key material signs the same PSBT. The transport stays public. The key file must stay inside its boundary.",
      codex32: "Codex32 changes the backup ceremony. The signing boundary stays the same: the seed remains inside and the PSBT crosses."
    },
    signers: {
      single: "One signer checks and approves the whole spend. One screen is the final witness.",
      multi: "A quorum signs in sequence. Each device must inspect the same destination and amount before its signature joins the PSBT."
    },
    vendors: {
      one: "Three devices from one maker can enforce a quorum. One shared firmware mistake can still mislead all three screens.",
      multi: "Different makers inspect the same PSBT through unrelated code. No single company remains the only witness."
    },
    vendorLocked: "Vendor diversity becomes a real choice only when a quorum uses more than one signer.",
    transferStart: "The watch-only wallet builds a PSBT. It contains the transaction, never the private seed.",
    transferStep: count => "Signature " + count + " joins the PSBT. The private key never crosses the air gap.",
    transferDone: [
      "The quorum is complete. The signed transaction returns to the online wallet for broadcast.",
      "The QR carried public transaction data. The signer screens carried the judgment."
    ],
    object: {
      psbt: "A PSBT is a public envelope for a transaction and its signatures. Moving it is safe. Approving it blindly is not.",
      signer: "Read the destination and amount on the signer itself. The computer screen is a request, never the authority.",
      monitor: "The watch-only wallet can build and broadcast. It should not know any private seed."
    }
  },
  atRest: {
    welcome: [
      "Welcome to the vault. This is where your seed sleeps.",
      "Choose a setup, then try a recovery. I will tell you the truth about what survives."
    ],
    fmt: {
      bip39: "BIP-39. Twelve words on metal. The words restore only the simplest wallet unless the path, script type and fingerprint survive beside them.",
      bip32: "Raw BIP-32. No words exist. The backup is a file, and every unencrypted copy is a full spend key.",
      codex32: "Codex32. A checksummed string you can verify by hand, with no device trusted. The checksum protects the copy, not the context."
    },
    sig: {
      single: "One key, one plate. Whoever holds it holds everything. Protection and risk live in one object.",
      multi: "A quorum now guards the funds. Three plates must live in three different places. The gold plate is the descriptor. Remember it."
    },
    ven: {
      one: "All devices come from one maker. One firmware bug still touches every key.",
      multi: "Different makers protect each key. No single company remains in your trust path."
    },
    venLocked: "Vendor diversity only becomes a choice once more than one device signs. Choose multisig first.",
    plate: {
      seed: "A two-piece steel seed plate. Fire and flood are the easy failures. Missing path, script type, or fingerprint can still hide the wallet.",
      descriptor: "The descriptor holds every cosigner's public key, the quorum, and the paths. Without it, the seeds are perfect keys to a door nobody can find."
    },
    pass: {
      none: "No passphrase. The words alone are the whole secret.",
      butler: "A passphrase stands beside the words. It has no checksum. A typo opens a different, valid, empty wallet."
    },
    path: {
      std: "The standard path. Wallets agree to look here by convention.",
      alt: "A different derivation path. The same seed now points to a different neighborhood of addresses."
    },
    scr: {
      segwit: "Native SegWit. This is the script used by the funded addresses.",
      legacy: "Legacy is valid and older. It builds different addresses from the same keys."
    },
    recoverFunded: [
      "The wheel turns, the door opens, and the coin is there: 0.21 bitcoin. At $114,000 a coin, $23,940.",
      "Words, path, script, and passphrase all matched the funded wallet. That is the full recovery set."
    ],
    recoverNoSeed: [
      "The wheel spins and stops. The door refuses.",
      "The last word failed its checksum. Wallet software rejects the phrase before it can load any wallet.",
      "Tap the plate. The last word offers the 128 words that fit."
    ],
    recoverMultiFail: [
      "Three seeds are present and correct. The door still refuses.",
      "Multisig recovery needs the descriptor: every cosigner's xpub, the quorum, and the paths.",
      "Tap the gold plate to add it, then try again."
    ],
    recoverMultiOk: [
      "Seeds and descriptor together. Now the door opens.",
      "Multisig costs more plates, more ceremony, and one more thing that must survive. It removes every single point of failure."
    ]
  }
};

export function emptyWalletLines(state){
  let reason = "These are valid words for a wallet that has never held a coin.";
  if (state.pass && state.pass !== "none") {
    reason = "The passphrase changed the seed root. This valid wallet has never held a coin.";
  } else if (state.path !== "std") {
    reason = "The path points at different addresses. The funded coin remains somewhere this wallet will never look.";
  } else if (state.scr !== "segwit") {
    reason = "The script type builds different addresses from the same keys.";
  }
  return [
    "The door opens on an empty strongroom.",
    reason,
    "Nothing was destroyed. Every part of the recovery set must survive together."
  ];
}
