# Phase 1 Data Model: Enrollment Application and Login Pages

These are the frontend-side TypeScript shapes (`shared/models/*.model.ts`)
used by the pages, the SignalStores, and the mock interceptor alike. They
are the same shapes a future real-backend integration is expected to
implement — see `contracts/mock-api-contract.md` for the request/response
envelopes built on top of them.

## EnrollmentApplication

Represents one submission from a prospective student or faculty applicant
(spec Key Entities; FR-001–FR-008).

| Field | Type | Required | Rule |
|---|---|---|---|
| `id` | `string` | generated | Assigned by the mock/backend on successful submission (e.g. UUID); never set by the client. |
| `firstName` | `string` | yes | Non-empty after trim (FR-002). |
| `lastName` | `string` | yes | Non-empty after trim (FR-002). |
| `personalEmail` | `string` | yes | Must match a standard email pattern (FR-003); validated inline before submit. |
| `enrollmentTypes` | `EnrollmentType[]` | yes | At least one entry (FR-002); duplicates not possible since it's a set-like multi-select. |
| `homeAddress` | `Address` | yes | `label` is fixed to `"Home"` (FR-001, FR-005). |
| `additionalAddresses` | `Address[]` | no | 0–5 entries (planning default filling the spec's open "reasonable maximum" edge case; revisit if a real requirement emerges). Each entry's `label` MUST be non-blank and unique (case-insensitive) among the applicant's additional addresses (planning default resolving the spec's open "duplicate/blank label" edge case) — enforced as inline form validation, mirroring the pattern already used for `personalEmail`. |
| `submittedAt` | `string` (ISO 8601) | generated | Set by the mock/backend at submission time, not the client. |

Out of scope for this entity (explicitly, per spec Assumptions): any review
status, decision, or reviewer — those belong to the future, out-of-scope
administrative process. This feature's data model has no `status` field for
that reason; a submission simply exists once accepted.

## Address

A postal address, embedded in an `EnrollmentApplication` — either the
required home address or one of the optional additional addresses (FR-004,
FR-005).

| Field | Type | Required | Rule |
|---|---|---|---|
| `label` | `string` | yes | `"Home"` for the required entry (not user-editable); applicant-supplied free text for additional entries — non-blank, unique per application (see above). |
| `street1` | `string` | yes | Non-empty after trim. |
| `street2` | `string` | no | — |
| `city` | `string` | yes | Non-empty after trim. |
| `stateRegion` | `string` | yes | Non-empty after trim (no fixed enum — international addresses are in scope, so this stays free text). |
| `postalCode` | `string` | yes | Non-empty after trim (no format enforced beyond presence — postal formats vary too widely by country to validate strictly here). |
| `country` | `string` | yes | Non-empty after trim. |

## EnrollmentType

```ts
type EnrollmentType = 'STUDENT' | 'FACULTY';
```

Fixed, closed set — matches the spec's explicit "Student and/or Faculty"
wording (Clarifications). Not user-extensible.

## LoginCredentials (request shape)

| Field | Type | Required | Rule |
|---|---|---|---|
| `email` | `string` | yes | Non-empty (FR-011); format is not re-validated as strictly as `personalEmail` since this is an existing-account lookup, not new data capture. |
| `password` | `string` | yes | Non-empty (FR-011); never logged, never persisted beyond the in-flight request. |

## AuthenticatedUser (client-side session projection)

Represents the "User Account" key entity from the spec, as far as this
feature ever sees it — a thin, client-side view established after a
successful login, not the account record itself (provisioning owned
elsewhere, out of scope).

| Field | Type | Notes |
|---|---|---|
| `email` | `string` | The email used to authenticate. |
| `displayName` | `string` | Mock-supplied for this feature (e.g. derived from the fixture user); a real backend would return this from the account record. |
| `authenticatedAt` | `string` (ISO 8601) | Set client-side at successful login; used to drive FR-012's "reflected in navigation" authenticated state. |

No password or credential material is ever stored in this shape or in the
auth SignalStore beyond the moment of submission.

## Client State Shapes (NgRx SignalStore)

Not persisted entities — the two SignalStores from `plan.md`'s Project
Structure compose the shapes above into view-state:

- **`auth.store.ts`**: `{ user: AuthenticatedUser | null; status: 'idle' | 'authenticating' | 'authenticated' | 'error'; error: string | null }`
- **`enrollment-application.store.ts`**: `{ draft: Partial<EnrollmentApplication>; status: 'idle' | 'submitting' | 'submitted' | 'error'; error: string | null; lastSubmission: { id: string; submittedAt: string } | null }`

Both stores read/write exclusively through the typed API-client functions
described in `contracts/mock-api-contract.md` — they never talk to the mock
interceptor or `localStorage` directly, which is what keeps the future
swap to a real backend a configuration change rather than a store rewrite
(FR-019).
