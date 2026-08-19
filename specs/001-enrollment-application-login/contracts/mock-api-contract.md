# Frontend-Internal API Contract (mock ↔ future real backend)

This is not a live contract with an existing BFF — no BFF endpoint for any
of this exists yet, per the spec's Assumptions. It exists so the mock
interceptor and the (future, out-of-scope) real backend integration target
the exact same shapes, satisfying the spirit of constitution Principle II
(contract before implementation) even though there is no real integration
in this feature. Both `environment.mock.ts`/`environment.ts` and
`environment.prod.ts` set `apiBaseUrl: '/api'` (the same path nginx already
proxies to the BFF per `Infrastructure/INFRASTRUCTURE_DECISIONS.md`
ID-011); the mock interceptor only ever short-circuits requests matching
this base, so the same relative-path calls work unchanged in both modes.

All request/response bodies use the entities defined in `data-model.md`.

---

## `POST {apiBaseUrl}/enrollment-applications`

Submits one enrollment application (User Story 1; FR-001–FR-008, FR-017).

**Request body** (`SubmitEnrollmentApplicationRequest`):

```ts
interface SubmitEnrollmentApplicationRequest {
  firstName: string;
  lastName: string;
  personalEmail: string;
  enrollmentTypes: EnrollmentType[]; // at least one
  homeAddress: Address;              // label: "Home"
  additionalAddresses: Address[];    // may be empty
}
```

**Success response** — `201`, body `SubmitEnrollmentApplicationResponse`:

```ts
interface SubmitEnrollmentApplicationResponse {
  id: string;
  submittedAt: string; // ISO 8601
}
```

**Validation error response** — `400`, body `ValidationErrorResponse`:

```ts
interface ValidationErrorResponse {
  errors: Array<{ field: string; message: string }>;
}
```

**Mock behavior**:
- Applies the same field-presence/format rules listed in `data-model.md`
  server-side (not just relying on client-side Reactive Forms validators),
  so a Playwright test can bypass the UI and still observe correct
  behavior (FR-021).
- Persists the accepted application to the `localStorage`-backed fixture
  store (see `research.md` §2) and returns it in subsequent reads.
- Does **not** reject a second submission with the same `personalEmail` —
  matches the spec's Edge Cases resolution (duplicate applications are an
  out-of-scope administrative concern).
- Idempotency (FR-017): the client is responsible for not double-submitting
  (disable the submit control while a request is in flight); the mock does
  not attempt server-side de-duplication, since there is no real backend
  here to enforce it — this is called out as a gap the future real
  integration must close.

---

## `POST {apiBaseUrl}/auth/login`

Authenticates with email + password (User Story 2; FR-009–FR-011).

**Request body** (`LoginRequest`):

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

**Success response** — `200`, body `LoginResponse`:

```ts
interface LoginResponse {
  user: AuthenticatedUser;
}
```

**Error response** — `401`, body `AuthErrorResponse`:

```ts
interface AuthErrorResponse {
  message: string; // always the same generic copy — see below
}
```

**Mock behavior**:
- Checks the submitted credentials against a small fixture list of
  pre-provisioned mock users (`mocks/fixtures/users.fixture.ts`).
- Returns the identical `401` / generic message for both "no such email"
  and "wrong password" (FR-010) — the mock deliberately does not
  distinguish these internally in a way the response could leak.
- No password-reset, MFA, or social-login endpoints exist in this contract
  — out of scope per spec Assumptions.

## `POST {apiBaseUrl}/auth/logout`

Ends the current session (FR-013).

**Request body**: none.

**Response**: `204`, no body. Mock behavior: clears the persisted mock
session; always succeeds.

---

## Explicitly not part of this contract

- Any endpoint for an administrator to review, approve, or reject an
  Enrollment Application — owned by the out-of-scope administrative
  process (spec Assumptions).
- Password reset, MFA, social login, "remember me" — out of scope (spec
  Assumptions).
- Real Keycloak/OIDC token exchange — see `research.md` §9: the real
  production login path is Authorization Code + PKCE against Keycloak,
  not this `POST /auth/login` shape. This contract exists to make the
  *mock* concrete and swappable, not to predetermine the real BFF's
  eventual auth integration design.
