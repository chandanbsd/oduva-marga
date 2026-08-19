<!--
Sync Impact Report
Version change: (none — template placeholders) → 1.0.0
Rationale: Initial ratification. No prior filled constitution existed; this is
the first concrete version, hence MAJOR 1.0.0 rather than an incremental bump.

Modified principles: n/a (all seven are newly authored, not renamed)

Added sections:
- Core Principles I–VII (Test-First Development; Contract-First Layered
  Architecture; Security & Identity by Design; Self-Hosted Simplicity;
  Code Quality & Consistency; Observability & Operability; Data Privacy &
  Integrity)
- Technology Stack & Architecture Constraints
- Development Workflow & Quality Gates
- Governance (amendment procedure, versioning policy, compliance review)

Removed sections: none

Templates requiring updates (checked, not modified — this command's scope is
constitution-only per the Scope Guard):
- .specify/templates/plan-template.md — ⚠ pending manual check that its
  "Constitution Check" gate references match these seven principle names
- .specify/templates/spec-template.md — ✅ no principle-specific references
- .specify/templates/tasks-template.md — ✅ no principle-specific references
- .claude/commands (speckit-*) — ✅ read constitution at runtime, no edits needed

Follow-up TODOs:
- None. RATIFICATION_DATE set to the date this constitution was first adopted
  (today); no deferred placeholders remain.
-->

# Oduva Marga Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

Every unit of behavior — a Spring service method, a BFF endpoint, an Angular
component or service — MUST have a failing test written and reviewed before
the implementation that makes it pass. Red-Green-Refactor is the required
cycle: write the test, watch it fail for the right reason, implement the
minimum to pass, then refactor with the test as a safety net. Contract tests
are REQUIRED for every BFF↔service and BFF↔Keycloak integration point before
that integration is implemented.

**Rationale:** Oduva Marga is infrastructure a school trusts with grades,
attendance, and enrollment records. Retrofitting tests after the fact
consistently misses the edge cases that matter most (grade-boundary rounding,
enrollment race conditions, token-expiry handling); writing them first forces
those cases to surface at design time, not in production at a school that has
no dedicated ops team to catch it.

### II. Contract-First, Layered Architecture

The system is a strict three-tier chain: **Angular frontend → Java/Spring BFF
→ Java/Spring core service(s) → datastore**. The frontend MUST NOT call the
core service directly, and MUST NOT contain business logic beyond
presentation/view-state concerns — it calls only the BFF. The BFF owns
request aggregation, session/token handling, and view-shaping; it MUST NOT
own domain/business logic or write directly to the datastore — that belongs
to the core service. Every inter-service boundary (BFF↔service REST APIs)
MUST be defined by an explicit contract (OpenAPI or equivalent schema)
authored or updated *before* the implementing code, and breaking changes to
an existing contract require a version bump (see Governance).

**Rationale:** A clean BFF/service split lets the frontend evolve
independently of domain logic and keeps authorization/session concerns out of
the data layer. Contract-first prevents the two Java codebases from drifting
out of sync silently — a real risk once both are edited by different people
or agents over time.

### III. Security & Identity by Design

Keycloak is the single source of truth for authentication and authorization;
no service or the frontend MAY implement custom password handling, session
management, or a parallel identity store. All service-to-service and
user-facing auth MUST use standard OIDC/OAuth2 flows (authorization code +
PKCE for the frontend, client-credentials or token relay for service calls) —
never bespoke token schemes. Secrets (client secrets, DB credentials, signing
keys) MUST be injected via environment variables or a mounted secret store,
never committed to source or baked into images. Every externally reachable
endpoint MUST validate and sanitize input server-side regardless of
client-side validation, and the OWASP Top 10 is the minimum bar for review of
any endpoint handling user input or file upload.

**Rationale:** Small schools and universities self-hosting this system
typically lack a dedicated security team; the system must be secure by
default rather than depend on an operator layering security on top of it
after the fact. Centralizing identity in Keycloak (already an infrastructure
decision — see `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-006, ID-007)
removes an entire class of home-grown-auth vulnerabilities.

### IV. Self-Hosted Simplicity

The entire system MUST run on a single machine (or small cluster) via Podman
and `podman-compose`, with no hard dependency on a managed cloud service
(managed DB, managed identity provider, cloud object storage, etc.) for core
functionality to work. Every new service or dependency introduced MUST run as
a container in the existing Podman topology, use pinned image versions
(per `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-010), and expose a health
check. Optional cloud integrations (e.g., email delivery, backup offsite
storage) MAY be supported but MUST degrade gracefully to a local/self-hosted
default when absent, never become a hard requirement to boot the stack.

**Rationale:** The target operator is a small school or university IT staff
member, not a platform team. Every cloud dependency added is a support burden
and a cost the target user may not be able to absorb; the project's value
proposition over Canvas is specifically that it can be run entirely on
infrastructure the institution already controls.

### V. Code Quality & Consistency

Java code (BFF and service) MUST follow Spring idiomatic practice: constructor
injection only (no field `@Autowired`), package-by-feature over
package-by-layer, and no business logic in controllers. Angular code MUST
follow the official Angular style guide, use standalone components, and keep
`strict` TypeScript compiler settings on — `any` requires an inline
justification comment. Every module (BFF, service, frontend) MUST run its
linter/formatter and static analysis (e.g., Checkstyle/SpotBugs for Java,
ESLint for Angular) as a CI gate; a PR with lint or analysis failures MUST NOT
merge. Public APIs (REST endpoints, shared Angular services) require doc
comments explaining *why*, not what, when the reasoning isn't obvious from
the signature.

**Rationale:** "Enterprise quality" for an open-source project that other
institutions will fork and extend means the codebase has to be legible to
contributors who weren't in the room for the original decisions — consistency
and static enforcement substitute for the tribal knowledge a single in-house
team would otherwise carry.

### VI. Observability & Operability

Every service (BFF, core service) MUST expose a health endpoint suitable for
container healthchecks and MUST emit structured (JSON) logs including a
correlation/trace ID that propagates from the frontend request through the
BFF to the core service, so a single user-reported issue can be traced across
both Java processes. Startup failures MUST fail loudly (non-zero exit, clear
log message) rather than degrade silently. Metrics (at minimum: request
latency and error rate per endpoint) MUST be exposed in a standard scrape-able
format (e.g., Micrometer/Prometheus) even if no metrics backend is deployed by
default — the capability must exist for operators who choose to wire it up.

**Rationale:** A self-hosted deployment has no vendor support line to call.
When something breaks at 2am for a school registrar, the only diagnostic tool
available is what the system already logs and exposes — this must be built in
from the start, not bolted on when the first incident happens.

### VII. Data Privacy & Integrity

Student and staff records (grades, attendance, enrollment, submissions) are
sensitive-by-default. Any change to a grade, enrollment status, or submission
MUST be attributable (who, when) via an audit trail persisted in the core
service's datastore — soft-delete/history, not just overwrite. Access to
student data MUST be scoped by role (student/instructor/admin) enforced at
the service layer, not only hidden in the UI. Data exports or bulk-delete
operations MUST be explicit, logged actions — never a side effect of another
operation.

**Rationale:** Even a small self-hosted deployment carries real obligations
(FERPA-style expectations, institutional trust) around student records. An
LMS that can't answer "who changed this grade and when" is not enterprise
quality regardless of its feature set, and retrofitting audit trails onto an
existing schema is far more disruptive than designing for them up front.

## Technology Stack & Architecture Constraints

- **Frontend:** Angular (latest stable LTS at time of module creation),
  TypeScript strict mode, served as static assets behind nginx (per
  `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-011) — no other frontend
  framework may be introduced without a constitution amendment.
- **BFF and core service:** Java + Spring Boot, built with Gradle using each
  module's own Gradle wrapper (ID-009), packaged into containers from pinned
  base images (ID-010). The BFF and core service are separate Gradle
  modules/deployables, never merged into a single process, per the layered
  architecture in Principle II.
- **Identity:** Keycloak is the sole identity provider for the system
  (ID-006, ID-007). No module may implement an alternative or fallback auth
  mechanism.
- **Datastore:** PostgreSQL, per the shared-instance/database-per-service
  pattern in ID-004. New services needing persistence use a new database on
  the existing Postgres instance rather than provisioning a new datastore
  engine, unless a documented decision in
  `Infrastructure/INFRASTRUCTURE_DECISIONS.md` says otherwise.
- **Orchestration:** Podman and `podman-compose` exclusively (ID-001). Docker
  tooling MUST NOT be assumed or required for local development or deploy.
- **Public surface:** nginx is the only container with a published host port;
  all other services remain on the internal `oduva-net` bridge network
  (ID-005, ID-011), reachable only via nginx path-based routing.
- Any change to this section (adding a service, changing a base technology,
  altering the network topology) is by definition an infrastructure decision
  and MUST also be logged in `Infrastructure/INFRASTRUCTURE_DECISIONS.md`
  per the root `CLAUDE.md` instructions, in addition to any constitution
  amendment this document requires.

## Development Workflow & Quality Gates

- Features are developed through the Spec Kit workflow: `/speckit-specify` →
  `/speckit-clarify` (as needed) → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. `/speckit-plan` MUST include an explicit Constitution
  Check against the seven Core Principles above before design proceeds.
- No PR merges without: passing CI (build, lint/static analysis, and full test
  suite per module per Principles I and V), and at least one human or
  designated review pass confirming the change respects the BFF/service/
  frontend boundary in Principle II.
- Contract changes (OpenAPI/schema between BFF and service, or between
  frontend and BFF) MUST be reviewed and merged before the implementing code
  that depends on them, per Principle II.
- Any infrastructure-touching change (topology, Dockerfiles, compose files,
  CI/deploy workflows, env var contracts, Keycloak realm setup) MUST update
  `Infrastructure/INFRASTRUCTURE_DECISIONS.md` before the task is considered
  done, per the root `CLAUDE.md`. This constitution governs *principles*;
  that document governs *specific infrastructure decisions* — they are
  complementary, not duplicative.

## Governance

This constitution supersedes all other project practices, style preferences,
and undocumented conventions. Where a PR, plan, or generated code conflicts
with a principle here, the principle wins unless the constitution itself is
amended first.

**Amendment procedure:** Amendments are made via `/speckit-constitution`,
which rewrites this file directly. A proposed amendment MUST state which
principle(s)/section(s) it changes and why, following the same Sync Impact
Report format at the top of this file. Amendments affecting Core Principles
require the same scrutiny as the original ratification — they are not a
rubber-stamp edit.

**Versioning policy:** This document follows semantic versioning:
- **MAJOR** — a principle is removed or redefined in a way that is backward
  incompatible with prior guidance (e.g., relaxing Principle I's test-first
  requirement, or permitting a second identity provider under Principle III).
- **MINOR** — a new principle or section is added, or existing guidance is
  materially expanded (e.g., adding a new mandatory technology constraint).
- **PATCH** — clarifications, wording fixes, typo corrections, or
  non-semantic refinements that don't change what is required or forbidden.

**Compliance review:** Every `/speckit-plan` invocation MUST run the
Constitution Check gate against the Core Principles before implementation
design proceeds; deviations MUST be justified in that plan's Complexity
Tracking section or the plan MUST be revised to comply. Reviewers evaluating
a PR are expected to treat a Core Principle violation as a blocking issue,
not a style suggestion.

**Version**: 1.0.0 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-08-18
