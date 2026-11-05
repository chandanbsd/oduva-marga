import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { roleGuard } from './role.guard';
import { AuthStore } from '../../state/auth/auth.store';
import { UserRole } from '../../shared/models/auth.model';

describe('roleGuard', () => {
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

  function loginAs(role: UserRole): void {
    store.login({ email: 'someone@example.com', password: 'x' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'someone@example.com',
        displayName: 'Someone',
        role,
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });
  }

  function run(role: UserRole): unknown {
    return TestBed.runInInjectionContext(() => roleGuard(role)({} as never, {} as never));
  }

  it('allows a user whose role matches', () => {
    loginAs('teacher');

    expect(run('teacher')).toBeTrue();
  });

  it('redirects a user with the wrong role to /home', () => {
    loginAs('student');

    const result = run('teacher');

    expect(result).not.toBeTrue();
    expect((result as UrlTree).toString()).toBe(router.parseUrl('/home').toString());
  });

  it('redirects an unauthenticated user to /login', () => {
    const result = run('student');

    expect(result).not.toBeTrue();
    expect((result as UrlTree).toString()).toBe(router.parseUrl('/login').toString());
  });
});
