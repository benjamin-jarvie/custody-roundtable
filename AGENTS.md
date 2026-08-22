# Agent instructions, custody-roundtable

Work happens on branch `vault-v1`, in `vault/`.

The master spec is OUTSIDE this repo:
`~/BitcoinButlers/Website-frontend/docs/wayfinder/self-custody-guide/spec.md`
Read it before any change. Sections 2 (locked decisions), 9 (tux and
trays), 10 (cinematography), 11 (the recovery set) bind every scene.
Section 12 (the Journey: one room, ten stations) is the current build
order: start at its "Codex: build order" list, item by item. Read the
"Section 12 amendments" block too: four entropy tools (dice, playing
cards, chip, Codex32 worksheet), the seed paper is edited ON the paper
(diegetic, no floating form), and the whole ceremony lives on one desk
with named zones and visible object handoffs. Flow first, polish after. Third-pass amendment: this is a
VISUALIZATION, not a simulator. No rolling/dealing animations; one
button per entropy tool that instantly writes real random words +
checksum onto the paper. No interactive Codex32 worksheet. No xpub
visual, the Butler narrates it. Keep interaction only where the
interaction is the lesson (paper editing, checksum fits, passphrase
fingerprint, recovery drill, door verdict).

Rules that have bitten us already:
- No em dashes, no "not X, it's Y". Kiwi is editor of record.
- No runtime CDN, no trackers. Vendor everything under vault/vendor/.
- Test interactions with real pointer events, not element.click().
- One writer at a time: commit and push small, pull before you start.
- Do not merge vault-v1 to main. Kiwi merges.
