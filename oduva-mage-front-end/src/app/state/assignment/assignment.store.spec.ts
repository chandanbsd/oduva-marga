import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AssignmentStore } from './assignment.store';
import { Assignment, Submission } from '../../shared/models/assignment.model';

const assignment: Assignment = {
  id: 'a1',
  title: 'T',
  question: 'Q',
  createdAt: '2026-01-01T00:00:00.000Z',
  createdByEmail: 'alex.morgan@example.com'
};
const submission: Submission = {
  id: 's1',
  assignmentId: 'a1',
  studentEmail: 'jordan.taylor@example.com',
  studentName: 'Jordan Taylor',
  submittedAt: '2026-01-02T00:00:00.000Z',
  answer: { kind: 'text', text: 'hi' }
};

describe('AssignmentStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof AssignmentStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AssignmentStore]
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AssignmentStore);
  });

  afterEach(() => httpMock.verify());

  it('starts idle and empty', () => {
    expect(store.status()).toBe('idle');
    expect(store.assignments()).toEqual([]);
    expect(store.selected()).toBeNull();
    expect(store.submissions()).toEqual([]);
    expect(store.error()).toBeNull();
    expect(store.lastCreatedId()).toBeNull();
    expect(store.notice()).toBeNull();
    expect(store.submissionsLoaded()).toBeFalse();
  });

  it('loadList goes loading then idle with the assignments', () => {
    store.loadList();
    expect(store.status()).toBe('loading');
    expect(store.isLoading()).toBeTrue();

    httpMock.expectOne('/api/assignments').flush([assignment]);

    expect(store.status()).toBe('idle');
    expect(store.assignments()).toEqual([assignment]);
  });

  it('loadOne sets selected', () => {
    store.loadOne('a1');
    httpMock.expectOne('/api/assignments/a1').flush(assignment);

    expect(store.selected()).toEqual(assignment);
    expect(store.status()).toBe('idle');
  });

  it('loadOne on 404 surfaces the server message', () => {
    store.loadOne('nope');
    httpMock
      .expectOne('/api/assignments/nope')
      .flush({ message: 'Assignment not found.' }, { status: 404, statusText: 'Not Found' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Assignment not found.');
  });

  it('loadSubmissions sets submissions', () => {
    store.loadSubmissions('a1');
    httpMock.expectOne('/api/assignments/a1/submissions').flush([submission]);

    expect(store.submissions()).toEqual([submission]);
    expect(store.submissionsLoaded()).toBeTrue();
  });

  it('loadSubmissions marks submissionsLoaded false while in flight', () => {
    store.loadSubmissions('a1');

    expect(store.submissionsLoaded()).toBeFalse();
    httpMock.expectOne('/api/assignments/a1/submissions').flush([]);
  });

  it('create goes saving then saved with lastCreatedId', () => {
    store.create({ title: 'T', question: 'Q' });
    expect(store.status()).toBe('saving');
    expect(store.isSaving()).toBeTrue();

    httpMock.expectOne('/api/assignments').flush(assignment);

    expect(store.status()).toBe('saved');
    expect(store.isSaved()).toBeTrue();
    expect(store.lastCreatedId()).toBe('a1');
  });

  it('create 400 joins the field messages into error', () => {
    store.create({ title: '', question: '' });
    httpMock.expectOne('/api/assignments').flush(
      { errors: [{ field: 'title', message: 'Title is required.' }, { field: 'question', message: 'Question is required.' }] },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Title is required. Question is required.');
  });

  it('submit success is saved and submissions equals the response', () => {
    store.submit({ assignmentId: 'a1', answer: { kind: 'text', text: 'hi' } });
    const req = httpMock.expectOne('/api/assignments/a1/submissions');
    expect(req.request.body).toEqual({ answer: { kind: 'text', text: 'hi' } });
    req.flush(submission);

    expect(store.status()).toBe('saved');
    expect(store.submissions()).toEqual([submission]);
    expect(store.submissionsLoaded()).toBeTrue();
  });

  it('submit 409 reloads own submissions and ends idle without an error', () => {
    store.submit({ assignmentId: 'a1', answer: { kind: 'text', text: 'again' } });
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url === '/api/assignments/a1/submissions')
      .flush({ message: 'You have already submitted this assignment.' }, { status: 409, statusText: 'Conflict' });

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url === '/api/assignments/a1/submissions')
      .flush([submission]);

    expect(store.submissions()).toEqual([submission]);
    expect(store.status()).toBe('idle');
    expect(store.error()).toBeNull();
    expect(store.notice()).toBe('You had already submitted this assignment; showing your earlier answer.');
  });

  it('submit 400 surfaces the validation message', () => {
    store.submit({ assignmentId: 'a1', answer: { kind: 'text', text: ' ' } });
    httpMock
      .expectOne('/api/assignments/a1/submissions')
      .flush({ errors: [{ field: 'answer.text', message: 'Answer is required.' }] }, { status: 400, statusText: 'Bad Request' });

    expect(store.error()).toBe('Answer is required.');
  });

  it('falls back to a generic message for unexpected failures', () => {
    store.loadList();
    httpMock.expectOne('/api/assignments').error(new ProgressEvent('error'));

    expect(store.error()).toBe('Something went wrong. Please try again.');
  });

  it('reset clears error and lastCreatedId and returns to idle, keeping loaded data', () => {
    store.loadList();
    httpMock.expectOne('/api/assignments').flush([assignment]);
    store.create({ title: 'T', question: 'Q' });
    httpMock.expectOne('/api/assignments').flush(assignment);

    store.reset();

    expect(store.status()).toBe('idle');
    expect(store.error()).toBeNull();
    expect(store.lastCreatedId()).toBeNull();
    expect(store.assignments()).toEqual([assignment]);
  });
});
