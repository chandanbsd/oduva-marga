# Project instructions for Claude Code

## Keeping the coding standards doc current

This repo has a living coding standards doc at
[`CODING_STANDARDS.md`](CODING_STANDARDS.md). It's the concrete, per-module
companion to the constitution's Principle V (Code Quality & Consistency) —
the constitution says *what* is required (e.g. constructor injection,
strict TypeScript, package-by-feature); `CODING_STANDARDS.md` says exactly
which tools, flags, and naming conventions currently implement that in this
repo, verified against the real config files rather than assumed.

**Any time you add or change a linter/formatter/static-analysis config,
introduce a new module, or establish a naming/style convention not already
documented there, update `CODING_STANDARDS.md` before you consider the task
done.** If you close one of the items in its "Known gaps vs. the
constitution" section (e.g. wiring lint into CI, adding Checkstyle), move
that item out of Known Gaps into the relevant module section rather than
deleting it silently — say what changed. Don't duplicate reasoning that
belongs in `Infrastructure/INFRASTRUCTURE_DECISIONS.md` (topology/deploy) or
in the constitution itself (principles) — this doc is the tooling/style
layer underneath both.

## Keeping the infrastructure decision record current

This repo has a living decision log at
[`Infrastructure/INFRASTRUCTURE_DECISIONS.md`](Infrastructure/INFRASTRUCTURE_DECISIONS.md).
It exists because infrastructure choices (topology, exposure, base images,
env var contracts, CI/deploy behavior) carry reasoning and trade-offs that
the code and compose files themselves don't explain — six months from now,
nobody should have to re-derive *why* Keycloak sits fully public, or *why*
the Dockerfile uses the Gradle wrapper instead of a `gradle:` image, from
scratch.

**Any time you make or change an infrastructure decision in this repo, update
that file before you consider the task done.** This applies whether you're
implementing something new, fixing a bug in existing infra, or reversing a
past choice.

### What counts as "infrastructure" here

Anything touching: container topology (adding/removing/merging services),
orchestration config (`Infrastructure/podman-compose.yml`, any `Dockerfile`),
networking or public/private exposure of a service, the datastore layer
(instance topology, database-per-service decisions), identity/auth provider
setup (Keycloak config, realm strategy), base image choices or version pins,
CI/deploy workflows (`.github/workflows/*`), and env var contracts between
containers (names, defaults, what's required vs. optional).

It does **not** cover ordinary application code (business logic, UI work,
tests) unless that work is happening specifically to unblock or verify an
infrastructure change — see the "pre-existing application bugs" entry in the
decisions doc for the precedent: two Java bugs got fixed and logged there
*because* they were blocking Dockerfile verification, not because they were
otherwise infra work.

### How to update it

1. **Read the existing document first.** Check whether what you're doing
   changes, reverses, or is a special case of a decision that's already
   there — don't write a duplicate entry.
2. **Verify before you write it down.** This document's credibility comes
   from the fact that its claims were checked against a real running stack,
   not assumed. If you're documenting a new decision, actually build/run/test
   it first (see "Verification" patterns already in the doc — local Podman
   runs, curl checks through the proxy, `podman logs`, etc.). If you can't
   verify something in your current environment, say so explicitly in the
   entry rather than stating it as confirmed fact.
3. **Pick the right section:**
   - A deliberate choice with alternatives that were weighed → a new numbered
     entry in **Decisions** (`ID-0XX`, next sequential number), following the
     existing template: Status / Context / Decision / Alternatives Considered
     / Consequences. Add it to the **Index** table at the top too.
   - A fact you discovered by testing that nobody "decided" (a tool's default
     behavior, a version-specific quirk, an env var rename, a silent failure
     mode) → **Implementation Notes & Verified Gotchas**, not Decisions.
   - Something intentionally left undone → **Open Questions / Deferred Work**.
4. **Never silently delete or rewrite history.** If a decision is being
   reversed or superseded, keep the old entry and mark its Status as
   `Superseded by ID-0XX`, then add the new entry explaining why. The point of
   a living document is the trail, not just the current snapshot.
5. **Append a Changelog entry** at the bottom with today's actual date (check
   the current date — don't guess or reuse a stale one) summarizing what
   changed and which ID(s) it touches.
6. **Keep it separate from `Infrastructure/README.md`.** The README stays
   purely operational (install steps, bring-up order, verification commands).
   Reasoning and trade-offs belong in the decisions doc, not the README, and
   vice versa — don't let one drift into the other's job.

### Style

Match the existing document's density: concrete (exact env var names, file
paths, commands), not vague ("we chose Postgres for scalability" is not an
acceptable Consequences entry — say what was actually verified and what the
actual trade-off is). Extreme detail is the point of this document; brevity
is the README's job, not this one's.
