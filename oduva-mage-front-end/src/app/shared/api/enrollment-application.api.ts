import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Address, EnrollmentType } from '../models/enrollment-application.model';

export interface SubmitEnrollmentApplicationRequest {
  firstName: string;
  lastName: string;
  personalEmail: string;
  enrollmentTypes: EnrollmentType[];
  homeAddress: Address;
  additionalAddresses: Address[];
}

export interface SubmitEnrollmentApplicationResponse {
  id: string;
  submittedAt: string;
}

export interface ValidationErrorResponse {
  errors: Array<{ field: string; message: string }>;
}

/**
 * Takes `http` as a parameter instead of injecting it internally, so this stays a plain
 * function callable from a SignalStore's `rxMethod` pipe without its own DI context — and so
 * unit tests can pass an `HttpTestingController`-backed client without a TestBed provider override.
 */
export function submitEnrollmentApplication(
  http: HttpClient,
  request: SubmitEnrollmentApplicationRequest
): Observable<SubmitEnrollmentApplicationResponse> {
  return http.post<SubmitEnrollmentApplicationResponse>(
    `${environment.apiBaseUrl}/enrollment-applications`,
    request
  );
}
