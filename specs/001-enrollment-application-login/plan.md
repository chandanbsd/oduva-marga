# Implementation Plan: Enrollment Application and Login Pages

**Branch**: `001-enrollment-application-login` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-enrollment-application-login/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add two new pages to the existing Angular 17 frontend — an **Enrollment
Application** page (first/last name, personal email, multi-select Student/
Faculty enrollment type, a required Home address plus any number of
additional labeled addresses) and a **Login** page (email + password) — built
with Angular Material, backed by an NgRx SignalStore for client-side state,
and fully responsive from 320px to 2560px. Per the clarification session,
this feature makes **no real network calls** to the BFF/API: an in-app
`HttpInterceptor`-based mock layer, switchable to a real backend via a single
environment-file swap, stands in for the backend everywhere (dev server, unit
tests, and a dedicated statically-servable demo build), and Playwright
end-to-end tests exercise both pages against that mock.

## Technical Context

**Language/Version**: TypeScript 5.2 (`strict: true`, project's existing `tsconfig.json`), Angular 17.0 (already pinned in `package.json`; not upgraded by this feature)

**Primary Dependencies**: `@angular/material` ^17 + `@angular/cdk` ^17 (new), `@ngrx/signals` ^17 (new — SignalStore), `@angular/forms` (already present — Reactive Forms for both pages), `@angular/animations` (already present, required by Material)

**Storage**: N/A (no real datastore in this feature). The mock backend layer persists demo data to browser `localStorage` only, so a submitted application or an active mock session survives a refresh (satisfies FR-008/SC-006 within the scope of this feature); this is explicitly not a substitute for real backend persistence.

**Testing**: Karma + Jasmine (already scaffolded, component/unit tests, `ng test`) plus Playwright (new, end-to-end, `npx playwright test`) driving the mock-backed demo build per FR-021

**Target Platform**: Browser (desktop + mobile web), served as static assets behind nginx in production (existing `Dockerfile` / `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-011) — this feature changes none of that topology

**Project Type**: Web frontend only — single Angular application (`oduva-mage-front-end`); no BFF or service code is touched by this feature

**Performance Goals**: Stay within the existing `angular.json` production budgets (500kb warning / 1mb error, initial bundle) after adding Material + CDK + NgRx SignalStore; verify and, only if genuinely necessary, raise the budget with a one-line justification in a task (this is an `angular.json` build-budget tweak, not an infrastructure decision under `CLAUDE.md`'s definition, so it does not require an `INFRASTRUCTURE_DECISIONS.md` entry)

**Constraints**: Fully responsive 320px–2560px (SC-002); zero real network calls anywhere in this feature's build/dev/test path (SC-007); TypeScript strict mode with justified `any` only (constitution Principle V); mock/demo code must be excluded from the real production bundle (FR-020)

**Scale/Scope**: 2 primary routed pages (Enrollment Application, Login) + a minimal authenticated landing/shell view for FR-012, 2 NgRx SignalStores (auth, enrollment-application), 1 mock `HttpInterceptor` with fixture data, ~21 functional requirements, 3 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Test-First Development | **PASS (binding on /speckit-tasks)** | Every component/service/store gets a failing test first. No live BFF integration exists in this feature, so the "contract tests before integration" clause doesn't apply to a real service boundary; the frontend-internal mock↔future-real contract (see `contracts/mock-api-contract.md`) is defined before the interceptor and stores are implemented, satisfying the same spirit. |
| II. Contract-First, Layered Architecture | **PASS / N-A for the missing hop** | Frontend calls only its own mock layer, never a core service directly — satisfied trivially since there is no real BFF call at all in this feature. No business/domain logic is added to the frontend beyond form validation and view-state (enrollment review/decision logic stays out of scope). The BFF↔service contract clause doesn't apply (no BFF code touched); the frontend-side request/response shapes are still defined up front as a contract artifact so a future BFF-integration feature has a fixed target. |
| III. Security & Identity by Design | **PASS for this feature, with a flagged future risk** | No real credentials, real Keycloak, or real identity store are touched — the mock never validates a real password against real data, so nothing here creates a parallel identity store in the Principle III sense. **Flag**: per `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-006, this project's real login is Authorization Code + PKCE (browser redirected to Keycloak), and a BFF-mediated custom password form was explicitly *rejected* as an alternative. The custom Angular Material email+password Login page built here is therefore a UI/demo approximation of login, not the production auth pattern — reconciling it (most likely: the "Login" page becomes a themed redirect trigger rather than a credential form) is deferred to the future real-backend-integration feature and is called out again in Research. |
| IV. Self-Hosted Simplicity | **PASS** | The chosen mock approach (in-app `HttpInterceptor`, no second process) adds zero new containers, processes, or cloud dependencies — directly reinforces this principle. Playwright and Angular Material/NgRx are dev-time/build-time npm dependencies only, not new runtime services. |
| V. Code Quality & Consistency | **PASS, with one pre-existing gap noted** | New code uses standalone components, Reactive Forms, and strict TypeScript per the existing `tsconfig.json`. The frontend currently has **no ESLint configured at all** (pre-existing gap, not introduced by this feature) — this plan adds `@angular-eslint` + a `lint` script so new code is enforceable, but wiring a lint/test *CI gate* into `.github/workflows` is left as a follow-up (touching workflows is an infrastructure change under `CLAUDE.md` and would need its own `INFRASTRUCTURE_DECISIONS.md` entry, which is out of scope for a frontend-only feature). |
| VI. Observability & Operability | **N/A** | This principle targets the BFF/core service (health endpoints, structured logs, correlation IDs). No server process is introduced by this feature; mock/interceptor failures surface as ordinary browser console errors and UI error states. |
| VII. Data Privacy & Integrity | **Deferred, with rationale** | Enrollment Application data (name, personal email, addresses) is personal data, but in this feature it never reaches a real datastore — it's held in the mock's `localStorage`-backed fixture store, which is explicitly demo-only, not a system of record. Real audit-trail and service-layer RBAC enforcement (the actual Principle VII obligations) apply once a real backend persists real applications/accounts — out of scope here and flagged for the future integration feature. |

No outstanding gate failures block Phase 0. The Principle III and VII items are flagged risks/deferrals for future work, not violations of what this feature actually does — see Research (`research.md`) for the fuller writeup.

**Post-Phase-1 re-check**: `data-model.md` and `contracts/mock-api-contract.md` introduce no new server-side logic, real datastore, or real identity integration — the table above still holds unchanged after design. The contract document explicitly excludes real Keycloak/OIDC token exchange from its scope (see the contract's "Explicitly not part of this contract"), keeping the Principle III flag exactly as scoped in Research §9, not expanded by design.

## Project Structure

### Documentation (this feature)

```text
specs/001-enrollment-application-login/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── mock-api-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
oduva-mage-front-end/
├── src/
│   ├── environments/
│   │   ├── environment.ts            # dev default — useMockApi: true (unchanged file identity, new content)
│   │   ├── environment.mock.ts       # NEW — used by the `mock` build config, useMockApi: true
│   │   └── environment.prod.ts       # NEW — used by the `production` build config, useMockApi: false, apiBaseUrl: '/api'
│   └── app/
│       ├── app.routes.ts             # extended: /apply, /login, /home (authenticated landing) routes
│       ├── core/
│       │   ├── interceptors/
│       │   │   └── mock-api.interceptor.ts   # FR-018/019 — only registered when environment.useMockApi is true
│       │   └── guards/
│       │       └── auth.guard.ts             # FR-012 — gates the authenticated landing route
│       ├── features/
│       │   ├── enrollment-application/
│       │   │   ├── enrollment-application.page.ts (+ .html, .scss, .spec.ts)
│       │   │   └── address-form-group/               # reusable Home + additional-address sub-form
│       │   │       └── address-form-group.component.ts (+ .html, .scss, .spec.ts)
│       │   └── auth/
│       │       ├── login/
│       │       │   └── login.page.ts (+ .html, .scss, .spec.ts)
│       │       └── landing/
│       │           └── landing.page.ts (+ .html, .scss, .spec.ts)   # minimal authenticated view for FR-012
│       ├── shared/
│       │   └── models/
│       │       ├── enrollment-application.model.ts   # EnrollmentApplication, Address, EnrollmentType
│       │       └── auth.model.ts                      # LoginRequest/Response, AuthenticatedUser
│       └── state/
│           ├── enrollment-application/
│           │   └── enrollment-application.store.ts    # NgRx SignalStore
│           └── auth/
│               └── auth.store.ts                       # NgRx SignalStore
├── mocks/
│   └── fixtures/
│       ├── enrollment-applications.fixture.ts   # in-memory seed data for the mock interceptor
│       └── users.fixture.ts                     # pre-provisioned mock login credentials
├── e2e/
│   ├── enrollment-application.spec.ts   # Playwright — FR-021
│   ├── login.spec.ts                    # Playwright — FR-021
│   └── playwright.config.ts
└── angular.json                          # extended: new `mock` build + serve configuration
```

**Structure Decision**: Single Angular application, extended in place (no new
project/package). Feature code is organized by feature folder
(`features/enrollment-application`, `features/auth`) with cross-cutting
concerns split into `core/` (interceptor, guard), `shared/` (typed models),
and `state/` (SignalStores) — this mirrors the "package-by-feature" guidance
constitution Principle V gives the Java side, applied to the Angular side.
Mock fixtures live in a top-level `mocks/` folder (not under `src/`) so the
mock interceptor can import them without their ever being mistaken for
production app code; `e2e/` sits alongside `src/` per Playwright's own
convention, separate from the Karma/Jasmine unit tests that stay colocated
with each component/service.

## Complexity Tracking

No constitution violations require justification. The Principle III and VII
items above are explicitly scoped as deferred/future-work, not deviations
from what this feature is required to do now — see the Constitution Check
table and `research.md` for the reasoning.
