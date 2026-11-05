# Assignments (Frontend) — Design

Date: 2026-11-04
Scope: `oduva-mage-front-end` only, against the in-browser mock API. No BFF/core-service work.

## Goal

Teachers create assignments; students submit answers. An assignment is a single question. A student's answer is either typed text or one uploaded file.

## Decisions

- **Audience:** every student sees every assignment. No course/class model.
- **Roles:** `AuthenticatedUser.role: 'teacher' | 'student'`. Mock users gain a role; one teacher fixture is added, the two existing users become students.
- **Lifecycle:** a student submits once per assignment; the submission is then read-only. The teacher views submissions. No grading, feedback, resubmission or due dates.
- **Assignment fields:** `title`, `question` (both required). No due date.
- **Files:** any type, max 1 MB. The mock stores the content as a data URL in localStorage so the teacher can download it.
- **Approach:** follow existing patterns (SignalStore + `rxMethod`, plain API functions taking `HttpClient`, mock interceptor). Mock handlers for this feature live in their own file instead of growing `mock-api.interceptor.ts`. No broader interceptor refactor.

## Routes

| Route | Role | Page |
|---|---|---|
| `/home` | any authed | Existing landing; shows role-specific link ("Manage assignments" / "My assignments") |
| `/teacher/assignments` | teacher | List of assignments + "New assignment" button |
| `/teacher/assignments/new` | teacher | Create form (title, question) |
| `/teacher/assignments/:id` | teacher | Assignment detail + submissions (student, time, text or file download) |
| `/student/assignments` | student | All assignments with Submitted / Not submitted marker |
| `/student/assignments/:id` | student | Question; submit form if not yet submitted, else read-only view of own answer |

Feature routes are lazy-loaded. `roleGuard(role)` builds on `authGuard`; a wrong-role user is redirected to `/home`.

## Data model

- `Assignment`: `id`, `title`, `question`, `createdAt`, `createdByEmail`.
- `Submission`: `id`, `assignmentId`, `studentEmail`, `studentName`, `submittedAt`, `answer`.
- `answer`: `{ kind: 'text', text }` | `{ kind: 'file', fileName, mimeType, sizeBytes, dataUrl }`.

## API contract (written first, per constitution Principle II)

`specs/002-assignments/contracts/assignments.openapi.yaml`:

- `GET /assignments`
- `POST /assignments` (teacher)
- `GET /assignments/{id}`
- `POST /assignments/{id}/submissions` (student)
- `GET /assignments/{id}/submissions` (teacher: all; student: own only)

Errors: 400 `{errors:[{field,message}]}` (same shape as enrollment), 403 wrong role, 404 unknown assignment, 409 duplicate submission.

## Frontend structure

- `shared/models/assignment.model.ts`, `shared/api/assignment.api.ts` (functions take `HttpClient`).
- `state/assignment/assignment.store.ts`: state `assignments`, `selected`, `submissions`, `status`, `error`; methods `loadList`, `loadOne`, `create`, `submit`, `loadSubmissions` via `rxMethod`; computed `isSubmitting` and per-assignment submitted flag for the current student.
- `features/assignments/teacher/*` and `features/assignments/student/*` pages (Angular Material).
- `core/guards/role.guard.ts`.
- `mocks/handlers/assignments.handler.ts` wired into `mockApiInterceptor` by URL match; reads session role from the mock storage; `mocks/fixtures/assignments.fixture.ts` seeds two assignments; `users.fixture.ts` gains roles and a teacher.

## Validation & errors

- Title and question required. Submission requires non-empty text or a file; the form toggles between "Type answer" and "Upload file".
- Files over 1 MB are rejected client-side with an inline message; the mock also enforces the cap.
- API errors surface inline using the same message-extraction approach as the enrollment store.

## Testing (test-first)

- Unit: store, API functions, mock handlers, role guard, each page component.
- Playwright e2e on the mock build: teacher creates assignment → student submits text → another student submits a file → teacher sees both and downloads the file.

## Docs

Update `CODING_STANDARDS.md` only if new conventions are introduced. `Infrastructure/INFRASTRUCTURE_DECISIONS.md` is not affected.

## Out of scope

Courses/classes, student targeting, due dates, resubmission, grading/feedback, real BFF/core-service endpoints, real file storage.
