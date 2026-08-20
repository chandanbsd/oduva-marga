import { computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';

import { AuthErrorResponse, LoginRequest, login, logout } from '../../shared/api/auth.api';
import { AuthenticatedUser } from '../../shared/models/auth.model';

export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error';

export interface AuthState {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as AuthErrorResponse | undefined;
    if (body?.message) {
      return body.message;
    }
  }
  return 'Something went wrong signing in. Please try again.';
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status }) => ({
    isAuthenticating: computed(() => status() === 'authenticating'),
    isAuthenticated: computed(() => status() === 'authenticated')
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    // rxMethod (not an async method) so `isAuthenticating`/`isAuthenticated` stay derived
    // purely from `status`, with no separate "in flight" flag for callers to keep in sync.
    login: rxMethod<LoginRequest>(
      pipe(
        tap(() => patchState(store, { status: 'authenticating', error: null })),
        switchMap((request) =>
          login(http, request).pipe(
            tap((response) => patchState(store, { status: 'authenticated', user: response.user, error: null })),
            catchError((err: unknown) => {
              patchState(store, { status: 'error', error: extractErrorMessage(err), user: null });
              return of(null);
            })
          )
        )
      )
    ),
    logout: rxMethod<void>(
      pipe(
        switchMap(() =>
          logout(http).pipe(
            tap(() => patchState(store, initialState)),
            catchError(() => {
              // The mock's logout always succeeds; on a real backend a failed logout still
              // clears the client-side session so a stale "authenticated" UI never lingers.
              patchState(store, initialState);
              return of(null);
            })
          )
        )
      )
    )
  }))
);
