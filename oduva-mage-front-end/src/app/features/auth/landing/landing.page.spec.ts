import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthStore]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);

    store.login({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
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
