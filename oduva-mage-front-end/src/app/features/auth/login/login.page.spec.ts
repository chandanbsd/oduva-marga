import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { LoginPageComponent } from './login.page';
import { AuthStore } from '../../../state/auth/auth.store';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), AuthStore]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('authenticates with valid credentials (Scenario 1)', () => {
    component.form.setValue({ email: 'jordan.taylor@example.com', password: 'MockPass123!' });
    component.onSubmit();

    httpMock.expectOne('/api/auth/login').flush({
      user: {
        email: 'jordan.taylor@example.com',
        displayName: 'Jordan Taylor',
        authenticatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(component.isAuthenticated()).toBeTrue();
  });

  it('shows a generic error for a wrong password (Scenario 2)', () => {
    component.form.setValue({ email: 'jordan.taylor@example.com', password: 'wrong-password' });
    component.onSubmit();

    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.loginError()).toBe('Invalid email or password.');
  });

  it('shows the identical generic error for an unregistered email (Scenario 3)', () => {
    component.form.setValue({ email: 'nobody@example.com', password: 'whatever' });
    component.onSubmit();

    httpMock
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.loginError()).toBe('Invalid email or password.');
  });

  it('blocks submission with inline feedback when a field is empty (Scenario 4)', () => {
    component.form.setValue({ email: '', password: '' });
    component.onSubmit();

    httpMock.expectNone('/api/auth/login');
    expect(component.form.controls.email.hasError('required')).toBeTrue();
    expect(component.form.controls.password.hasError('required')).toBeTrue();
  });
});
