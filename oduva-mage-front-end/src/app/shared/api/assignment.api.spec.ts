import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import {
  createAssignment,
  getAssignment,
  gradeSubmission,
  listAssignments,
  listSubmissions,
  submitAnswer
} from './assignment.api';

describe('assignment.api', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listAssignments GETs /api/assignments', () => {
    listAssignments(http).subscribe();
    expect(httpMock.expectOne('/api/assignments').request.method).toBe('GET');
  });

  it('getAssignment GETs /api/assignments/a1', () => {
    getAssignment(http, 'a1').subscribe();
    expect(httpMock.expectOne('/api/assignments/a1').request.method).toBe('GET');
  });

  it('createAssignment POSTs /api/assignments with the request body', () => {
    createAssignment(http, { title: 'T', question: 'Q', maxMarks: 10 }).subscribe();
    const req = httpMock.expectOne('/api/assignments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'T', question: 'Q', maxMarks: 10 });
  });

  it('listSubmissions GETs /api/assignments/a1/submissions', () => {
    listSubmissions(http, 'a1').subscribe();
    expect(httpMock.expectOne('/api/assignments/a1/submissions').request.method).toBe('GET');
  });

  it('gradeSubmission PUTs /api/assignments/a1/submissions/s1/grade with {marks}', () => {
    gradeSubmission(http, 'a1', 's1', 7.5).subscribe();
    const req = httpMock.expectOne('/api/assignments/a1/submissions/s1/grade');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ marks: 7.5 });
  });

  it('submitAnswer POSTs /api/assignments/a1/submissions with {answer}', () => {
    submitAnswer(http, 'a1', { answer: { kind: 'text', text: 'hi' } }).subscribe();
    const req = httpMock.expectOne('/api/assignments/a1/submissions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ answer: { kind: 'text', text: 'hi' } });
  });
});
