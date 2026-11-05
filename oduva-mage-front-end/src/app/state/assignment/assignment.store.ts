import { computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';

import {
  CreateAssignmentRequest,
  createAssignment,
  getAssignment,
  listAssignments,
  listSubmissions,
  submitAnswer
} from '../../shared/api/assignment.api';
import { ValidationErrorResponse } from '../../shared/api/enrollment-application.api';
import { Assignment, AssignmentSummary, Submission, SubmissionAnswer } from '../../shared/models/assignment.model';

export type AssignmentStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export interface AssignmentState {
  assignments: AssignmentSummary[];
  selected: Assignment | null;
  submissions: Submission[];
  /** False until the caller's visible submissions have been fetched, so UIs don't flash an empty state. */
  submissionsLoaded: boolean;
  status: AssignmentStatus;
  error: string | null;
  lastCreatedId: string | null;
}

const initialState: AssignmentState = {
  assignments: [],
  selected: null,
  submissions: [],
  submissionsLoaded: false,
  status: 'idle',
  error: null,
  lastCreatedId: null
};

const GENERIC_ERROR = 'Something went wrong. Please try again.';

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as (ValidationErrorResponse & { message?: string }) | null;
    if (body?.errors?.length) {
      return body.errors.map((e) => e.message).join(' ');
    }
    if (body?.message) {
      return body.message;
    }
  }
  return GENERIC_ERROR;
}

export const AssignmentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status }) => ({
    isLoading: computed(() => status() === 'loading'),
    isSaving: computed(() => status() === 'saving'),
    isSaved: computed(() => status() === 'saved')
  })),
  withMethods((store, http = inject(HttpClient)) => {
    const fail = (err: unknown) => {
      patchState(store, { status: 'error', error: extractErrorMessage(err) });
      return of(null);
    };

    return {
      loadList: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { status: 'loading', error: null })),
          switchMap(() =>
            listAssignments(http).pipe(
              tap((assignments) => patchState(store, { assignments, status: 'idle' })),
              catchError(fail)
            )
          )
        )
      ),
      loadOne: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { status: 'loading', error: null, selected: null })),
          switchMap((id) =>
            getAssignment(http, id).pipe(
              tap((selected) => patchState(store, { selected, status: 'idle' })),
              catchError(fail)
            )
          )
        )
      ),
      loadSubmissions: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { status: 'loading', error: null, submissions: [], submissionsLoaded: false })),
          switchMap((assignmentId) =>
            listSubmissions(http, assignmentId).pipe(
              tap((submissions) => patchState(store, { submissions, submissionsLoaded: true, status: 'idle' })),
              catchError(fail)
            )
          )
        )
      ),
      create: rxMethod<CreateAssignmentRequest>(
        pipe(
          tap(() => patchState(store, { status: 'saving', error: null })),
          switchMap((request) =>
            createAssignment(http, request).pipe(
              tap((created) => patchState(store, { status: 'saved', lastCreatedId: created.id })),
              catchError(fail)
            )
          )
        )
      ),
      submit: rxMethod<{ assignmentId: string; answer: SubmissionAnswer }>(
        pipe(
          tap(() => patchState(store, { status: 'saving', error: null })),
          switchMap(({ assignmentId, answer }) =>
            submitAnswer(http, assignmentId, { answer }).pipe(
              tap((submission) => patchState(store, { status: 'saved', submissions: [submission], submissionsLoaded: true })),
              catchError((err: unknown) => {
                // Already submitted (double-click, second tab): show the stored answer instead of an error.
                if (err instanceof HttpErrorResponse && err.status === 409) {
                  return listSubmissions(http, assignmentId).pipe(
                    tap((submissions) => patchState(store, { submissions, submissionsLoaded: true, status: 'idle', error: null })),
                    catchError(fail)
                  );
                }
                return fail(err);
              })
            )
          )
        )
      ),
      reset(): void {
        patchState(store, { status: 'idle', error: null, lastCreatedId: null });
      }
    };
  })
);
