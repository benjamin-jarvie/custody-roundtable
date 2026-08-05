# Node Backlog

Status values: `open` (not yet published), `active` (question live, collecting
replies), `contested` (branches drafted, still disputed), `resolved`
(branches stable for a week or more).

| # | Node | Pillar | Status |
|---|------|--------|--------|
| P | Premise: why self-custody at all (bearer asset, NYKNYC) | 0 (intro, not debated) | resolved |
| 1 | Self-custody vs. collaborative custody vs. exchange | A | active |
| 2 | Roll your own entropy? | A | drafted, queued behind node 1 |
| 3 | Verifying entropy mixing (XOR, cross-device) instead of trusting it | A | open |
| 4 | Seed format: BIP-39 vs. raw BIP-32 vs. Codex32 | A | open |
| 5 | Full backup material: derivation path, script type, master fingerprint | A.5 | open |
| 6 | Passphrase handling and separate storage | A.5 | open |
| 7 | Descriptor/policy backup: necessary, or reconstructable from seeds? (open question) | A.5 | open |
| 8 | Single-sig vs. multisig (the "you've already reinvented multisig" framing) | B | open |
| 9 | Single-vendor vs. multi-vendor multisig | B | open |
| 10 | Air-gapped signing and transport (QR/SD/USB) | B | open |
| 11 | Physical/geographic redundancy of backups | B | open |
| 12 | End-to-end verification + rehearsed cold recovery | B | open |
| 13 | Inheritance | C | open |
| 14 | Retirement/incapacity | C | open |
| 15 | Rotation/migration after suspected compromise or vendor discontinuation | C | open |
| 16 | UTXO management and privacy (coinjoin, PayJoin, labels) | D | open |
| S | Synthesis: named end-to-end paths for the eventual quiz | final | open |

Node 1 is live first per the weekly loop in `design.md`.
