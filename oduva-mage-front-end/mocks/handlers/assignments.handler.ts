import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { MockApiStorage, readStorage, writeStorage } from '../mock-storage';
import {
  Assignment,
  AssignmentSummary,
  MAX_ANSWER_FILE_BYTES,
  Submission,
  SubmissionAnswer
} from '../../src/app/shared/models/assignment.model';
import { AuthenticatedUser } from '../../src/app/shared/models/auth.model';

const SIMULATED_LATENCY_MS = 150;
const STORAGE_FULL_MESSAGE = 'Mock storage is full. Clear site data and retry.';

interface ValidationErrorEntry {
  field: string;
  message: string;
}

function reply(status: number, body: unknown): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status, body })).pipe(delay(SIMULATED_LATENCY_MS));
}

function fail(status: number, error: unknown, url: string): Observable<HttpEvent<unknown>> {
  return throwError(() => new HttpErrorResponse({ status, url, error })).pipe(delay(SIMULATED_LATENCY_MS));
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validateCreate(body: unknown): ValidationErrorEntry[] {
  const request = (body ?? {}) as { title?: unknown; question?: unknown };
  const errors: ValidationErrorEntry[] = [];
  if (isBlank(request.title)) {
    errors.push({ field: 'title', message: 'Title is required.' });
  }
  if (isBlank(request.question)) {
    errors.push({ field: 'question', message: 'Question is required.' });
  }
  return errors;
}

function validateAnswer(answer: Partial<SubmissionAnswer> | undefined): ValidationErrorEntry[] {
  if (answer?.kind === 'text') {
    return isBlank(answer.text) ? [{ field: 'answer.text', message: 'Answer is required.' }] : [];
  }
  if (answer?.kind === 'file') {
    const errors: ValidationErrorEntry[] = [];
    if (isBlank(answer.fileName)) {
      errors.push({ field: 'answer.fileName', message: 'File name is required.' });
    }
    const size = answer.sizeBytes;
    if (typeof size !== 'number' || size < 1 || size > MAX_ANSWER_FILE_BYTES) {
      errors.push({ field: 'answer.sizeBytes', message: 'File must be between 1 byte and 1 MB.' });
    }
    if (typeof answer.dataUrl !== 'string' || !answer.dataUrl.startsWith('data:')) {
      errors.push({ field: 'answer.dataUrl', message: 'File content must be a data URL.' });
    }
    return errors;
  }
  return [{ field: 'answer', message: 'An answer is required.' }];
}

/** Persists, mapping a full localStorage to the mock's 413; returns null on success. */
function persist(storage: MockApiStorage, url: string): Observable<HttpEvent<unknown>> | null {
  try {
    writeStorage(storage);
    return null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      return fail(413, { message: STORAGE_FULL_MESSAGE }, url);
    }
    throw err;
  }
}

/** Returns null when the request is not an assignments route, so the caller can fall through. */
export function handleAssignmentsRequest(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> | null {
  const path = req.url.split('?')[0];
  const collection = /\/assignments$/.exec(path);
  const item = /\/assignments\/([^/]+)$/.exec(path);
  const submissions = /\/assignments\/([^/]+)\/submissions$/.exec(path);

  const matched =
    (collection && (req.method === 'GET' || req.method === 'POST')) ||
    (item && req.method === 'GET') ||
    (submissions && (req.method === 'GET' || req.method === 'POST'));
  if (!matched) {
    return null;
  }

  const storage = readStorage();
  const user: AuthenticatedUser | null = storage.session;
  if (!user) {
    return fail(401, { message: 'Not signed in.' }, req.url);
  }

  if (collection) {
    return req.method === 'GET' ? list(storage, user) : create(storage, user, req);
  }
  const id = decodeURIComponent((submissions ?? item)![1]);
  const assignment = storage.assignments.find((a) => a.id === id);
  if (!assignment) {
    return fail(404, { message: 'Assignment not found.' }, req.url);
  }
  if (item) {
    return reply(200, assignment);
  }
  return req.method === 'GET' ? listSubmissions(storage, user, id) : submit(storage, user, id, req);
}

function list(storage: MockApiStorage, user: AuthenticatedUser): Observable<HttpEvent<unknown>> {
  const items: AssignmentSummary[] =
    user.role === 'student'
      ? storage.assignments.map((a) => ({
          ...a,
          submitted: storage.submissions.some((s) => s.assignmentId === a.id && s.studentEmail === user.email)
        }))
      : storage.assignments;
  return reply(200, items);
}

function create(storage: MockApiStorage, user: AuthenticatedUser, req: HttpRequest<unknown>) {
  if (user.role !== 'teacher') {
    return fail(403, { message: 'Only teachers can create assignments.' }, req.url);
  }
  const errors = validateCreate(req.body);
  if (errors.length > 0) {
    return fail(400, { errors }, req.url);
  }
  const body = req.body as { title: string; question: string };
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    question: body.question.trim(),
    createdAt: new Date().toISOString(),
    createdByEmail: user.email
  };
  storage.assignments.push(assignment);
  return persist(storage, req.url) ?? reply(201, assignment);
}

function listSubmissions(storage: MockApiStorage, user: AuthenticatedUser, assignmentId: string) {
  const forAssignment = storage.submissions.filter((s) => s.assignmentId === assignmentId);
  return reply(200, user.role === 'teacher' ? forAssignment : forAssignment.filter((s) => s.studentEmail === user.email));
}

function submit(storage: MockApiStorage, user: AuthenticatedUser, assignmentId: string, req: HttpRequest<unknown>) {
  if (user.role !== 'student') {
    return fail(403, { message: 'Only students can submit answers.' }, req.url);
  }
  const answer = (req.body as { answer?: Partial<SubmissionAnswer> } | null)?.answer;
  const errors = validateAnswer(answer);
  if (errors.length > 0) {
    return fail(400, { errors }, req.url);
  }
  if (storage.submissions.some((s) => s.assignmentId === assignmentId && s.studentEmail === user.email)) {
    return fail(409, { message: 'You have already submitted this assignment.' }, req.url);
  }
  const submission: Submission = {
    id: crypto.randomUUID(),
    assignmentId,
    studentEmail: user.email,
    studentName: user.displayName,
    submittedAt: new Date().toISOString(),
    answer: answer as SubmissionAnswer
  };
  storage.submissions.push(submission);
  return persist(storage, req.url) ?? reply(201, submission);
}
