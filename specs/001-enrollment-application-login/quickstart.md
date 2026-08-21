# Quickstart: Validating the Enrollment Application and Login Pages

Validates this feature end-to-end **without any backend, Keycloak, or BFF
running** — everything here runs against the mock layer described in
`research.md` and `contracts/mock-api-contract.md`.

## Prerequisites

- Node.js (version matching the project's `Dockerfile`, `node:20-alpine`;
  a newer local Node like the one already on this machine also works for
  `ng serve`/`ng test`)
- From `oduva-mage-front-end/`: `npm ci`

No `podman-compose up`, no Keycloak, no BFF, no PostgreSQL needed for any
step below — that's the point of FR-018/FR-019/SC-007.

## 1. Run it locally (mock-backed dev server)

```sh
cd oduva-mage-front-end
npm start   # ng serve — environment.ts has useMockApi: true by default
```

Open the app; navigate to the application ("apply") page and the login
page. Both are fully functional against the mock — see manual scenarios
below.

## 2. Unit / component tests

```sh
npm test    # ng test — Karma/Jasmine, same mock HttpInterceptor as dev
```

Expected: all component/store specs pass, including the negative-path
cases (missing home address, missing enrollment type, invalid email,
wrong login credentials) called out in the spec's Acceptance Scenarios.

## 3. End-to-end tests (Playwright, FR-021)

```sh
npx playwright install --with-deps   # first time only
npm run e2e   # runs the mock demo build, then npx playwright test against it
```

Expected: at minimum, the four scenarios required by FR-021 pass —
successful application submission, submission blocked by validation,
successful login, and login rejected with invalid credentials.

## 4. Build the standalone demo artifact (FR-020)

```sh
npm run build:mock   # ng build --configuration=mock
npx sirv-cli dist/oduva-mage-front-end/mock/browser --port 4300 --single
```

(`--single` gives the static build SPA history-API fallback, so a direct
navigation/reload on `/apply` or `/login` resolves to `index.html` instead of
a 404 — plain `http-server` doesn't support this.)

Open `http://localhost:4300` — a stakeholder or QA reviewer can click
through both pages with no build tooling or backend running. Confirm the
build contains no reference to a real `apiBaseUrl` call ever leaving the
browser (e.g. via the Network tab — every request should be intercepted,
none should show a real network round-trip).

## 5. Build the real production artifact (unchanged)

```sh
npm run build   # ng build --configuration=production — useMockApi: false
```

This is the artifact the existing `Dockerfile`/nginx path already serves
(`Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-011); confirm it still
builds and stays within the `angular.json` budgets (see `research.md` §7).
This feature does not change how this artifact is deployed.

## Manual validation scenarios

Each maps directly to an Acceptance Scenario in `spec.md`; run these
against either the dev server (§1) or the demo build (§4).

**Enrollment Application (User Story 1)**
1. Fill in first name, last name, personal email, select "Student", enter
   a Home address, submit → on-screen confirmation appears (spec US1 #1).
2. Add an additional address labeled "Work" → both addresses are retained
   after submission (spec US1 #2).
3. Submit with no Home address → blocked, Home address flagged (spec US1 #3).
4. Submit with no enrollment type selected → blocked, field flagged
   (spec US1 #4).
5. Enter an invalid email (e.g. `not-an-email`) → flagged before submit
   (spec US1 #5).

**Login (User Story 2)** — use a fixture credential from
`mocks/fixtures/users.fixture.ts`:
1. Correct email + password → authenticated, landing view shown
   (spec US2 #1).
2. Correct email, wrong password → generic error, no account-existence
   hint (spec US2 #2).
3. Unregistered email → identical generic error (spec US2 #3).
4. Submit with an empty field → blocked client-side (spec US2 #4).
5. Log out → returns to unauthenticated state (spec US2 #5).

**Responsiveness (User Story 3)** — using browser dev tools' device
toolbar or an actual resize:
1. ~375px width → no horizontal scroll, all controls reachable
   (spec US3 #1).
2. Tablet portrait → landscape rotation → layout reflows
   (spec US3 #2).
3. ≥1440px width → content stays readable, not stretched full-width
   (spec US3 #3).
4. Resize mid-entry on the application form → entered data is retained
   (spec US3 #4).

If all of the above pass, the feature satisfies its Success Criteria
(`spec.md` SC-001 through SC-007) without any backend dependency.
