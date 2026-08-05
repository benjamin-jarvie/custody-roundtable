# Don't Trust, Verify — draft, built from Jimbo's framing

Status: DRAFT, NOT CLEARED FOR PUBLICATION. Compiled from Jimbo's (Seed
Picker Solitaire) private written comments to Kiwi, supplied 2026-08-04. This
is his framing, not Bitcoin Butlers' settled position, and it has not been
confirmed accurate or approved for republication by him. Per the attribution
gate in `design.md`, this file must not be published or posted anywhere
public — including the roundtable's own repo — until Jimbo has explicitly
signed off on the compiled text. It is the seed material for Pillar A.5,
Pillar A/nodes 2-3, and Pillar B/node 12 of the custody roundtable.

## The actual problem is knowledge, not difficulty

Self-custody's real barrier is not that it's hard. It's that the instructions
are not widely known, and the perceived difficulty is much higher than the
actual difficulty:

- Bitcoin self-custody: actual difficulty medium, perceived difficulty high.
- Traditional banking: actual difficulty medium, perceived difficulty low.

Bitcoin suffers from an experience gap, not a competence gap. That gap closes
with better UX and more familiarity — but closing it does not mean outsourcing
the judgment. If people learn to just "trust hardware," they've abdicated
sovereignty and reintroduced the custodian they were trying to remove.

In Bitcoin, ownership is knowledge. Keys are information. You cannot stay
ignorant and also own Bitcoin — the two are incompatible. That's a cost, and
only people who value sovereignty enough will pay it. Better UX lowers that
cost; better familiarity lowers how expensive it *feels*.

## Generating your own entropy

Regular people can self-custody safely, and the actual steps are:

1. Generate your own seed material — doable in about ten minutes with a deck
   of playing cards.
2. Restore your seed onto a signing device.
3. Use Sparrow (or similar) to make a 2-of-2 with your signing device and a
   software seed.

This is comparable in real difficulty to opening a bank account once you
count every step a bank account actually requires — it's the perceived
difficulty that's out of proportion.

Card shuffling is a widespread, learnable skill using materials everyone
already has, and the procedure produces more than enough entropy in a few
minutes — this is the reasoning behind SeedPicker Solitaire.

## Mixing entropy sources: what you gain, and what you still can't know

Mixing two entropy sources (e.g. dice rolls and a hardware TRNG) generally
increases the entropy of the output. But mixing introduces a new problem: you
have to trust the machine doing the mixing. If there's a bug — or a
deliberate flaw — in the mixing code, the output might not actually contain
your entropy at all, and you have no way to know.

The fix is not to trust the mixing, but to verify it independently:

1. Roll dice.
2. Turn the rolls into bits (standard method: SHA256 of the string
   representation).
3. A TRNG produces its own string of bits.
4. XOR the two together.
5. Further processing: checksum, XFP, XPUB, addresses.

To verify, without trusting either device:

1. Import your dice rolls onto a second device.
2. Re-run the dice-to-bits SHA256 independently.
3. Import the TRNG bits.
4. XOR them independently.
5. Generate checksum, XFP, XPUB, addresses independently.
6. Confirm the two devices agree.

This is a 12-step process across two vendors' devices. It doesn't just
increase confidence — it unambiguously asserts that both devices produced the
same seed from the same inputs.

## Why "probably not lying" isn't the same as "provably not lying"

There are two different kinds of confidence here, and it matters which one
you're claiming:

- **Deterministic computation** (hashing, XOR, checksum derivation) can be
  replicated on a second device. If two independent vendors compute the same
  result from the same inputs, that's proof, not probability.
- **Non-deterministic output** (an actual random draw) cannot be replicated
  or proven after the fact — only sourced by you in the first place.

Testing devices with throwaway seeds tells you a device wasn't lying *during
the test*. That raises confidence, but it isn't proof for your actual seed.
Whether "probably not lying" is good enough is a personal standard — the
standard argued for here is "provably not lying" about anything that matters.

Concretely, the goal is to know, not estimate, three things:

- Your seed yields your XPUB.
- Your XPUB yields your addresses.
- You can sign for those addresses.

Reproducing these computations across multiple vendors' devices, for the live
seed material, is the mechanism for knowing rather than trusting.

For the entropy itself, there's no equivalent trick — the only way to be sure
no one else has your seed is to generate it yourself. Combining your own
entropy with another source via XOR is fine, but that combination step is a
deterministic computation, and deterministic computations should be
replicated on a second vendor's device.

## What actually has to be on the backup

*Not from Jimbo's text — added by Bitcoin Butlers 2026-08-04 to close a real
gap. Everything above assumes the seed words themselves are the whole backup.
They are not, for anything beyond the simplest single-sig wallet.*

A complete backup, per key, needs four things, not one:

- The seed words.
- The derivation path (e.g. `m/48'/0'/0'/2'` for a multisig P2WSH cosigner).
- The script type (single-sig vs. multisig, segwit vs. taproot).
- The master fingerprint (root XFP).

Miss any of the three beyond the words themselves, and restoring into
different software can derive a wallet that looks completely valid — correct
checksum, correct format — and shows a zero balance, because it derived the
wrong addresses from the right words. This is a silent failure with no error
message.

If a passphrase is in use, it is a separate secret, not an extension of the
seed. It has no checksum, so a single mistyped character produces a different,
valid-looking, empty wallet with no warning. Because of that, it needs more
care than the seed, not less — and it must be recorded somewhere other than
next to the seed. Storing both together defeats the reason for using a
passphrase at all: it stops being a second factor and becomes one factor
split across two pieces of paper.

**Open question, not a settled answer:** for a multisig setup, does the
wallet descriptor (script type, every cosigner's derivation path and xpub and
fingerprint, the quorum) need its own durable backup, engraved on metal like
a seed — or is it recoverable from the seeds alone? In principle a descriptor
can be engraved just like a seed. In practice most people will keep it in a
wallet file, or a cloud backup, instead. Reconstructing it from seeds alone
requires *every* cosigner's seed present — a strictly harder bar than the
quorum needed to spend — plus separately remembering the script type, every
derivation path, and the quorum size, none of which are stored in the seed
data itself. Whether that residual, unwritten knowledge is small enough to
just carry in memory, or is itself something that needs a durable backup, is
open — this needs the roundtable's answer, not an assumed one.

## A practical starting setup

A 2-of-2 where you hand-deal one seed into hardware and let a laptop generate
a separate software seed is a reasonable complexity/security tradeoff:

- Use Sparrow (or similar) to build the 2-of-2, with one seed embedded in the
  wallet.
- Save the wallet file with a password, and write the password down if you
  want a durable copy of it.
- Make a copy of the wallet file and store it elsewhere.

The biggest risk in this setup is losing both seeds — make copies as needed.
Treat it operationally like single-sig: it just takes two sets of 24 words
instead of one.

## On per-word shuffling versus one shuffle for the whole draw

A reasonable question: if you reshuffle between every word pick, doesn't that
draw from a larger effective pool each time?

In principle, yes — but it breaks down in practice for two reasons. First,
nobody actually wants to shuffle a dozen times between each of 23 word picks;
that's a lot of mindless repetition, and fatigue increases the chance of a
procedural mistake. Second, if a deck has any bias, shuffling once and drawing
straight through confines that bias to the first word or two — a bias that
can only ever affect the start of the sequence. Reshuffling before every pick
reintroduces that same bias fresh at every single word, so it degrades every
pick instead of just the first ones.

In reality the two approaches likely produce similar distributions, and both
sit comfortably above the 128-bit minimum threshold — so neither one makes an
attacker's job meaningfully easier or harder. A purist position holds that
each word needs an independent random sample; the position argued for here
weighs the total system, including the likelihood of human error from
excessive repetition.

## You've probably already reinvented multisig

Bitcoiners regularly criticize shitcoiners for reinventing Bitcoin's own
features badly. The same pattern shows up in personal setups:

- "I'll make a copy of my seed" — that's 1-of-2 multisig.
- "I'll transfer my seed on death" — Bitcoin already is the world's premier
  value-transfer system; use it as one.
- "I'll split my seed with SeedXOR" — that's 2-of-2 multisig.
- "I'll keep a long passphrase separate from my seed" — also 2-of-2.
- "I'll store an encrypted backup" — also 2-of-2.

The redundancy people build for themselves informally is often already a form
of multisig, just undesigned and unexamined. The question worth asking isn't
whether to add redundancy — most people already have some — it's whether to
do it deliberately, with a scheme built for the purpose.

## On collaborative custody

Collaborative custody is framed here as abdication-as-a-service: in
civilized life, ownership is generally what the law allows, and rights are
contingent on what the state licenses you to do. Freedom means taking control
*and* the responsibility that comes with it. The claim is that most people
say they want freedom but actually want license — permission without the
responsibility that self-custody requires.

This is Jimbo's stated position and is explicitly a live question for the
roundtable (Pillar A, node 1), not the article's settled conclusion.
