# Phase 0 Research: Enrollment Application and Login Pages

All Technical Context fields were resolvable from the spec's Clarifications
session, the existing codebase, and the constitution — no
`NEEDS CLARIFICATION` markers remain. This document records the supporting
decisions made while turning those inputs into a concrete technical approach.

## 1. Mock backend mechanism

**Decision**: An Angular `HttpInterceptor`, registered only when
`environment.useMockApi === true`, intercepts calls to the app's own typed
API-client methods and returns fixture data with realistic latency
(simulated via a short `delay()`) and occasional injected error responses for
the negative-path acceptance scenarios (FR-010, US1 scenario 3, US2 scenario
2-3).

**Rationale**: Already selected in the spec's Clarifications session
(Question 1) specifically because it needs no second process, reuses the
exact mechanism Angular's own `HttpClientTestingModule` uses, and lets the
same interceptor serve `ng serve`, Karma/Jasmine unit tests, and the
Playwright-driven demo build from one code path (constitution Principle IV,
Self-Hosted Simplicity).

**Alternatives considered**: MSW, `angular-in-memory-web-api`, and a
standalone `json-server` process — all rejected in the Clarifications
session for adding either a new dependency class or a second process to run.

## 2. Mock data persistence

**Decision**: The mock interceptor reads/writes its fixture "database"
(submitted applications, the small set of pre-provisioned mock login users)
to `window.localStorage` under a single namespaced key, not pure in-memory
state.

**Rationale**: FR-008 and SC-006 require that submitted application data
survive a page refresh or navigation. With no real backend in this feature,
an in-memory-only mock would lose that data on every reload, silently
failing FR-008/SC-006 in the one environment (mock/demo) where those
requirements are actually exercised. `localStorage` is the smallest
mechanism that satisfies this without adding a dependency (no IndexedDB
wrapper, no service worker).

**Alternatives considered**: Pure in-memory (module-level array) — rejected,
fails FR-008/SC-006 on refresh. `sessionStorage` — rejected, would not
survive a closed tab/new tab, which is a stricter loss than the requirement
implies ("survives beyond the applicant's browser session"). IndexedDB —
rejected as unnecessary complexity for what is explicitly demo/mock data,
not a real datastore.

## 3. Mock-vs-real switching mechanism

**Decision**: Three Angular environment files —
`environment.ts` (dev default, `useMockApi: true`),
`environment.mock.ts` (used by a new `mock` build configuration,
`useMockApi: true`), and `environment.prod.ts` (used by the existing
`production` build configuration, `useMockApi: false`,
`apiBaseUrl: '/api'`) — swapped via Angular's standard `fileReplacements`
build-configuration mechanism in `angular.json`.

**Rationale**: This is exactly what Angular's environment system is built
for, requires no custom tooling, and satisfies FR-019's "single environment
configuration change, no page/component code changes" requirement literally
— the interceptor, stores, and pages only ever read `environment.useMockApi`
and `environment.apiBaseUrl`, never a build-configuration name.

**Alternatives considered**: A runtime query-param/localStorage toggle
(`?mock=true`) — rejected, because it would let mock mode leak into a
real production deployment by accident (a URL param, not a build-time
decision) and doesn't produce a distinct, auditable build artifact the way
`ng build --configuration=mock` does.

## 4. Demo build's deployment path

**Decision**: The `mock` build configuration produces a static
`dist/oduva-mage-front-end/mock/browser` folder (FR-020) that is documented
in `quickstart.md` as servable with any static file server (e.g.
`ng serve --configuration=mock`, or `npx http-server` against the built
output). This feature does **not** add a new Dockerfile stage, container, or
nginx route for it.

**Rationale**: The spec's Assumptions explicitly deferred the question of
whether the demo build gets its own deployment path to planning/
implementation. Building it here would mean adding a new container or
topology change — squarely "infrastructure" under the root `CLAUDE.md`
definition — which is out of scope for a feature that was explicitly scoped
to frontend-only. Keeping the demo build statically-servable-but-undeployed
satisfies FR-020 ("statically servable") without crossing that line. If a
persistently-hosted demo environment is wanted later, that is a deliberate
follow-up infrastructure decision, to be logged in
`Infrastructure/INFRASTRUCTURE_DECISIONS.md` when it happens.

**Alternatives considered**: A dedicated `Dockerfile.mock` + compose service
— rejected for this feature per the scope reasoning above; nothing prevents
adding it later without rework, since the `mock` build configuration itself
is being built now regardless.

## 5. State management shape (NgRx SignalStore)

**Decision**: Two feature-scoped `@ngrx/signals` SignalStores —
`auth.store.ts` (authenticated user, auth status, login in-flight/error
state) and `enrollment-application.store.ts` (form draft state,
submission in-flight/error/success state) — each providing `withState`,
`withComputed`, and `withMethods` that call the app's typed API-client
functions (which the mock interceptor transparently backs).

**Rationale**: Matches the explicit technical directive from the spec
(Assumptions) and keeps the "frontend contains no business logic beyond
presentation/view-state" boundary from constitution Principle II — these
stores hold *view* state (is the form submitting, did login fail) not
domain logic (application review/decision rules, which stay server-side and
out of scope).

**Alternatives considered**: A single app-wide store — rejected, mixes two
independent, differently-lifecycled concerns (auth session vs. a one-shot
form submission) and would force unrelated components to depend on each
other's state slices.

## 6. Angular Material & CDK versioning

**Decision**: `@angular/material@^17` and `@angular/cdk@^17`, matching the
existing pinned `@angular/core@^17.0.0` in `package.json` exactly (no
Angular version bump).

**Rationale**: Angular Material major versions track Angular core major
versions; using anything other than v17 would create a peer-dependency
mismatch. The feature request didn't ask for an Angular upgrade, so core
stays at 17.

**Alternatives considered**: Bumping to a newer Angular major to get a newer
Material — rejected as unrequested scope expansion with its own migration
risk, unrelated to this feature's goals.

## 7. Bundle budget risk

**Decision**: Verify the production bundle against the existing
`angular.json` budgets (500kb warning / 1mb error, initial) after adding
Material + CDK + NgRx SignalStore, as an explicit task; only raise the
budget numbers if the verified, tree-shaken output actually requires it, and
only for the components actually used (import individual Material modules
per component, not a barrel import of the whole library).

**Rationale**: Material + CDK are not small, and this is the kind of
regression that's silent until CI enforces it. Catching it as a build-time
budget check (already wired into `angular.json`, no new tooling) is cheaper
than discovering it later.

**Alternatives considered**: Ignoring the budget and letting it warn/fail —
rejected, `angular.json`'s `maximumError: 1mb` already fails the build if
exceeded, so this has to be resolved regardless; better to plan for it than
be surprised by it.

## 8. Code quality tooling gap (ESLint)

**Decision**: Add `@angular-eslint` (schematics + recommended strict config)
and a `lint` script to `package.json` as part of this feature's setup work,
satisfying constitution Principle V for the new code being written. Wiring a
lint/test step into `.github/workflows` is explicitly **not** done by this
feature.

**Rationale**: The frontend currently has no linter at all — a pre-existing
gap this feature would otherwise make worse by adding a meaningful amount of
new TypeScript with nothing enforcing style/strictness beyond the compiler.
Adding the local tooling is in-scope (it's app-repo config, not
infrastructure); editing `.github/workflows/*` is explicitly infrastructure
under `CLAUDE.md` and would require its own `INFRASTRUCTURE_DECISIONS.md`
entry — out of scope for a feature that was explicitly scoped to
frontend-only, no CI/deploy changes.

**Alternatives considered**: Leaving linting out entirely — rejected, it's a
direct, low-cost constitution requirement (Principle V) for code this
feature is adding. Also wiring the CI gate now — rejected per the scope
reasoning above; flagged as a natural follow-up.

## 9. Login page vs. constitution's Authorization Code + PKCE mandate (flagged risk)

**Decision**: Proceed with building a custom Angular Material email+password
Login page against the mock layer, as explicitly requested, but document
clearly (here and in `plan.md`'s Constitution Check) that this is a UI/demo
approximation, not the production authentication pattern.

**Rationale**: `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-006 already
established that this project's real login is OIDC Authorization Code +
PKCE — the browser is redirected to Keycloak's own login page and back — and
explicitly *rejected* the alternative of the Angular app collecting
credentials itself and forwarding them (a BFF-mediated password-grant
pattern), because OAuth2 discourages Resource Owner Password Credentials
outside trusted legacy cases. Since this feature makes no real backend
calls at all, building the requested custom login form against a mock
creates no actual constitution violation today (no real credentials, no
real identity store) — but it does mean the page built here will very
likely need to become a "redirect to Keycloak" trigger (possibly with a
custom-themed Keycloak login page to preserve the Material look) rather
than a real credential-submission form, once a future feature wires up
real authentication. That reconciliation is explicitly deferred, not
resolved, here.

**Alternatives considered**: Building the Login page now as a "redirect to
Keycloak" stub instead of a real form — rejected because it would not
satisfy the explicit request ("implement user signup and login pages") or
FR-009 through FR-013 as written, and there is nothing to redirect to yet
in a frontend-only, no-BFF feature. Silently ignoring the ID-006 tension —
rejected, since a future implementer hitting this without warning would be
the exact kind of rework the constitution's "document trade-offs" ethos
exists to prevent.
