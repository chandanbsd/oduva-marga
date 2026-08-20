import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthStore]
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => httpMock.verify());

  it('starts idle, unauthenticated, with no error', () => {
    expect(store.status()).toBe('idle');
    expect(store.user()).toBeNull();
    expect(store.error()).toBeNull();
  });

  it('transitions to authenticating when login() is called', () => {
    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });

    expect(store.status()).toBe('authenticating');

    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });
  });

  it('transitions to authenticated and stores the user on success', () => {
    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual({
      email: 'jordan.taylor@example.com',
      displayName: 'Jordan Taylor',
      authenticatedAt: '2026-01-01T00:00:00.000Z'
    });
    expect(store.error()).toBeNull();
  });

  it('transitions to error on invalid credentials, without setting a user', () => {
    store.login({ email: 'jordan.taylor@example.com', password: 'wrong' });
    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBeTruthy();
    expect(store.user()).toBeNull();
  });

  it('clears the user on logout', () => {
    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });
    expect(store.user()).not.toBeNull();

    store.logout();
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(store.user()).toBeNull();
    expect(store.status()).toBe('idle');
  });
});
