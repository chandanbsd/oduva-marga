# Feature Specification: Enrollment Application and Login Pages

**Feature Branch**: `001-enrollment-application-login`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Update the frontend angular application, add angular material, add signal store ngrx, implement user signup and login pages. Note that the UI needs to be angular material and the UI must be a 100% responsive irrespective of screen size. The registeration page must accept the following fields: First name, Last name, Personal email, multiple address (home required, any additional allowed with label)."

## Clarifications

### Session 2026-08-18

- Q: What mechanism should stand in for the backend so the frontend can be built, run, and tested with zero dependency on a live API or BFF? → A: An in-app `HttpInterceptor` returning static/in-memory fixture data, gated by an environment flag (`environment.useMockApi`); swapping to a real backend later is a single configuration change, not a code change.
- Q: Should the mock-backed frontend be packaged as a demo-capable build for stakeholder review, or should mocking be strictly dev/test-time only? → A: Also buildable into a standalone demo artifact (e.g., `ng build --configuration=mock`), statically servable for stakeholder review and manual QA, in addition to `ng serve` and the automated test suite.
- Q: Beyond unit/component tests, should this feature also add end-to-end tests, or is component/unit-level testing sufficient? → A: Yes — add end-to-end tests using Playwright, driving real browser interactions against the mock-backed demo build, in addition to unit/component tests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit an Enrollment Application (Priority: P1)

A prospective student or faculty member provides their personal details —
including which type(s) of enrollment they are applying for and at least one
physical address — and submits an application for an administrator to
review. This is an *application*, not an account signup: submitting it does
not create login credentials. Reviewing, deciding on, and acting on
applications is handled by administrators through a separate process that is
out of scope for this feature.

**Why this priority**: This is the central new capability of the feature —
it is what makes the page valuable to the institution. It can be built and
deliver value (well-formed applicant data being captured and routed) on its
own, independent of the login page and of whatever review workflow the
administrative side eventually builds.

**Independent Test**: Can be fully tested by filling out the application
form with valid data (first name, last name, personal email, at least one
enrollment type, a home address, and optionally additional labeled
addresses) and confirming the submission is accepted, durably captured, and
the applicant receives an on-screen confirmation — against the mock backend
layer, with no dependency on the login page, a live API/BFF, or any
administrative feature.

**Acceptance Scenarios**:

1. **Given** a prospective applicant on the application page, **When** they enter first name, last name, personal email, select at least one enrollment type (Student and/or Faculty), provide a home address, and submit, **Then** the application is accepted and they see an on-screen confirmation that it was received.
2. **Given** an applicant filling out the form, **When** they add one or more additional addresses beyond the required home address, each with its own label (e.g., "Work", "Mailing"), **Then** all addresses are captured and associated with the submitted application.
3. **Given** an applicant on the form, **When** they attempt to submit without providing a home address, **Then** submission is blocked and the home address is flagged as required.
4. **Given** an applicant on the form, **When** they attempt to submit without selecting at least one enrollment type, **Then** submission is blocked and the enrollment type field is flagged as required.
5. **Given** an applicant on the form, **When** they enter a personal email in an invalid format, **Then** the field is flagged as invalid before submission is attempted.
6. **Given** an applicant successfully submits an application, **Then** no account or login credentials are created for them as part of this flow, and the confirmation they see makes clear their application will be reviewed rather than that they now have access.

---

### User Story 2 - Log In to Access the Application (Priority: P2)

A person who already holds valid account credentials (provisioned outside
this feature) opens the application and signs in with their email and
password so they can reach the authenticated part of the system.

**Why this priority**: Necessary for anyone — including staff who manage
applications — to reach any authenticated area of the system, but it is a
more generic, standalone capability than the application flow and does not
depend on it. It can be developed and fully tested using any pre-existing
account, independent of User Story 1.

**Independent Test**: Can be fully tested by attempting to log in with a
known-valid set of credentials and confirming the user reaches the
authenticated landing view, and separately by attempting with invalid
credentials and confirming access is denied with a clear, non-revealing
error — against the mock backend layer, independent of the application page
and of any live API/BFF.

**Acceptance Scenarios**:

1. **Given** a person with a valid, active account, **When** they enter their correct email and password on the login page and submit, **Then** they are authenticated and taken to the application's landing view for authenticated users.
2. **Given** a person on the login page, **When** they submit an incorrect password for a valid email, **Then** they see a clear error message that does not reveal whether the email exists, and remain on the login page able to retry.
3. **Given** a person on the login page, **When** they submit an email with no matching account, **Then** they see the same generic invalid-credentials message as the previous scenario (no account-existence disclosure).
4. **Given** a person on the login page, **When** they leave the email or password field empty and attempt to submit, **Then** inline validation prevents submission and identifies the missing field(s) without a round trip to the server.
5. **Given** an authenticated person anywhere in the application, **When** they choose to log out, **Then** their session ends and they are returned to an unauthenticated state.

---

### User Story 3 - Consistent, Fully Responsive Experience Across Devices (Priority: P3)

A person using the application or login page on any device — phone, tablet,
laptop, or large desktop monitor — experiences a layout that adapts to their
screen and remains fully usable, with every field, button, and message
readable and reachable.

**Why this priority**: This is a cross-cutting quality attribute rather than
a standalone capability, but it was explicitly called out as a hard
requirement ("100% responsive irrespective of screen size"), so it is
tracked as its own independently verifiable story: it can be validated (or
found to fail) without touching the business logic of the other two
stories.

**Independent Test**: Can be fully tested by loading both the application
page and the login page at a representative range of viewport widths (e.g.,
320px, 375px, 768px, 1024px, 1440px, 2560px) and confirming there is no
horizontal scrolling, no overlapping or clipped elements, and all controls
remain operable — independent of what data is entered.

**Acceptance Scenarios**:

1. **Given** a person on a small mobile screen (~320-375px wide), **When** they open the application or login page, **Then** all fields, labels, and buttons are visible and usable without horizontal scrolling or overlapping content.
2. **Given** a person on a tablet-sized screen, **When** they rotate the device between portrait and landscape, **Then** the layout reflows to remain fully usable in both orientations.
3. **Given** a person on a large desktop or ultra-wide monitor, **When** they open either page, **Then** the form content remains readable and sensibly laid out rather than stretching illegibly across the full width.
4. **Given** a person resizing a browser window, **When** the window crosses a breakpoint, **Then** no form data already entered is lost.

---

### Edge Cases

- What happens when someone submits an application using a personal email that already has a pending or previously submitted application? The system accepts the new submission without blocking it; identifying and reconciling duplicate applicants is left to the out-of-scope administrative review process.
- What happens when the application form submission fails partway through due to a network error? Already-entered data must not be silently lost, and retrying must not create more than one application record for the same submission attempt.
- Is there a reasonable maximum on how many additional addresses an applicant can add?
- What happens when two additional addresses are given the same label, or a label is left blank?
- How does the login page respond to repeated failed login attempts versus a single legitimate typo?
- What happens if a person's session expires while they are mid-way through filling out the application form?
- How are unusually long input values (e.g., a very long name) handled?
- What happens when the browser is refreshed partway through the application form — is partially entered data recoverable, or does the applicant start over?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an application page where a prospective applicant can submit First Name, Last Name, Personal Email, one or more Enrollment Types (Student and/or Faculty), a required Home address, and any number of additional labeled addresses.
- **FR-002**: The system MUST require First Name, Last Name, Personal Email, at least one Enrollment Type, and the Home address before allowing submission; additional addresses beyond Home are optional.
- **FR-003**: The system MUST validate that Personal Email is in a valid email format and MUST flag invalid input inline before the applicant attempts to submit.
- **FR-004**: The system MUST allow the applicant to add and remove any number of additional addresses, each carrying an applicant-supplied label that distinguishes it from the Home address and from other additional addresses.
- **FR-005**: The system MUST capture standard postal address details (street/line, city, state or region, postal/zip code, country) for the Home address and for each additional address.
- **FR-006**: The system MUST NOT create a user account or issue login credentials as part of application submission — submission only captures and routes the applicant's data for administrator review; the review/decision process itself is out of scope of this feature.
- **FR-007**: Upon successful submission, the system MUST show the applicant an on-screen confirmation that their application was received.
- **FR-008**: The system MUST durably persist submitted application data so it survives beyond the applicant's browser session (not lost on refresh or navigation away after successful submission).
- **FR-009**: The system MUST provide a separate login page where a person who already holds valid account credentials can authenticate using their email and password.
- **FR-010**: The system MUST reject login attempts with incorrect credentials and present a single generic error message that does not reveal whether the submitted email corresponds to an existing account.
- **FR-011**: The system MUST validate that required fields on the login page (email, password) are present before submitting, providing inline feedback for missing fields.
- **FR-012**: Upon successful login, the system MUST direct the authenticated person to the application's landing view for authenticated users and MUST make their authenticated state available consistently across the application (e.g., reflected in navigation) until they log out or their session expires.
- **FR-013**: The system MUST provide a way for an authenticated person to log out, ending their authenticated session.
- **FR-014**: The application and login pages MUST render correctly and remain fully operable across the full range of common device viewport widths, from small mobile phones through large desktop displays, without horizontal scrolling, clipped content, or unreachable controls.
- **FR-015**: The system MUST present the application and login experience using a single, consistent visual design system across every screen and control (buttons, inputs, selection controls, validation messages).
- **FR-016**: The system MUST preserve data an applicant has already entered in the application form when the browser window is resized or the device orientation changes.
- **FR-017**: The system MUST prevent a single user action (e.g., a double-clicked submit button, or a retry after a network hiccup) from creating more than one application record for the same submission.
- **FR-018**: The system MUST include an in-app mock backend layer that fulfills every network interaction the application and login pages need (submitting an application, authenticating a login, and their success/error responses), so the frontend can be built, run, and tested without any live API or BFF.
- **FR-019**: The system MUST allow switching between the mock backend layer and a real backend base URL via a single environment configuration change, with no changes required to page or component code.
- **FR-020**: The system MUST provide a dedicated build configuration that packages the mock backend layer into a standalone, statically servable demo build, so stakeholders and QA can click through the application and login pages before a real backend exists — distinct from the standard production build, which excludes mock code.
- **FR-021**: The system MUST include end-to-end tests, driving a real browser against the mock-backed demo build, covering at minimum: successful application submission, submission blocked by validation, successful login, and login rejected with invalid credentials.

### Key Entities *(include if feature involves data)*

- **Enrollment Application**: A single submission from a prospective student or faculty applicant. Attributes: applicant first name, last name, personal email, one or more selected enrollment types (Student and/or Faculty), a required home address, zero or more additional labeled addresses, and a submission timestamp. Carries no credential/authentication data. Review status and outcome belong to the out-of-scope administrative process.
- **Address**: A postal address associated with an Enrollment Application. Attributes: label ("Home" for the required entry, or an applicant-supplied custom label for additional entries), street/line(s), city, state/region, postal/zip code, and country.
- **User Account**: Represents a person who can authenticate via the login page. Provisioning of this entity is outside this feature's scope (assumed to already exist, or to be created later through the separate administrative process); this feature only consumes it at login time to check email + password and establish a session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A prospective applicant can complete and submit the enrollment application, including at least one additional labeled address, in under 4 minutes.
- **SC-002**: 100% of the application and login page content and controls remain fully visible, readable, and operable — without horizontal scrolling or overlapping elements — across viewport widths from 320px to 2560px.
- **SC-003**: A returning, credentialed user can log in and reach the authenticated landing view in under 15 seconds under normal network conditions.
- **SC-004**: At least 95% of applicants who begin the application form with valid information available to them are able to submit successfully on their first attempt, without external help, because validation feedback is clear enough to self-correct.
- **SC-005**: Users attempting to log in with incorrect credentials receive feedback within 2 seconds, and the message never reveals whether the submitted email has an associated account.
- **SC-006**: No entered application data is lost when the browser window is resized, rotated, or the device orientation changes mid-entry.
- **SC-007**: The frontend builds, runs, and its full automated test suite passes with zero network calls to any real backend or API.

## Assumptions

- This feature is scoped to the frontend Angular application only: the application (signup) page, the login page, their client-side validation, responsive layout, and the client-side state needed to drive them. It makes no real calls to any BFF/API — every backend interaction (submitting an application, authenticating a login) is simulated by an in-app mock layer, per the Clarifications above. Integrating with a real backend, and the specific API contract that integration will follow, is explicit future work out of scope here.
- The mock layer's fixture/response shapes stand in for the eventual real API contract; they should be defined as explicit TypeScript interfaces so the future real-backend integration is a matter of pointing the same typed calls at a live base URL, not reshaping data.
- A dedicated Angular build configuration packages the mock backend layer into a standalone, statically servable demo build for stakeholder/QA review before any real backend exists; this is additive to, not a replacement for, the standard production `ng build`, which excludes mock code entirely. Whether that demo build ever gets its own deployment path (container, nginx route, etc.) is a decision for planning/implementation, not this spec — and if it happens, it will be logged in `Infrastructure/INFRASTRUCTURE_DECISIONS.md` per the project's infrastructure-decision-record policy.
- "Application" (not "registration") is the intended framing: submitting the form does not create a user account or grant login access. Account/credential provisioning for accepted applicants happens through a separate, out-of-scope administrative process.
- Enrollment Type is a true multi-select: an applicant may indicate Student, Faculty, or both on a single application.
- The Home address requires standard postal fields (street/line, city, state/region, postal/zip code, country); the same field set applies to additional addresses. Additional address labels are free-text, applicant-supplied (e.g., "Work", "Mailing"), not a fixed predefined list.
- The login page uses a conventional email + password credential model. The application form itself does not include password creation, since no account is created at submission time.
- No password-reset, social login, "remember me," or multi-factor authentication flows are in scope for this feature — only the core application submission and email/password login.
- Duplicate applications from the same personal email are not blocked or deduplicated by this feature at submission time; identifying and reconciling duplicates is left to the out-of-scope administrative review process.
- Per explicit direction, the frontend implementation uses Angular Material as the UI component library, NgRx SignalStore (`@ngrx/signals`) for client-side state management, and Playwright for end-to-end testing; these are treated as given technical constraints for the planning phase rather than open choices to be re-evaluated here.
- The existing Angular application (currently a default generated skeleton with no routing content, Material, or NgRx installed) will be extended to add these pages and dependencies, not replaced.
- No email verification or confirmation-email step is required by this feature; an on-screen confirmation of submission is sufficient. An emailed receipt may be a reasonable future enhancement but is not required here.
