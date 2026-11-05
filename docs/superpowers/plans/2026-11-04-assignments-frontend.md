# Assignments (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers create single-question assignments; students submit one answer (typed text or one uploaded file); teachers view submissions. Frontend only, against the mock API.

**Architecture:** Angular 17 standalone components + one NgRx SignalStore (`AssignmentStore`), plain API functions taking `HttpClient`, and a new mock handler file wired into the existing `mockApiInterceptor`. Role (`teacher` | `student`) is added to `AuthenticatedUser` and enforced by a `roleGuard`. An OpenAPI contract is committed first (constitution Principle II).

**Tech Stack:** Angular 17, Angular Material 17, `@ngrx/signals` 17, Karma/Jasmine, Playwright (e2e against `build:mock`).

**Spec:** `docs/superpowers/specs/2026-11-04-assignments-frontend-design.md`

## Global Constraints

- All paths below are relative to `oduva-mage-front-end/` unless prefixed `specs/` or `docs/` (repo root). Run commands from `oduva-mage-front-end/`.
- Work on branch `feature/assignments-frontend`; commit after every task.
- Test-first (constitution Principle I): write the failing test, see it fail, then implement.
- Single-spec run: `npx ng test --watch=false --browsers=ChromeHeadless --include='<spec path>'`. Full run: `npm test -- --watch=false --browsers=ChromeHeadless`.
- Naming follows the repo: pages are `<name>.page.{ts,html,scss,spec.ts}`, class `<Name>PageComponent`, selector `app-<name>-page`, standalone. API calls use `${environment.apiBaseUrl}` (`/api`). No `any` without an inline justification comment.
- Mock storage key stays `oduva-marga:mock-api:v1`.
- Roles: `'teacher' | 'student'`. Max uploaded file: `MAX_ANSWER_FILE_BYTES = 1_048_576` (1 MB); any file type; empty (0-byte) files rejected.
- Error bodies: validation `400 { errors: [{ field, message }] }` (existing shape); other errors `{ message: string }`.
- Error messages in the UI render in an element with `role="alert"`.
- Mock fixture credentials (new teacher): `alex.morgan@example.com` / `MockPass789!` / `Alex Morgan`. Existing `jordan.taylor@example.com` (`MockPass123!`) and `sam.rivera@example.com` (`MockPass456!`) become students.
- The auth store is memory-only: a full page reload logs the user out. Playwright tests must navigate by clicking links after login, never `page.goto` to a protected route.

## Review Focus

- Mock localStorage quota exceeded while storing a file submission: expect a clear 413 `{message}` and no half-written state, not an uncaught exception.
- Same student submits twice (double-click, second tab): expect the first answer kept, the UI showing it read-only, no duplicate rows.
- Whitespace-only title, question or answer text: expect rejection like empty input.
- Opening `/teacher/assignments/<unknown-id>` or a student visiting a teacher URL: expect "Assignment not found." alert / redirect to `/home`, never a blank page.
- A browser whose localStorage was written by the pre-assignments mock (no `assignments`/`submissions` keys): expect it to be upgraded in place, not crash.

---

### Task 1: API contract

**Files:**
- Create: `specs/002-assignments/contracts/assignments.openapi.yaml`

**Interfaces:**
- Produces: the shapes Tasks 2–8 implement. `AssignmentSummary` = `Assignment` plus optional `submitted: boolean`, present only when the caller is a student (this is how the student list shows Submitted / Not submitted; the spec's "submitted flag" is delivered by this field).

- [ ] **Step 1: Write the OpenAPI 3.0 document** with paths `GET /assignments`, `POST /assignments`, `GET /assignments/{id}`, `GET|POST /assignments/{id}/submissions` under server `/api`. Schemas: `Assignment`, `AssignmentSummary`, `CreateAssignmentRequest {title, question}`, `Submission`, `SubmitAnswerRequest {answer}`, `SubmissionAnswer` (oneOf text `{kind:'text', text}` / file `{kind:'file', fileName, mimeType, sizeBytes (1..1048576), dataUrl}` discriminated on `kind`), `ValidationError {errors:[{field,message}]}`, `ErrorMessage {message}`. Responses per spec: 200/201, 400, 401 (no session), 403 (wrong role), 404, 409 (duplicate submission), 413 (mock storage full). Roles: `POST /assignments` teacher only; `POST .../submissions` student only; `GET .../submissions` returns all for a teacher, only the caller's own for a student.
- [ ] **Step 2: Validate** — Run: `npx --yes @redocly/cli lint ../specs/002-assignments/contracts/assignments.openapi.yaml` — Expected: no errors (warnings about missing `info.license`/servers are acceptable).
- [ ] **Step 3: Commit** — `git add ../specs/002-assignments && git commit -m "Add assignments API contract"`

---

### Task 2: Roles — model, fixtures, login, roleGuard

**Files:**
- Modify: `src/app/shared/models/auth.model.ts`, `mocks/fixtures/users.fixture.ts`, `src/app/core/interceptors/mock-api.interceptor.ts` (`handleLogin`)
- Modify (add `role: 'student'` to typed `AuthenticatedUser` literals so they compile): `src/app/core/guards/auth.guard.spec.ts`, `src/app/features/auth/landing/landing.page.spec.ts`, `src/app/features/auth/login/login.page.spec.ts`, `src/app/state/auth/auth.store.spec.ts`
- Create: `src/app/core/guards/role.guard.ts`
- Test: `src/app/core/guards/role.guard.spec.ts`, `src/app/core/interceptors/mock-api.interceptor.spec.ts` (add cases)

**Interfaces:**
- Produces: `type UserRole = 'teacher' | 'student'` and `AuthenticatedUser.role: UserRole` in `auth.model.ts`; `MockUserFixture.role: UserRole`; `roleGuard(role: UserRole): CanActivateFn` in `role.guard.ts`.

- [ ] **Step 1: Write failing tests.**
  - `role.guard.spec.ts` (mirror `auth.guard.spec.ts` setup, logging in through `AuthStore` + `HttpTestingController`): `'allows a user whose role matches'` → `TestBed.runInInjectionContext(() => roleGuard('teacher')(...))` is `true` after a teacher login flush; `'redirects a user with the wrong role to /home'` → result is a `UrlTree` whose string equals `router.parseUrl('/home').toString()`; `'redirects an unauthenticated user to /login'`.
  - In the interceptor spec add: `'login returns role teacher for alex.morgan@example.com'` and `'login returns role student for jordan.taylor@example.com'` (POST `/api/auth/login`, assert `response.user.role`).
- [ ] **Step 2: Run to verify failure** — role guard spec fails to compile (`roleGuard` missing); interceptor cases fail on `role`.
- [ ] **Step 3: Implement.** Add `UserRole` and `role` to `AuthenticatedUser`; add `role` to `MockUserFixture`, make the two existing users `'student'`, append the teacher fixture; `handleLogin` copies `role` into the session user. `roleGuard`: unauthenticated → `router.createUrlTree(['/login'])`; authenticated with different role → `['/home']`; else `true`.
- [ ] **Step 4: Run the full suite** (`npm test -- --watch=false --browsers=ChromeHeadless`) — Expected: all pass, including the pre-existing specs.
- [ ] **Step 5: Commit** — `git add -A . && git commit -m "Add user roles and roleGuard"` (from the repo root use `git add oduva-mage-front-end`).

---

### Task 3: Assignment models, API functions, shared mock storage

**Files:**
- Create: `src/app/shared/models/assignment.model.ts`, `src/app/shared/api/assignment.api.ts`, `mocks/mock-storage.ts`, `mocks/fixtures/assignments.fixture.ts`
- Modify: `src/app/core/interceptors/mock-api.interceptor.ts` (import storage from `mocks/mock-storage.ts`, delete its local copies)
- Test: `src/app/shared/api/assignment.api.spec.ts`, `mocks/mock-storage.spec.ts` (add `mocks/**/*.spec.ts` to `tsconfig.spec.json` `include` if not already matched)

**Interfaces:**
- Produces in `assignment.model.ts`: `MAX_ANSWER_FILE_BYTES`; `Assignment {id,title,question,createdAt,createdByEmail}`; `AssignmentSummary extends Assignment {submitted?: boolean}`; `TextAnswer`, `FileAnswer`, `SubmissionAnswer = TextAnswer | FileAnswer` (fields exactly as the contract); `Submission {id,assignmentId,studentEmail,studentName,submittedAt,answer}`.
- Produces in `assignment.api.ts` (each takes `http: HttpClient` first): `listAssignments(http): Observable<AssignmentSummary[]>`; `getAssignment(http, id: string): Observable<Assignment>`; `createAssignment(http, request: CreateAssignmentRequest): Observable<Assignment>`; `listSubmissions(http, assignmentId: string): Observable<Submission[]>`; `submitAnswer(http, assignmentId: string, request: SubmitAnswerRequest): Observable<Submission>`; request types `CreateAssignmentRequest {title, question}`, `SubmitAnswerRequest {answer: SubmissionAnswer}`.
- Produces in `mocks/mock-storage.ts`: `STORAGE_KEY`, `interface MockApiStorage {applications; session; assignments: Assignment[]; submissions: Submission[]}`, `readStorage(): MockApiStorage`, `writeStorage(s: MockApiStorage): void` (lets `localStorage` errors propagate). `assignments.fixture.ts` exports `assignmentsFixture: Assignment[]` (two seeded assignments, `createdByEmail` = the teacher fixture's email) and `submissionsFixture: Submission[] = []`.

- [ ] **Step 1: Write failing tests.**
  - `assignment.api.spec.ts` (`HttpTestingController`): `'listAssignments GETs /api/assignments'`, `'getAssignment GETs /api/assignments/a1'`, `'createAssignment POSTs /api/assignments with the request body'`, `'listSubmissions GETs /api/assignments/a1/submissions'`, `'submitAnswer POSTs /api/assignments/a1/submissions with {answer}'`.
  - `mock-storage.spec.ts`: `'seeds assignments and submissions from fixtures when storage is empty'`; `'fills missing assignments/submissions with fixtures/[] when stored JSON predates them'` (set key to `{"applications":[],"session":null}` then `readStorage()` has `assignments` equal to the fixture and `submissions` equal to `[]`); `'upgrades without losing existing applications'`.
- [ ] **Step 2: Run to verify failure** (missing modules).
- [ ] **Step 3: Implement** models, API functions, fixtures, and move `readStorage`/`writeStorage`/`MockApiStorage` out of the interceptor into `mocks/mock-storage.ts`, adding defaulting of the two new keys on read (write back the upgraded object).
- [ ] **Step 4: Run the full suite** — Expected: all pass (existing interceptor tests prove the move is behavior-neutral).
- [ ] **Step 5: Commit** — `git commit -m "Add assignment models, API functions and shared mock storage"`.

---

### Task 4: Mock assignments handler

**Files:**
- Create: `mocks/handlers/assignments.handler.ts`
- Modify: `src/app/core/interceptors/mock-api.interceptor.ts` (delegate first, before the existing branches)
- Test: `mocks/handlers/assignments.handler.spec.ts`

**Interfaces:**
- Consumes: `readStorage`/`writeStorage` (Task 3), models (Task 3), `SIMULATED_LATENCY_MS` pattern (150 ms `delay`).
- Produces: `handleAssignmentsRequest(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> | null` — returns `null` when the URL/method is not an assignments route. Routes match on `/assignments`, `/assignments/<id>`, `/assignments/<id>/submissions` path suffixes.

- [ ] **Step 1: Write failing tests** (real `HttpClient` + `mockApiInterceptor`, cleared storage, log in first via `POST /api/auth/login`; helpers to log in as teacher/student). Assertions:
  - no session → `GET /api/assignments` rejects with status 401.
  - teacher `POST /api/assignments {title:'T',question:'Q'}` → 201, body has `id`, `title:'T'`, `createdByEmail:'alex.morgan@example.com'`; a following GET includes it.
  - student `POST /api/assignments` → 403.
  - `{title:'   ',question:''}` → 400 with errors on fields `title` and `question`.
  - student `GET /api/assignments` items each have `submitted:false`; after the student submits, that item has `submitted:true`; teacher list items have no `submitted` property.
  - `GET /api/assignments/nope` → 404 `{message:'Assignment not found.'}`.
  - student text submission → 201 with `studentEmail`/`studentName` from the session and the answer echoed; `{kind:'text',text:'   '}` → 400 field `answer.text`.
  - file answer with `sizeBytes` 1048576 → 201; 1048577 → 400 field `answer.sizeBytes`; 0 → 400 field `answer.sizeBytes`; `dataUrl:'http://x'` → 400 field `answer.dataUrl`; blank `fileName` → 400 field `answer.fileName`.
  - second submission by the same student → 409 `{message:'You have already submitted this assignment.'}` and stored submissions count unchanged; a different student can still submit.
  - teacher `POST .../submissions` → 403; submission to unknown assignment → 404.
  - `GET .../submissions`: teacher gets all, student gets only their own.
  - quota: after login, `spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'))`, then a file submission → 413 `{message:'Mock storage is full. Clear site data and retry.'}`.
  - non-assignments URLs still reach the existing handlers (existing interceptor spec stays green).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** `handleAssignmentsRequest`. Session role comes from `readStorage().session.role`. IDs via `crypto.randomUUID()`; titles/questions trimmed on store; text answers stored as typed. Wrap `writeStorage` for create/submit in try/catch mapping `QuotaExceededError` to the 413 above (check `err instanceof DOMException && err.name === 'QuotaExceededError'`). Wire into the interceptor: `const assignments = handleAssignmentsRequest(req); if (assignments) return assignments;`.
- [ ] **Step 4: Run the full suite** — Expected: pass.
- [ ] **Step 5: Commit** — `git commit -m "Add mock assignments handler"`.

---

### Task 5: AssignmentStore

**Files:**
- Create: `src/app/state/assignment/assignment.store.ts`
- Test: `src/app/state/assignment/assignment.store.spec.ts` (setup like `enrollment-application.store.spec.ts`)

**Interfaces:**
- Consumes: API functions and models (Task 3).
- Produces `AssignmentStore` (`providedIn: 'root'`). State: `assignments: AssignmentSummary[]`, `selected: Assignment | null`, `submissions: Submission[]`, `status: 'idle'|'loading'|'saving'|'saved'|'error'`, `error: string | null`, `lastCreatedId: string | null`. Computed: `isLoading`, `isSaving`, `isSaved`. Methods (`rxMethod`): `loadList(void)`, `loadOne(id: string)`, `loadSubmissions(assignmentId: string)`, `create(request: CreateAssignmentRequest)`, `submit({assignmentId: string; answer: SubmissionAnswer})`; plain `reset(): void` (status `idle`, `error` null, `lastCreatedId` null; keeps loaded data).
- Error message extraction: joined `errors[].message` if present, else body `message`, else a generic "Something went wrong. Please try again."

- [ ] **Step 1: Write failing tests:** initial state is idle/empty; `loadList` → status `loading` then `idle` with `assignments` set; `loadOne` sets `selected`; `loadOne` on 404 `{message:'Assignment not found.'}` → status `error`, `error` equals that message; `loadSubmissions` sets `submissions`; `create` → `saving`, then `saved` with `lastCreatedId` = response id; `create` 400 → `error` equals the joined field messages; `submit` success → `saved` and `submissions` equals `[response]`; `submit` 409 → store then GETs `/api/assignments/a1/submissions`, flushing `[existing]` yields `submissions=[existing]`, status `idle`, `error` null; `reset()` clears `error`/`lastCreatedId` and sets `idle`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** the store (`switchMap` per method; the 409 branch in `submit`'s `catchError` returns `listSubmissions(...)` and patches the result).
- [ ] **Step 4: Run the spec, then full suite** — Expected: pass.
- [ ] **Step 5: Commit** — `git commit -m "Add AssignmentStore"`.

---

### Task 6: Routes, landing links, teacher list and create pages

**Files:**
- Modify: `src/app/app.routes.ts`, `src/app/features/auth/landing/landing.page.{ts,html,spec.ts}`
- Create: `src/app/features/assignments/teacher/assignment-list/assignment-list.page.{ts,html,scss,spec.ts}` (`TeacherAssignmentListPageComponent`), `src/app/features/assignments/teacher/assignment-create/assignment-create.page.{ts,html,scss,spec.ts}` (`AssignmentCreatePageComponent`)

**Interfaces:**
- Consumes: `AssignmentStore` (Task 5), `roleGuard` (Task 2).
- Produces routes (all `loadComponent`, `canActivate: [roleGuard(...)]`): `teacher/assignments`, `teacher/assignments/new` (declared before `:id`), `teacher/assignments/:id` (component added in Task 7), `student/assignments`, `student/assignments/:id` (components added in Task 8). Until Tasks 7/8, register only the routes whose components exist.

- [ ] **Step 1: Write failing tests** (`provideRouter`, `HttpTestingController`):
  - landing: teacher sees a link `Manage assignments` with `href="/teacher/assignments"`; student sees `My assignments` → `/student/assignments`.
  - list: calls `GET /api/assignments`; renders one row per assignment with the title linking to `/teacher/assignments/<id>`; `New assignment` link to `/teacher/assignments/new`; empty list shows `No assignments yet.`; `Back to home` link to `/home`; a load error renders in `role="alert"`.
  - create: submitting empty shows `Title is required.` and `Question is required.` and makes **no** request; whitespace-only values behave the same; valid submit POSTs `{title, question}`; after `saved` the router navigates to `/teacher/assignments`; a server error renders in `role="alert"`; the submit button is disabled while `isSaving()`; page calls `store.reset()` on init.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** the pages (Angular Material form fields/buttons like the enrollment page; reactive form, `Validators` plus a trim-check) and routes; landing renders the role-specific link via `RouterLink`.
- [ ] **Step 4: Run the full suite.**
- [ ] **Step 5: Commit** — `git commit -m "Add teacher assignment list and create pages"`.

---

### Task 7: Teacher assignment detail with submissions and file download

**Files:**
- Create: `src/app/shared/util/download-data-url.ts`, `src/app/shared/util/download-data-url.spec.ts`, `src/app/features/assignments/teacher/assignment-detail/assignment-detail.page.{ts,html,scss,spec.ts}` (`TeacherAssignmentDetailPageComponent`)
- Modify: `src/app/app.routes.ts` (add `teacher/assignments/:id`)

**Interfaces:**
- Produces: `downloadDataUrl(fileName: string, dataUrl: string): void` — decodes a `data:<mime>;base64,<payload>` URL to a `Blob`, creates an object URL, clicks a temporary `<a download=fileName>`, then revokes the URL. (Do not bind data URLs to `[href]`: Angular rewrites unsafe URLs to `unsafe:`; do not use `bypassSecurityTrustUrl` on student-supplied data.)

- [ ] **Step 1: Write failing tests.**
  - util: `'creates a Blob of the decoded bytes with the data URL mime type'` (spy `URL.createObjectURL`, assert blob `type` and `size`); `'sets the anchor download name exactly as given'` (use `'my résumé (1).pdf'`); `'revokes the object URL'`.
  - page: loads `GET /api/assignments/a1` and `.../a1/submissions`; shows title and question; each text submission shows student name, submitted time and the text; each file submission shows file name, size and a `Download` button that calls `downloadDataUrl` with that file's `fileName` and `dataUrl` (spy on the util via a thin component method); empty list shows `No submissions yet.`; a 404 shows `Assignment not found.` in `role="alert"`; `Back to assignments` link to `/teacher/assignments`.
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** util (base64 → `Uint8Array` via `atob`) and page; route `teacher/assignments/:id` guarded by `roleGuard('teacher')`, id read from `ActivatedRoute` (`withComponentInputBinding` is not enabled — use `ActivatedRoute.snapshot.paramMap`).
- [ ] **Step 4: Run the full suite.**
- [ ] **Step 5: Commit** — `git commit -m "Add teacher assignment detail and file download"`.

---

### Task 8: Student list and detail/submit pages

**Files:**
- Create: `src/app/shared/util/read-file-as-data-url.ts` (+ `.spec.ts`), `src/app/features/assignments/student/assignment-list/assignment-list.page.{ts,html,scss,spec.ts}` (`StudentAssignmentListPageComponent`), `src/app/features/assignments/student/assignment-detail/assignment-detail.page.{ts,html,scss,spec.ts}` (`StudentAssignmentDetailPageComponent`)
- Modify: `src/app/app.routes.ts` (add `student/assignments`, `student/assignments/:id`, guarded by `roleGuard('student')`)

**Interfaces:**
- Produces: `readFileAsDataUrl(file: File): Promise<string>` (FileReader, rejects on error).
- Consumes: `AssignmentStore`, `MAX_ANSWER_FILE_BYTES`.

- [ ] **Step 1: Write failing tests.**
  - util: resolves a string beginning `data:` containing the base64 of the file bytes.
  - list: one row per assignment, title links to `/student/assignments/<id>`, shows `Submitted` when `submitted` is true else `Not submitted`; `No assignments yet.` when empty; `Back to home`.
  - detail, not yet submitted (`submissions` GET returns `[]`): shows the question and a toggle `Type answer` / `Upload file` (default Type); empty text → `Answer is required.`, no POST; whitespace-only text → same; valid text → POST `/api/assignments/a1/submissions` with body `{answer:{kind:'text',text:'my answer'}}`; switching to `Upload file` and choosing a 1 MB + 1 byte file → `File must be 1 MB or smaller.`, no POST; a 0-byte file → `File is empty.`, no POST; a valid file → POST body `{answer:{kind:'file',fileName,mimeType,sizeBytes,dataUrl}}` with `dataUrl` from `readFileAsDataUrl`; a file of exactly 1,048,576 bytes is accepted; after success the form is replaced by a read-only view of the submitted answer (text or file name + size).
  - detail, already submitted on load: no form, read-only answer shown.
  - duplicate (POST returns 409, follow-up GET returns the existing submission): read-only view of the existing answer, no error alert left behind.
  - 404 on load → `Assignment not found.` in `role="alert"`.
  - Submit button disabled while `isSaving()` (guards double-click).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** util, pages and routes. Detail page calls `loadOne(id)` and `loadSubmissions(id)` on init; the form is shown only when `submissions().length === 0`. Size check happens before reading the file.
- [ ] **Step 4: Run the full suite.**
- [ ] **Step 5: Commit** — `git commit -m "Add student assignment list and submit pages"`.

---

### Task 9: End-to-end test, lint, build, docs

**Files:**
- Create: `e2e/assignments.spec.ts`
- Modify: `../CODING_STANDARDS.md` (only if it lists frontend directory/conventions that now omit `mocks/handlers/` and `src/app/shared/util/`; add them there, otherwise leave unchanged and say so in the commit message)

- [ ] **Step 1: Write the e2e test** (single `test`, one browser context so localStorage persists across logins): teacher logs in (`alex.morgan@example.com`), clicks `Manage assignments` → `New assignment`, fills `Title`/`Question`, submits, sees the title in the list, clicks `Back to home` then `Log out`; `page.goto('/login')`; student `jordan.taylor@example.com` logs in, `My assignments` → opens it → submits text; logs out; student `sam.rivera@example.com` → submits a file via `setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer })`; logs out; teacher logs in, opens the assignment and sees both submissions (`Jordan Taylor` with the text, `Sam Rivera` with `notes.txt`), and clicking `Download` triggers a Playwright `download` event named `notes.txt`. Add a second small test: a student's landing page shows `My assignments` and does not show `Manage assignments`.
- [ ] **Step 2: Run** — `npm run e2e` — Expected: all Playwright tests pass (including existing login/enrollment).
- [ ] **Step 3: Run** `npm run lint`, `npm run build`, `npm run build:mock`, and the full unit suite — Expected: no lint errors, builds succeed, all tests pass.
- [ ] **Step 4: Update docs** as described under Files.
- [ ] **Step 5: Commit** — `git commit -m "Add assignments e2e test and docs"`.
