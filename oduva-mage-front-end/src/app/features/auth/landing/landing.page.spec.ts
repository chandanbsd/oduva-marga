import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LandingPageComponent } from './landing.page';
import { AuthStore } from '../../../state/auth/auth.store';

describe('LandingPageComponent', () => {
  let fixture: ComponentFixture<LandingPageComponent>;
  let component: LandingPageComponent;
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthStore]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);

    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        role: 'student',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('displays the authenticated user', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Jordan Taylor');
  });

  it('ends the session on logout (Scenario 5)', () => {
    component.logout();
    httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(store.user()).toBeNull();
  });
});

describe('LandingPageComponent role links', () => {
  function render(role: 'teacher' | 'student'): HTMLElement {
    TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthStore]
    });
    const httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).login({ email: 'someone@example.com', password: 'x' });
    httpMock.expectOne('/api/auth/login').flush({
      user: { email: 'someone@example.com', displayName: 'Someone', role, authenticatedAt: '2026-01-01T00:00:00.000Z' }
    });
    const fixture = TestBed.createComponent(LandingPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a Manage assignments link for a teacher and no student link', () => {
    const el = render('teacher');

    const link = el.querySelector('a[href="/teacher/assignments"]');
    expect(link?.textContent).toContain('Manage assignments');
    expect(el.textContent).not.toContain('My assignments');
  });

  it('shows a My assignments link for a student and no teacher link', () => {
    const el = render('student');

    const link = el.querySelector('a[href="/student/assignments"]');
    expect(link?.textContent).toContain('My assignments');
    expect(el.textContent).not.toContain('Manage assignments');
  });
});
