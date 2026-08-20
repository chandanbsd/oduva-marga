import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EnrollmentApplicationStore } from './enrollment-application.store';
import { SubmitEnrollmentApplicationRequest } from '../../shared/api/enrollment-application.api';

describe('EnrollmentApplicationStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof EnrollmentApplicationStore>;

  const validRequest: SubmitEnrollmentApplicationRequest = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    personalEmail: 'ada@example.com',
    enrollmentTypes: ['STUDENT'],
    homeAddress: {
      label: 'Home',
      street1: '1 Analytical Engine Way',
      city: 'London',
      stateRegion: 'London',
      postalCode: 'SW1A 1AA',
      country: 'UK'
    },
    additionalAddresses: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EnrollmentApplicationStore]
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(EnrollmentApplicationStore);
  });

  afterEach(() => httpMock.verify());

  it('starts in the idle status with no error and no last submission', () => {
    expect(store.status()).toBe('idle');
    expect(store.error()).toBeNull();
    expect(store.lastSubmission()).toBeNull();
  });

  it('transitions to submitting immediately when submit() is called', () => {
    store.submit(validRequest);

    expect(store.status()).toBe('submitting');

    httpMock.expectOne('/api/enrollment-applications').flush({
      id: 'abc-123',
      submittedAt: '2026-01-01T00:00:00.000Z'
    });
  });

  it('transitions to submitted and populates lastSubmission on success', () => {
    store.submit(validRequest);
    httpMock.expectOne('/api/enrollment-applications').flush({
      id: 'abc-123',
      submittedAt: '2026-01-01T00:00:00.000Z'
    });

    expect(store.status()).toBe('submitted');
    expect(store.lastSubmission()).toEqual({ id: 'abc-123', submittedAt: '2026-01-01T00:00:00.000Z' });
    expect(store.error()).toBeNull();
  });

  it('transitions to error and records a message on failure, without setting lastSubmission', () => {
    store.submit(validRequest);
    httpMock.expectOne('/api/enrollment-applications').flush(
      { errors: [{ field: 'personalEmail', message: 'A valid email address is required.' }] },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(store.status()).toBe('error');
    expect(store.error()).toBeTruthy();
    expect(store.lastSubmission()).toBeNull();
  });
});
