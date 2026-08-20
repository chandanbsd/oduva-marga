import { computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';

import {
  SubmitEnrollmentApplicationRequest,
  ValidationErrorResponse,
  submitEnrollmentApplication
} from '../../shared/api/enrollment-application.api';

export type EnrollmentApplicationStatus = 'idle' | 'submitting' | 'submitted' | 'error';

export interface EnrollmentApplicationState {
  status: EnrollmentApplicationStatus;
  error: string | null;
  lastSubmission: { id: string; submittedAt: string } | null;
}

const initialState: EnrollmentApplicationState = {
  status: 'idle',
  error: null,
  lastSubmission: null
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ValidationErrorResponse | undefined;
    if (body?.errors?.length) {
      return body.errors.map((e) => e.message).join(' ');
    }
  }
  return 'Something went wrong submitting your application. Please try again.';
}

export const EnrollmentApplicationStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status }) => ({
    isSubmitting: computed(() => status() === 'submitting'),
    isSubmitted: computed(() => status() === 'submitted')
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    // rxMethod, not a plain async method, so a submit-in-flight guard (isSubmitting) can be
    // read from the same store the effect writes to without a race between call and status flip.
    submit: rxMethod<SubmitEnrollmentApplicationRequest>(
      pipe(
        tap(() => patchState(store, { status: 'submitting', error: null })),
        switchMap((request) =>
          submitEnrollmentApplication(http, request).pipe(
            tap((response) =>
              patchState(store, {
                status: 'submitted',
                lastSubmission: { id: response.id, submittedAt: response.submittedAt }
              })
            ),
            catchError((err: unknown) => {
              patchState(store, { status: 'error', error: extractErrorMessage(err) });
              return of(null);
            })
          )
        )
      )
    )
  }))
);
