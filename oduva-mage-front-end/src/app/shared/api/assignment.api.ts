import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Assignment, AssignmentSummary, Submission, SubmissionAnswer } from '../models/assignment.model';

export interface CreateAssignmentRequest {
  title: string;
  question: string;
  maxMarks: number;
}

export interface SubmitAnswerRequest {
  answer: SubmissionAnswer;
}

// Plain functions taking `http` (not an injectable service), matching the other `*.api.ts` files.

export function listAssignments(http: HttpClient): Observable<AssignmentSummary[]> {
  return http.get<AssignmentSummary[]>(`${environment.apiBaseUrl}/assignments`);
}

export function getAssignment(http: HttpClient, id: string): Observable<Assignment> {
  return http.get<Assignment>(`${environment.apiBaseUrl}/assignments/${encodeURIComponent(id)}`);
}

export function createAssignment(http: HttpClient, request: CreateAssignmentRequest): Observable<Assignment> {
  return http.post<Assignment>(`${environment.apiBaseUrl}/assignments`, request);
}

export function listSubmissions(http: HttpClient, assignmentId: string): Observable<Submission[]> {
  return http.get<Submission[]>(
    `${environment.apiBaseUrl}/assignments/${encodeURIComponent(assignmentId)}/submissions`
  );
}

export function submitAnswer(
  http: HttpClient,
  assignmentId: string,
  request: SubmitAnswerRequest
): Observable<Submission> {
  return http.post<Submission>(
    `${environment.apiBaseUrl}/assignments/${encodeURIComponent(assignmentId)}/submissions`,
    request
  );
}

export function gradeSubmission(
  http: HttpClient,
  assignmentId: string,
  submissionId: string,
  marks: number
): Observable<Submission> {
  return http.put<Submission>(
    `${environment.apiBaseUrl}/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}/grade`,
    { marks }
  );
}
