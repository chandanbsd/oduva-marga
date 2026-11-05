import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { mockApiInterceptor } from './mock-api.interceptor';
import { STORAGE_KEY } from '../../../../mocks/mock-storage';
import { Assignment, AssignmentSummary, Submission, SubmissionAnswer } from '../../shared/models/assignment.model';

const TEACHER = { email: 'alex.morgan@example.com', password: 'MockPass789!' };
const STUDENT = { email: 'jordan.taylor@example.com', password: 'MockPass123!' };
const OTHER_STUDENT = { email: 'sam.rivera@example.com', password: 'MockPass456!' };

function fileAnswer(sizeBytes: number, overrides: Record<string, unknown> = {}): SubmissionAnswer {
  return {
    kind: 'file',
    fileName: 'notes.txt',
    mimeType: 'text/plain',
    sizeBytes,
    dataUrl: 'data:text/plain;base64,aGk=',
    ...overrides
  } as SubmissionAnswer;
}

describe('assignments mock handler', () => {
  let http: HttpClient;

  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))] });
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  const login = (user: { email: string; password: string }) =>
    firstValueFrom(http.post('/api/auth/login', user));

  async function failure(promise: Promise<unknown>): Promise<HttpErrorResponse> {
    try {
      await promise;
    } catch (err) {
      return err as HttpErrorResponse;
    }
    throw new Error('expected the request to be rejected');
  }

  const create = () =>
    firstValueFrom(http.post<Assignment>('/api/assignments', { title: 'T', question: 'Q', maxMarks: 10 }));
  const submit = (id: string, answer: SubmissionAnswer) =>
    firstValueFrom(http.post<Submission>(`/api/assignments/${id}/submissions`, { answer }));

  it('rejects an unauthenticated list request with 401', async () => {
    const err = await failure(firstValueFrom(http.get('/api/assignments')));

    expect(err.status).toBe(401);
  });

  it('lets a teacher create an assignment that then appears in the list', async () => {
    await login(TEACHER);

    const created = await create();
    const list = await firstValueFrom(http.get<AssignmentSummary[]>('/api/assignments'));

    expect(created.id).toBeTruthy();
    expect(created.title).toBe('T');
    expect(created.maxMarks).toBe(10);
    expect(created.createdByEmail).toBe('alex.morgan@example.com');
    expect(list.some((a) => a.id === created.id)).toBeTrue();
  });

  it('forbids a student from creating an assignment (403)', async () => {
    await login(STUDENT);

    expect((await failure(create())).status).toBe(403);
  });

  it('returns 400 field errors for blank title and question', async () => {
    await login(TEACHER);

    const err = await failure(firstValueFrom(http.post('/api/assignments', { title: '   ', question: '', maxMarks: 10 })));

    expect(err.status).toBe(400);
    expect((err.error.errors as Array<{ field: string }>).map((e) => e.field)).toEqual(['title', 'question']);
  });

  it('flags submitted per assignment for students only', async () => {
    await login(TEACHER);
    const created = await create();
    await login(STUDENT);

    const before = await firstValueFrom(http.get<AssignmentSummary[]>('/api/assignments'));
    expect(before.find((a) => a.id === created.id)?.submitted).toBeFalse();

    await submit(created.id, { kind: 'text', text: 'my answer' });
    const after = await firstValueFrom(http.get<AssignmentSummary[]>('/api/assignments'));
    expect(after.find((a) => a.id === created.id)?.submitted).toBeTrue();

    await login(TEACHER);
    const teacherList = await firstValueFrom(http.get<AssignmentSummary[]>('/api/assignments'));
    expect('submitted' in teacherList[0]).toBeFalse();
  });

  it('returns 404 for an unknown assignment', async () => {
    await login(STUDENT);

    const err = await failure(firstValueFrom(http.get('/api/assignments/nope')));

    expect(err.status).toBe(404);
    expect(err.error).toEqual({ message: 'Assignment not found.' });
  });

  it('stores a text submission with the student identity from the session', async () => {
    await login(TEACHER);
    const created = await create();
    await login(STUDENT);

    const submission = await submit(created.id, { kind: 'text', text: 'my answer' });

    expect(submission.studentEmail).toBe('jordan.taylor@example.com');
    expect(submission.studentName).toBe('Jordan Taylor');
    expect(submission.answer).toEqual({ kind: 'text', text: 'my answer' });
  });

  it('rejects whitespace-only text with a 400 on answer.text', async () => {
    await login(STUDENT);

    const err = await failure(submit('seed-assignment-1', { kind: 'text', text: '   ' }));

    expect(err.status).toBe(400);
    expect(err.error.errors[0].field).toBe('answer.text');
  });

  it('accepts a file of exactly 1 MB', async () => {
    await login(STUDENT);

    const submission = await submit('seed-assignment-1', fileAnswer(1_048_576));

    expect(submission.answer.kind).toBe('file');
  });

  it('rejects a file over 1 MB with a 400 on answer.sizeBytes', async () => {
    await login(STUDENT);

    const err = await failure(submit('seed-assignment-1', fileAnswer(1_048_577)));

    expect(err.status).toBe(400);
    expect(err.error.errors[0].field).toBe('answer.sizeBytes');
  });

  it('rejects an empty file with a 400 on answer.sizeBytes', async () => {
    await login(STUDENT);

    const err = await failure(submit('seed-assignment-1', fileAnswer(0)));

    expect(err.error.errors[0].field).toBe('answer.sizeBytes');
  });

  it('rejects a non-data URL with a 400 on answer.dataUrl', async () => {
    await login(STUDENT);

    const err = await failure(submit('seed-assignment-1', fileAnswer(10, { dataUrl: 'http://x' })));

    expect(err.error.errors[0].field).toBe('answer.dataUrl');
  });

  it('rejects a blank file name with a 400 on answer.fileName', async () => {
    await login(STUDENT);

    const err = await failure(submit('seed-assignment-1', fileAnswer(10, { fileName: ' ' })));

    expect(err.error.errors[0].field).toBe('answer.fileName');
  });

  it('rejects a second submission by the same student with 409 and keeps one row', async () => {
    await login(STUDENT);
    await submit('seed-assignment-1', { kind: 'text', text: 'first' });

    const err = await failure(submit('seed-assignment-1', { kind: 'text', text: 'second' }));
    const mine = await firstValueFrom(http.get<Submission[]>('/api/assignments/seed-assignment-1/submissions'));

    expect(err.status).toBe(409);
    expect(err.error).toEqual({ message: 'You have already submitted this assignment.' });
    expect(mine.length).toBe(1);
    expect(mine[0].answer).toEqual({ kind: 'text', text: 'first' });
  });

  it('lets a different student still submit the same assignment', async () => {
    await login(STUDENT);
    await submit('seed-assignment-1', { kind: 'text', text: 'first' });
    await login(OTHER_STUDENT);

    const submission = await submit('seed-assignment-1', { kind: 'text', text: 'mine' });

    expect(submission.studentEmail).toBe('sam.rivera@example.com');
  });

  it('forbids a teacher from submitting (403)', async () => {
    await login(TEACHER);

    expect((await failure(submit('seed-assignment-1', { kind: 'text', text: 'x' }))).status).toBe(403);
  });

  it('returns 404 when submitting to an unknown assignment', async () => {
    await login(STUDENT);

    expect((await failure(submit('nope', { kind: 'text', text: 'x' }))).status).toBe(404);
  });

  it('shows a teacher all submissions and a student only their own', async () => {
    await login(STUDENT);
    await submit('seed-assignment-1', { kind: 'text', text: 'a' });
    await login(OTHER_STUDENT);
    await submit('seed-assignment-1', { kind: 'text', text: 'b' });

    const own = await firstValueFrom(http.get<Submission[]>('/api/assignments/seed-assignment-1/submissions'));
    await login(TEACHER);
    const all = await firstValueFrom(http.get<Submission[]>('/api/assignments/seed-assignment-1/submissions'));

    expect(own.map((s) => s.studentEmail)).toEqual(['sam.rivera@example.com']);
    expect(all.length).toBe(2);
  });

  it('returns 413 with a clear message when localStorage is full', async () => {
    await login(STUDENT);
    spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'));

    const err = await failure(submit('seed-assignment-1', fileAnswer(10)));

    expect(err.status).toBe(413);
    expect(err.error).toEqual({ message: 'Mock storage is full. Clear site data and retry.' });
  });

  it('rejects a missing, zero, negative or non-numeric maxMarks with a 400 on maxMarks', async () => {
    await login(TEACHER);

    for (const maxMarks of [undefined, 0, -5, 'abc', null]) {
      const err = await failure(firstValueFrom(http.post('/api/assignments', { title: 'T', question: 'Q', maxMarks })));
      expect(err.status).toBe(400);
      expect(err.error.errors.map((e: { field: string }) => e.field)).toEqual(['maxMarks']);
    }
  });

  it('accepts a fractional maxMarks', async () => {
    await login(TEACHER);

    const created = await firstValueFrom(
      http.post<Assignment>('/api/assignments', { title: 'T', question: 'Q', maxMarks: 12.5 })
    );

    expect(created.maxMarks).toBe(12.5);
  });

  describe('grading', () => {
    let assignmentId: string;
    let submissionId: string;

    beforeEach(async () => {
      await login(TEACHER);
      assignmentId = (await create()).id;
      await login(STUDENT);
      submissionId = (await submit(assignmentId, { kind: 'text', text: 'answer' })).id;
      await login(TEACHER);
    });

    const grade = (marks: unknown, id = submissionId, assignment = assignmentId) =>
      firstValueFrom(http.put<Submission>(`/api/assignments/${assignment}/submissions/${id}/grade`, { marks }));

    it('lets a teacher grade with a fraction; teacher and the student both see it', async () => {
      const graded = await grade(7.5);

      expect(graded.grade).toBe(7.5);
      const all = await firstValueFrom(http.get<Submission[]>(`/api/assignments/${assignmentId}/submissions`));
      expect(all[0].grade).toBe(7.5);
      await login(STUDENT);
      const own = await firstValueFrom(http.get<Submission[]>(`/api/assignments/${assignmentId}/submissions`));
      expect(own[0].grade).toBe(7.5);
    });

    it('accepts the boundaries 0 and maxMarks', async () => {
      expect((await grade(0)).grade).toBe(0);
      expect((await grade(10)).grade).toBe(10);
    });

    it('replaces an earlier grade', async () => {
      await grade(3);

      expect((await grade(9)).grade).toBe(9);
    });

    it('rejects marks above maxMarks, negative, or non-numeric with a 400 on marks', async () => {
      for (const marks of [10.5, -1, 'abc', null, undefined]) {
        const err = await failure(grade(marks));
        expect(err.status).toBe(400);
        expect(err.error.errors[0].field).toBe('marks');
      }
    });

    it('forbids a student from grading (403)', async () => {
      await login(STUDENT);

      expect((await failure(grade(5))).status).toBe(403);
    });

    it('returns 404 for an unknown submission or assignment', async () => {
      expect((await failure(grade(5, 'nope'))).status).toBe(404);
      expect((await failure(grade(5, submissionId, 'nope'))).status).toBe(404);
    });

    it('returns 413 when localStorage is full', async () => {
      spyOn(Storage.prototype, 'setItem').and.throwError(new DOMException('full', 'QuotaExceededError'));

      expect((await failure(grade(5))).status).toBe(413);
    });
  });
});
