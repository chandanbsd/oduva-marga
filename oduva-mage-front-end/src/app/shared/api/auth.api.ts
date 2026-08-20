import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthenticatedUser } from '../models/auth.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
}

export interface AuthErrorResponse {
  message: string;
}

/**
 * Plain function taking `http` rather than an injectable service, so `AuthStore` can call it
 * directly from an `rxMethod` pipe and tests can supply an `HttpTestingController`-backed
 * client without standing up a separate service provider.
 */
export function login(http: HttpClient, request: LoginRequest): Observable<LoginResponse> {
  return http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, request);
}

/**
 * Real backend note: this posts to end the *server-side* session; callers are still
 * responsible for clearing their own client-side auth state on the response.
 */
export function logout(http: HttpClient): Observable<void> {
  return http.post<void>(`${environment.apiBaseUrl}/auth/logout`, {});
}
