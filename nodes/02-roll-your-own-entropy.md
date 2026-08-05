# Node 2: Should you roll your own entropy?

Status: open (queued behind node 1)

## The question

A hardware device's TRNG can generate a seed for you in seconds. Rolling your
own entropy (dice, shuffled cards) takes longer and requires you to trust
your own procedure instead of a chip. What does rolling your own actually
buy you, and what does skipping it cost you?

Framing to test, not to assume: for the entropy step specifically, there's no
way to verify a non-deterministic output after the fact — only to control its
source in the first place. If that's right, generating it yourself may be the
only point in the whole setup where "verify, don't trust" isn't actually
possible, and controlling the source is the only lever available. Is that
framing correct, or is there a way to gain assurance about a device's TRNG
that doesn't reduce to trust?

## Branches

*(To be filled in from replies. None drafted yet.)*
