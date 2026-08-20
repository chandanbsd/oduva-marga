import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { mockApiInterceptor } from './mock-api.interceptor';
import { SubmitEnrollmentApplicationRequest, SubmitEnrollmentApplicationResponse } from '../../shared/api/enrollment-application.api';

const STORAGE_KEY = 'oduva-marga:mock-api:v1';

function validApplicationRequest(overrides: Partial<SubmitEnrollmentApplicationRequest> = {}): SubmitEnrollmentApplicationRequest {
  return {
    firstName: 'Grace',
    lastName: 'Hopper',
    personalEmail: 'grace.hopper@example.com',
    enrollmentTypes: ['STUDENT'],
    homeAddress: {
      label: 'Home',
      street1: '1 Compiler Ave',
      city: 'Arlington',
      stateRegion: 'VA',
      postalCode: '22201',
      country: 'USA'
    },
    additionalAddresses: [],
    ...overrides
  };
}

function configureHttpClient(): void {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))]
  });
}

describe('mockApiInterceptor — enrollment-applications handler', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    configureHttpClient();
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('applies server-side field validation and returns 400 with field errors for an invalid request', async () => {
    const http = TestBed.inject(HttpClient);
    const invalidRequest = validApplicationRequest({
      firstName: '',
      personalEmail: 'not-an-email',
      enrollmentTypes: [] as never
    });

    await expectAsync(
      firstValueFrom(http.post('/api/enrollment-applications', invalidRequest))
    ).toBeRejectedWith(jasmine.any(HttpErrorResponse));

    try {
      await firstValueFrom(http.post('/api/enrollment-applications', invalidRequest));
      fail('expected the request to be rejected');
    } catch (err) {
      const error = err as HttpErrorResponse;
      expect(error.status).toBe(400);
      const fields = (error.error.errors as Array<{ field: string }>).map((e) => e.field);
      expect(fields).toContain('firstName');
      expect(fields).toContain('personalEmail');
      expect(fields).toContain('enrollmentTypes');
    }
  });

  it('persists an accepted application to localStorage', async () => {
    const http = TestBed.inject(HttpClient);
    const response = await firstValueFrom(
      http.post<SubmitEnrollmentApplicationResponse>('/api/enrollment-applications', validApplicationRequest())
    );

    expect(response.id).toBeTruthy();
    expect(response.submittedAt).toBeTruthy();

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const storage = JSON.parse(raw as string) as { applications: Array<{ id: string }> };
    expect(storage.applications.some((a) => a.id === response.id)).toBeTrue();
  });

  it('persists across a fresh interceptor/injector instance (survives reload)', async () => {
    const http1 = TestBed.inject(HttpClient);
    const first = await firstValueFrom(
      http1.post<SubmitEnrollmentApplicationResponse>('/api/enrollment-applications', validApplicationRequest())
    );

    TestBed.resetTestingModule();
    configureHttpClient();
    const http2 = TestBed.inject(HttpClient);
    const second = await firstValueFrom(
      http2.post<SubmitEnrollmentApplicationResponse>(
        '/api/enrollment-applications',
        validApplicationRequest({ personalEmail: 'second@example.com' })
      )
    );

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const storage = JSON.parse(raw as string) as { applications: Array<{ id: string }> };
    const ids = storage.applications.map((a) => a.id);
    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it('does not block a second submission using the same personalEmail', async () => {
    const http = TestBed.inject(HttpClient);
    const request = validApplicationRequest({ personalEmail: 'duplicate@example.com' });

    const first = await firstValueFrom(
      http.post<SubmitEnrollmentApplicationResponse>('/api/enrollment-applications', request)
    );
    const second = await firstValueFrom(
      http.post<SubmitEnrollmentApplicationResponse>('/api/enrollment-applications', request)
    );

    expect(first.id).not.toEqual(second.id);
  });
});

describe('mockApiInterceptor — auth handlers', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    configureHttpClient();
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('authenticates a valid fixture user and persists the session', async () => {
    const http = TestBed.inject(HttpClient);
    const response = await firstValueFrom(
      http.post<{ user: { email: string } }>('/api/auth/login', {
        email: 'jordan.taylor@example.com',
        password: 'MockPass123!'
      })
    );

    expect(response.user.email).toBe('jordan.taylor@example.com');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const storage = JSON.parse(raw as string) as { session: { email: string } | null };
    expect(storage.session?.email).toBe('jordan.taylor@example.com');
  });

  it('returns the identical generic 401 for a wrong password and an unknown email (FR-010)', async () => {
    const http = TestBed.inject(HttpClient);

    let wrongPasswordMessage = '';
    try {
      await firstValueFrom(
        http.post('/api/auth/login', { email: 'jordan.taylor@example.com', password: 'not-the-password' })
      );
      fail('expected the request to be rejected');
    } catch (err) {
      const error = err as HttpErrorResponse;
      expect(error.status).toBe(401);
      wrongPasswordMessage = error.error.message;
    }

    let unknownEmailMessage = '';
    try {
      await firstValueFrom(http.post('/api/auth/login', { email: 'nobody@example.com', password: 'whatever' }));
      fail('expected the request to be rejected');
    } catch (err) {
      const error = err as HttpErrorResponse;
      expect(error.status).toBe(401);
      unknownEmailMessage = error.error.message;
    }

    expect(wrongPasswordMessage).toBe(unknownEmailMessage);
  });

  it('always clears the persisted mock session on logout, even if none was active', async () => {
    const http = TestBed.inject(HttpClient);

    await firstValueFrom(http.post('/api/auth/logout', {}));

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const storage = JSON.parse(raw as string) as { session: unknown };
    expect(storage.session).toBeNull();
  });
});
