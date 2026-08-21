import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { enrollmentApplicationsFixture } from '../../../../mocks/fixtures/enrollment-applications.fixture';
import { usersFixture } from '../../../../mocks/fixtures/users.fixture';
import { Address, EnrollmentApplication, EnrollmentType } from '../../shared/models/enrollment-application.model';
import { AuthenticatedUser } from '../../shared/models/auth.model';

const STORAGE_KEY = 'oduva-marga:mock-api:v1';
const SIMULATED_LATENCY_MS = 150;
const MAX_ADDITIONAL_ADDRESSES = 5;
const GENERIC_LOGIN_ERROR_MESSAGE = 'Invalid email or password.';

interface MockApiStorage {
  applications: EnrollmentApplication[];
  session: AuthenticatedUser | null;
}

interface ValidationErrorEntry {
  field: string;
  message: string;
}

function readStorage(): MockApiStorage {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded: MockApiStorage = {
      applications: [...enrollmentApplicationsFixture],
      session: null
    };
    writeStorage(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw) as MockApiStorage;
  } catch {
    const seeded: MockApiStorage = {
      applications: [...enrollmentApplicationsFixture],
      session: null
    };
    writeStorage(seeded);
    return seeded;
  }
}

function writeStorage(storage: MockApiStorage): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validateAddress(address: Partial<Address> | undefined, fieldPrefix: string): ValidationErrorEntry[] {
  const errors: ValidationErrorEntry[] = [];
  if (!address) {
    errors.push({ field: fieldPrefix, message: 'Address is required.' });
    return errors;
  }
  if (isBlank(address.street1)) {
    errors.push({ field: `${fieldPrefix}.street1`, message: 'Street address is required.' });
  }
  if (isBlank(address.city)) {
    errors.push({ field: `${fieldPrefix}.city`, message: 'City is required.' });
  }
  if (isBlank(address.stateRegion)) {
    errors.push({ field: `${fieldPrefix}.stateRegion`, message: 'State/Region is required.' });
  }
  if (isBlank(address.postalCode)) {
    errors.push({ field: `${fieldPrefix}.postalCode`, message: 'Postal code is required.' });
  }
  if (isBlank(address.country)) {
    errors.push({ field: `${fieldPrefix}.country`, message: 'Country is required.' });
  }
  return errors;
}

function validateEnrollmentApplicationRequest(body: unknown): ValidationErrorEntry[] {
  const errors: ValidationErrorEntry[] = [];
  const request = (body ?? {}) as {
    firstName?: string;
    lastName?: string;
    personalEmail?: string;
    enrollmentTypes?: EnrollmentType[];
    homeAddress?: Partial<Address>;
    additionalAddresses?: Array<Partial<Address>>;
  };

  if (isBlank(request.firstName)) {
    errors.push({ field: 'firstName', message: 'First name is required.' });
  }
  if (isBlank(request.lastName)) {
    errors.push({ field: 'lastName', message: 'Last name is required.' });
  }
  if (isBlank(request.personalEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.personalEmail as string)) {
    errors.push({ field: 'personalEmail', message: 'A valid email address is required.' });
  }
  if (!Array.isArray(request.enrollmentTypes) || request.enrollmentTypes.length === 0) {
    errors.push({ field: 'enrollmentTypes', message: 'At least one enrollment type is required.' });
  }

  errors.push(...validateAddress(request.homeAddress, 'homeAddress'));

  const additionalAddresses = request.additionalAddresses ?? [];
  if (additionalAddresses.length > MAX_ADDITIONAL_ADDRESSES) {
    errors.push({
      field: 'additionalAddresses',
      message: `No more than ${MAX_ADDITIONAL_ADDRESSES} additional addresses are allowed.`
    });
  }
  const seenLabels = new Set<string>();
  additionalAddresses.forEach((address, index) => {
    errors.push(...validateAddress(address, `additionalAddresses[${index}]`));
    if (isBlank(address.label)) {
      errors.push({ field: `additionalAddresses[${index}].label`, message: 'Label is required.' });
    } else {
      const normalizedLabel = (address.label as string).trim().toLowerCase();
      if (seenLabels.has(normalizedLabel)) {
        errors.push({ field: `additionalAddresses[${index}].label`, message: 'Label must be unique.' });
      }
      seenLabels.add(normalizedLabel);
    }
  });

  return errors;
}

function handleSubmitEnrollmentApplication(url: string, body: unknown): Observable<HttpEvent<unknown>> {
  const errors = validateEnrollmentApplicationRequest(body);
  if (errors.length > 0) {
    return throwError(() =>
      new HttpErrorResponse({ status: 400, url, error: { errors } })
    ).pipe(delay(SIMULATED_LATENCY_MS));
  }

  const request = body as {
    firstName: string;
    lastName: string;
    personalEmail: string;
    enrollmentTypes: EnrollmentType[];
    homeAddress: Address;
    additionalAddresses: Address[];
  };

  const storage = readStorage();
  const submittedAt = new Date().toISOString();
  const application: EnrollmentApplication = {
    id: crypto.randomUUID(),
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    personalEmail: request.personalEmail.trim(),
    enrollmentTypes: request.enrollmentTypes,
    homeAddress: { ...request.homeAddress, label: 'Home' },
    additionalAddresses: request.additionalAddresses ?? [],
    submittedAt
  };
  storage.applications.push(application);
  writeStorage(storage);

  return of(
    new HttpResponse({ status: 201, url, body: { id: application.id, submittedAt: application.submittedAt } })
  ).pipe(delay(SIMULATED_LATENCY_MS));
}

function handleLogin(url: string, body: unknown): Observable<HttpEvent<unknown>> {
  const request = (body ?? {}) as { email?: string; password?: string };
  const match = usersFixture.find(
    (user) => user.email.toLowerCase() === (request.email ?? '').toLowerCase() && user.password === request.password
  );

  if (!match) {
    return throwError(() =>
      new HttpErrorResponse({ status: 401, url, error: { message: GENERIC_LOGIN_ERROR_MESSAGE } })
    ).pipe(delay(SIMULATED_LATENCY_MS));
  }

  const user: AuthenticatedUser = {
    email: match.email,
    displayName: match.displayName,
    authenticatedAt: new Date().toISOString()
  };
  const storage = readStorage();
  storage.session = user;
  writeStorage(storage);

  return of(new HttpResponse({ status: 200, url, body: { user } })).pipe(delay(SIMULATED_LATENCY_MS));
}

function handleLogout(url: string): Observable<HttpEvent<unknown>> {
  const storage = readStorage();
  storage.session = null;
  writeStorage(storage);
  return of(new HttpResponse({ status: 204, url })).pipe(delay(SIMULATED_LATENCY_MS));
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'POST' && req.url.endsWith('/enrollment-applications')) {
    return handleSubmitEnrollmentApplication(req.url, req.body);
  }
  if (req.method === 'POST' && req.url.endsWith('/auth/login')) {
    return handleLogin(req.url, req.body);
  }
  if (req.method === 'POST' && req.url.endsWith('/auth/logout')) {
    return handleLogout(req.url);
  }
  return next(req);
};
