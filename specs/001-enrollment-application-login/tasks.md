---

description: "Task list for feature implementation"
---

# Tasks: Enrollment Application and Login Pages

**Input**: Design documents from `/specs/001-enrollment-application-login/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/mock-api-contract.md, research.md, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included and binding, not optional. Constitution Principle I is
NON-NEGOTIABLE ("Every unit of behavior... MUST have a failing test written
and reviewed before the implementation that makes it pass"), and plan.md's
Constitution Check marks this explicitly as `PASS (binding on /speckit-tasks)`.
FR-021 additionally requires Playwright end-to-end coverage. Every
component/service/store below therefore gets a failing unit/component test
before its implementation task, plus Playwright specs per FR-021.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3)
to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to the repository root; the frontend project
  root is `oduva-mage-front-end/`.

## Path Conventions

Single Angular application, extended in place per plan.md's Project
Structure — no new project/package, no backend code touched by this feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring in the new dependencies and scaffolding this feature needs
before any foundational or story code can be written.

- [X] T001 Install and configure Angular Material `^17` + Angular CDK `^17` in `oduva-mage-front-end/` (`ng add @angular/material`): adds dependencies to `oduva-mage-front-end/package.json`, a Material theme to `oduva-mage-front-end/src/styles.scss`, and registers `provideAnimationsAsync()` (or `provideAnimations()`) in `oduva-mage-front-end/src/app/app.config.ts` (research.md §6)
- [X] T002 Install `@ngrx/signals@^17` as a dependency in `oduva-mage-front-end/package.json`
- [X] T003 Install and scaffold Playwright for this project: add it as a devDependency in `oduva-mage-front-end/package.json` and create `oduva-mage-front-end/e2e/playwright.config.ts` (spec.md Clarifications Q3, FR-021)
- [X] T004 Add `@angular-eslint` (schematics + recommended strict config) and a `lint` script to `oduva-mage-front-end/package.json` (research.md §8, constitution Principle V)
- [X] T005 [P] Create `oduva-mage-front-end/src/environments/environment.ts` (`useMockApi: true`, `apiBaseUrl: '/api'`), `oduva-mage-front-end/src/environments/environment.mock.ts` (`useMockApi: true`), and `oduva-mage-front-end/src/environments/environment.prod.ts` (`useMockApi: false`, `apiBaseUrl: '/api'`) per research.md §3
- [X] T006 Add a `mock` build configuration and matching `serve` configuration with `fileReplacements` (swapping in `environment.mock.ts`) to `oduva-mage-front-end/angular.json`, alongside the existing `production`/`development` configurations (depends on T005; research.md §3-4)
- [X] T007 Add `build:mock` (`ng build --configuration=mock`) and `e2e` (build mock config, then `npx playwright test`) npm scripts to `oduva-mage-front-end/package.json` per quickstart.md §3-4 (depends on T003, T006)
- [X] T008 [P] Create the feature folder skeleton under `oduva-mage-front-end/src/app/`: `core/interceptors/`, `core/guards/`, `features/enrollment-application/address-form-group/`, `features/auth/login/`, `features/auth/landing/`, `shared/models/`, `shared/api/`, `state/enrollment-application/`, `state/auth/`, plus `oduva-mage-front-end/mocks/fixtures/` (plan.md Project Structure)

**Checkpoint**: Tooling, environments, and folder structure are in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared models, mock backend, and typed API-client layer that
BOTH user stories' stores depend on. No user story implementation can begin
until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 [P] Create `EnrollmentApplication`, `Address`, `EnrollmentType` domain models in `oduva-mage-front-end/src/app/shared/models/enrollment-application.model.ts` per data-model.md
- [X] T010 [P] Create `LoginCredentials`, `AuthenticatedUser` domain models in `oduva-mage-front-end/src/app/shared/models/auth.model.ts` per data-model.md
- [X] T011 [P] Create mock fixture seed data for submitted applications in `oduva-mage-front-end/mocks/fixtures/enrollment-applications.fixture.ts` (depends on T009; research.md §2)
- [X] T012 [P] Create pre-provisioned mock login users fixture in `oduva-mage-front-end/mocks/fixtures/users.fixture.ts` (depends on T010; research.md §2)
- [X] T013 Implement `mock-api.interceptor.ts` in `oduva-mage-front-end/src/app/core/interceptors/mock-api.interceptor.ts` handling `POST {apiBaseUrl}/enrollment-applications`, `POST {apiBaseUrl}/auth/login`, and `POST {apiBaseUrl}/auth/logout` per contracts/mock-api-contract.md, persisting accepted applications and session state to `localStorage` under a namespaced key (depends on T009, T010, T011, T012; research.md §1-2)
- [X] T014 Register `mock-api.interceptor.ts` in `oduva-mage-front-end/src/app/app.config.ts` via `provideHttpClient(withInterceptors([...]))`, gated so it is only included when `environment.useMockApi` is `true` (depends on T013; FR-018, FR-019)
- [X] T015 [P] Create typed API-client functions for enrollment applications (`SubmitEnrollmentApplicationRequest`/`Response`, `ValidationErrorResponse`, `submitEnrollmentApplication()`) in `oduva-mage-front-end/src/app/shared/api/enrollment-application.api.ts`, calling `HttpClient` against `{apiBaseUrl}/enrollment-applications` (depends on T009; contracts/mock-api-contract.md)
- [X] T016 [P] Create typed API-client functions for auth (`LoginRequest`/`LoginResponse`, `AuthErrorResponse`, `login()`, `logout()`) in `oduva-mage-front-end/src/app/shared/api/auth.api.ts`, calling `HttpClient` against `{apiBaseUrl}/auth/login` and `{apiBaseUrl}/auth/logout` (depends on T010; contracts/mock-api-contract.md)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Submit an Enrollment Application (Priority: P1) 🎯 MVP

**Goal**: A prospective applicant can fill out and submit the enrollment
application (name, personal email, one or more enrollment types, a required
Home address, and any number of additional labeled addresses) and receive an
on-screen confirmation, with no login credentials created.

**Independent Test**: Fill out the application form with valid data and
confirm the submission is accepted, durably captured (survives refresh), and
confirmed on-screen — against the mock backend, with no dependency on the
login page.

### Tests for User Story 1 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation** (constitution Principle I, binding per plan.md)

- [X] T017 [P] [US1] Unit test for `enrollment-application.store.ts` in `oduva-mage-front-end/src/app/state/enrollment-application/enrollment-application.store.spec.ts` — covers idle/submitting/submitted/error status transitions and `lastSubmission` population
- [X] T018 [P] [US1] Unit test for `address-form-group` component in `oduva-mage-front-end/src/app/features/enrollment-application/address-form-group/address-form-group.component.spec.ts` — covers required street1/city/stateRegion/postalCode/country, and (for additional addresses) non-blank/unique-label validation
- [X] T019 [P] [US1] Unit test for `enrollment-application.page` component in `oduva-mage-front-end/src/app/features/enrollment-application/enrollment-application.page.spec.ts` — covers Acceptance Scenarios 1-6: successful submit shows confirmation, additional addresses retained, missing Home address blocks submit, missing enrollment type blocks submit, invalid email flagged inline, no credentials/account created
- [X] T020 [P] [US1] Unit test for `mock-api.interceptor.ts`'s enrollment-applications handler in `oduva-mage-front-end/src/app/core/interceptors/mock-api.interceptor.spec.ts` — covers server-side field validation, `localStorage` persistence surviving a fresh interceptor instance, and non-blocking duplicate-email submissions

### Implementation for User Story 1

- [X] T021 [P] [US1] Implement `enrollment-application.store.ts` SignalStore (`withState`/`withComputed`/`withMethods`) in `oduva-mage-front-end/src/app/state/enrollment-application/enrollment-application.store.ts`, calling `shared/api/enrollment-application.api.ts` (depends on T017 failing, T015)
- [X] T022 [P] [US1] Implement `address-form-group` component (Reactive Form; Angular Material fields for street1/street2/city/stateRegion/postalCode/country, plus an editable label input for additional addresses, fixed "Home" label for the required one) in `oduva-mage-front-end/src/app/features/enrollment-application/address-form-group/address-form-group.component.ts` (+ `.html`, `.scss`) (depends on T018 failing, T009)
- [X] T023 [US1] Implement `enrollment-application.page` component (first name, last name, personal email, Material multi-select for Student/Faculty enrollment types, required Home `address-form-group`, repeatable additional `address-form-group`s with add/remove, submit button disabled while in-flight, on-screen confirmation view) in `oduva-mage-front-end/src/app/features/enrollment-application/enrollment-application.page.ts` (+ `.html`, `.scss`) (depends on T019 failing, T021, T022)
- [X] T024 [US1] Add inline validators to `enrollment-application.page.ts`/`address-form-group.component.ts`: email-format for `personalEmail`, required Home address, required at-least-one enrollment type, non-blank/unique (case-insensitive) additional-address labels (depends on T023; FR-002, FR-003, data-model.md)
- [X] T025 [US1] Wire the `/apply` route to `enrollment-application.page` in `oduva-mage-front-end/src/app/app.routes.ts` (depends on T023)
- [X] T026 [US1] Add Playwright e2e spec covering successful application submission and submission blocked by validation in `oduva-mage-front-end/e2e/enrollment-application.spec.ts` (depends on T025; FR-021)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Log In to Access the Application (Priority: P2)

**Goal**: A person with valid, pre-provisioned account credentials signs in
with email + password and reaches the authenticated landing view; invalid
credentials are rejected with a single generic, non-revealing error.

**Independent Test**: Log in with a known-valid mock credential and confirm
the authenticated landing view is reached; separately, log in with invalid
credentials and confirm access is denied with the generic error — independent
of the application page.

### Tests for User Story 2 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation** (constitution Principle I, binding per plan.md)

- [X] T027 [P] [US2] Unit test for `auth.store.ts` in `oduva-mage-front-end/src/app/state/auth/auth.store.spec.ts` — covers idle/authenticating/authenticated/error status transitions and logout clearing `user`
- [X] T028 [P] [US2] Unit test for `login.page` component in `oduva-mage-front-end/src/app/features/auth/login/login.page.spec.ts` — covers Acceptance Scenarios 1-4: valid login authenticates, wrong password shows generic error, unregistered email shows the identical generic error, empty email/password blocks submit with inline feedback
- [X] T029 [P] [US2] Unit test for `auth.guard.ts` in `oduva-mage-front-end/src/app/core/guards/auth.guard.spec.ts` — covers allowing an authenticated user through and redirecting an unauthenticated one to `/login`
- [X] T030 [P] [US2] Unit test for `landing.page` component in `oduva-mage-front-end/src/app/features/auth/landing/landing.page.spec.ts` — covers displaying the authenticated user and logout ending the session (Acceptance Scenario 5)
- [X] T031 [P] [US2] Unit test for `mock-api.interceptor.ts`'s auth handlers in `oduva-mage-front-end/src/app/core/interceptors/mock-api.interceptor.spec.ts` — covers identical generic `401` for both wrong-password and unknown-email cases (FR-010), and logout always clearing the persisted mock session

### Implementation for User Story 2

- [X] T032 [US2] Implement `auth.store.ts` SignalStore (`withState`/`withComputed`/`withMethods`) in `oduva-mage-front-end/src/app/state/auth/auth.store.ts`, calling `shared/api/auth.api.ts` (depends on T027 failing, T031 failing, T016)
- [X] T033 [P] [US2] Implement `login.page` component (Reactive Form with email + password, Material inputs, inline required-field validation, single generic invalid-credentials error display) in `oduva-mage-front-end/src/app/features/auth/login/login.page.ts` (+ `.html`, `.scss`) (depends on T028 failing, T032)
- [X] T034 [P] [US2] Implement `landing.page` component (minimal authenticated view; shows authenticated user, exposes logout; auth state reflected in navigation per FR-012) in `oduva-mage-front-end/src/app/features/auth/landing/landing.page.ts` (+ `.html`, `.scss`) (depends on T030 failing, T032)
- [X] T035 [P] [US2] Implement `auth.guard.ts` functional route guard, gating access on `auth.store`'s authenticated state, redirecting to `/login` otherwise, in `oduva-mage-front-end/src/app/core/guards/auth.guard.ts` (depends on T029 failing, T032)
- [X] T036 [US2] Wire the `/login` route to `login.page` and the guarded `/home` route (`canActivate: [authGuard]`) to `landing.page` in `oduva-mage-front-end/src/app/app.routes.ts` (depends on T033, T034, T035)
- [X] T037 [US2] Add Playwright e2e spec covering successful login and login rejected with invalid credentials in `oduva-mage-front-end/e2e/login.spec.ts` (depends on T036; FR-021)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Consistent, Fully Responsive Experience Across Devices (Priority: P3)

**Goal**: Both pages remain fully usable — no horizontal scrolling, no
overlapping/clipped elements, no lost form data — across viewports from
320px to 2560px.

**Independent Test**: Load both pages at 320px, 375px, 768px, 1024px, 1440px,
and 2560px and confirm no horizontal scrolling, no overlap/clipping, and all
controls remain operable, independent of what data is entered.

- [X] T038 [P] [US3] Apply responsive layout (Angular CDK `BreakpointObserver` and/or Material's responsive grid utilities; no fixed pixel widths) to `enrollment-application.page.html`/`.scss` and `address-form-group.component.html`/`.scss`, validated at 320px-2560px (SC-002)
- [X] T039 [P] [US3] Apply responsive layout to `login.page.html`/`.scss` and `landing.page.html`/`.scss`, validated at 320px-2560px (SC-002)
- [X] T040 [US3] Verify already-entered `enrollment-application.page` form data survives window resize and orientation change without being reset by layout changes (depends on T038; SC-006, FR-016)
- [X] T041 [US3] Manually run the quickstart.md Responsiveness scenarios (~375px, tablet portrait↔landscape rotation, ≥1440px, mid-entry resize) against `ng serve` and record results (depends on T038, T039, T040)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and quality gates spanning both stories.

- [X] T042 [P] Verify the production bundle stays within `angular.json`'s existing budgets (500kb warning / 1mb error, initial) after adding Material + CDK + NgRx SignalStore; if exceeded, raise the budget only as far as genuinely needed with an inline justification (research.md §7)
- [X] T043 [P] Run `ng lint` across all new code added by this feature and fix findings (constitution Principle V)
- [X] T044 Add doc comments explaining non-obvious *why* to public APIs (SignalStore public methods in `enrollment-application.store.ts`/`auth.store.ts`, and the `shared/api/*.ts` functions) per constitution Principle V
- [X] T045 Build and verify the standalone demo artifact (`npm run build:mock`, then serve `dist/oduva-mage-front-end/mock/browser`) shows no real network calls leaving the browser in the Network tab (quickstart.md §4, FR-020)
- [X] T046 Build and verify the real production artifact (`npm run build`) still builds successfully and is unaffected by this feature's mock-only additions (quickstart.md §5)
- [X] T047 Run the full quickstart.md validation suite end-to-end (`npm start`, `npm test`, `npm run e2e`, demo build, production build) and confirm SC-001 through SC-007 are satisfied

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational completion - no dependency on US1/US3
- **User Story 3 (Phase 5)**: Depends on Foundational completion, and in practice on US1's and US2's pages existing (T038/T039 apply layout to those pages' templates) - can be worked incrementally per-page as each page lands
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2), but its tasks target US1's and US2's page templates, so each responsive-layout task is only actionable once the corresponding page exists (T038 needs T023 from US1; T039 needs T033/T034 from US2)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution Principle I)
- Models before services/stores; stores before pages; pages before route wiring; route wiring before e2e specs
- Story complete before moving to next priority (if working sequentially)

### Parallel Opportunities

- All Setup tasks not sharing `package.json` can run in parallel: T005, T008
- All Foundational tasks marked [P] can run in parallel: T009, T010 together; then T011, T012 together; then T015, T016 together
- Once Foundational completes, User Story 1 and User Story 2 can proceed fully in parallel (different developers/agents, disjoint files)
- All tests for a user story marked [P] can run in parallel
- Independent-file implementation tasks within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for enrollment-application.store.ts in src/app/state/enrollment-application/enrollment-application.store.spec.ts"
Task: "Unit test for address-form-group component in src/app/features/enrollment-application/address-form-group/address-form-group.component.spec.ts"
Task: "Unit test for enrollment-application.page component in src/app/features/enrollment-application/enrollment-application.page.spec.ts"
Task: "Unit test for mock-api.interceptor.ts's enrollment-applications handler in src/app/core/interceptors/mock-api.interceptor.spec.ts"

# Launch independent-file implementation for User Story 1 together:
Task: "Implement enrollment-application.store.ts in src/app/state/enrollment-application/enrollment-application.store.ts"
Task: "Implement address-form-group component in src/app/features/enrollment-application/address-form-group/address-form-group.component.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run T017-T020 tests, then the manual US1 scenarios from quickstart.md
5. Demo via `npm run build:mock` if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 (responsive polish over US1 + US2's pages) → Validate across viewports → Demo
5. Complete Polish phase → Full quickstart.md suite passes

### Parallel Team Strategy

With two developers/agents after Foundational is done:

1. Developer A: User Story 1 (Phase 3)
2. Developer B: User Story 2 (Phase 4)
3. Either picks up User Story 3 (Phase 5) once both pages exist; Polish (Phase 6) last

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No test task touches real backend infrastructure — everything runs against
  the mock interceptor per FR-018/FR-019/SC-007; no `Infrastructure/` files,
  `Dockerfile`s, or CI workflows are touched by this task list, consistent
  with plan.md/research.md §4 scoping this feature as frontend-only
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
