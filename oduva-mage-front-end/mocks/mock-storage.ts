import { assignmentsFixture, submissionsFixture } from './fixtures/assignments.fixture';
import { enrollmentApplicationsFixture } from './fixtures/enrollment-applications.fixture';
import { Assignment, Submission } from '../src/app/shared/models/assignment.model';
import { AuthenticatedUser } from '../src/app/shared/models/auth.model';
import { EnrollmentApplication } from '../src/app/shared/models/enrollment-application.model';

export const STORAGE_KEY = 'oduva-marga:mock-api:v1';

export const STORAGE_FULL_MESSAGE = 'Mock storage is full. Clear site data and retry.';

export interface MockApiStorage {
  applications: EnrollmentApplication[];
  session: AuthenticatedUser | null;
  assignments: Assignment[];
  submissions: Submission[];
}

/** Assignments stored before marks existed get a default of 100 so old browser data keeps working. */
const LEGACY_DEFAULT_MAX_MARKS = 100;

function withMaxMarks(assignment: Assignment): Assignment {
  return assignment.maxMarks === undefined ? { ...assignment, maxMarks: LEGACY_DEFAULT_MAX_MARKS } : assignment;
}

function seed(): MockApiStorage {
  return {
    applications: [...enrollmentApplicationsFixture],
    session: null,
    assignments: [...assignmentsFixture],
    submissions: [...submissionsFixture]
  };
}

export function readStorage(): MockApiStorage {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seed();
    writeStorage(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MockApiStorage>;
    const upgraded: MockApiStorage = {
      applications: parsed.applications ?? [...enrollmentApplicationsFixture],
      session: parsed.session ?? null,
      assignments: (parsed.assignments ?? [...assignmentsFixture]).map(withMaxMarks),
      submissions: parsed.submissions ?? [...submissionsFixture]
    };
    // Written by the pre-assignments mock: persist the upgrade so later reads are stable.
    if (!parsed.assignments || !parsed.submissions || parsed.assignments.some((a) => a.maxMarks === undefined)) {
      writeStorage(upgraded);
    }
    return upgraded;
  } catch {
    const seeded = seed();
    writeStorage(seeded);
    return seeded;
  }
}

/** Lets `localStorage` errors (e.g. QuotaExceededError) propagate; handlers decide how to map them. */
export function writeStorage(storage: MockApiStorage): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

/**
 * Like `writeStorage`, but returns false when localStorage is full (QuotaExceededError) so callers can
 * answer 413 with `STORAGE_FULL_MESSAGE`; any other error still propagates.
 */
export function tryWriteStorage(storage: MockApiStorage): boolean {
  try {
    writeStorage(storage);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      return false;
    }
    throw err;
  }
}
