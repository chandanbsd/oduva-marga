import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { authGuard } from './auth.guard';
import { AuthStore } from '../../state/auth/auth.store';

describe('authGuard', () => {
  let store: InstanceType<typeof AuthStore>;
  let router: Router;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthStore]
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('allows an authenticated user through', () => {
    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('redirects an unauthenticated user to /login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).not.toBeTrue();
    const expectedTree = router.parseUrl('/login');
    expect((result as UrlTree).toString()).toBe(expectedTree.toString());
  });
});
