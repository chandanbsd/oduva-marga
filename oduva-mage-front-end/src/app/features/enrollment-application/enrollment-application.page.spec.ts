import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { EnrollmentApplicationPageComponent } from './enrollment-application.page';
import { EnrollmentApplicationStore } from '../../state/enrollment-application/enrollment-application.store';

describe('EnrollmentApplicationPageComponent', () => {
  let fixture: ComponentFixture<EnrollmentApplicationPageComponent>;
  let component: EnrollmentApplicationPageComponent;
  let httpMock: HttpTestingController;

  function fillValidHomeAddress(): void {
    component.form.controls.homeAddress.patchValue({
      street1: '1 Main St',
      city: 'Springfield',
      stateRegion: 'IL',
      postalCode: '62704',
      country: 'USA'
    });
  }

  function fillValidBaseFields(): void {
    component.form.patchValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      personalEmail: 'ada@example.com',
      enrollmentTypes: ['STUDENT']
    });
    fillValidHomeAddress();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentApplicationPageComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), EnrollmentApplicationStore]
    }).compileComponents();

    fixture = TestBed.createComponent(EnrollmentApplicationPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('shows an on-screen confirmation after a successful submit (Scenario 1)', () => {
    fillValidBaseFields();
    component.onSubmit();

    httpMock
      .expectOne('/api/enrollment-applications')
      .flush({ id: 'app-1', submittedAt: '2026-01-01T00:00:00.000Z' });
    fixture.detectChanges();

    expect(component.isSubmitted()).toBeTrue();
    const confirmation = fixture.debugElement.query(By.css('[data-testid="confirmation"]'));
    expect(confirmation).withContext('confirmation element should render').not.toBeNull();
  });

  it('retains additional addresses through submission (Scenario 2)', () => {
    fillValidBaseFields();
    component.addAdditionalAddress();
    component.additionalAddresses.at(0).patchValue({
      label: 'Work',
      street1: '2 Office Rd',
      city: 'Springfield',
      stateRegion: 'IL',
      postalCode: '62704',
      country: 'USA'
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/enrollment-applications');
    expect(req.request.body.additionalAddresses).toEqual([
      jasmine.objectContaining({ label: 'Work', street1: '2 Office Rd' })
    ]);
    req.flush({ id: 'app-2', submittedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('blocks submission when the Home address is missing (Scenario 3)', () => {
    component.form.patchValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      personalEmail: 'ada@example.com',
      enrollmentTypes: ['STUDENT']
    });

    component.onSubmit();

    httpMock.expectNone('/api/enrollment-applications');
    expect(component.form.controls.homeAddress.invalid).toBeTrue();
  });

  it('blocks submission when no enrollment type is selected (Scenario 4)', () => {
    component.form.patchValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      personalEmail: 'ada@example.com',
      enrollmentTypes: []
    });
    fillValidHomeAddress();

    component.onSubmit();

    httpMock.expectNone('/api/enrollment-applications');
    expect(component.form.controls.enrollmentTypes.hasError('required')).toBeTrue();
  });

  it('flags an invalid email before submit (Scenario 5)', () => {
    component.form.controls.personalEmail.setValue('not-an-email');

    expect(component.form.controls.personalEmail.hasError('email')).toBeTrue();

    component.onSubmit();
    httpMock.expectNone('/api/enrollment-applications');
  });

  it('creates no login credentials or account as part of submission (Scenario 6)', () => {
    expect(component.form.contains('password')).toBeFalse();
  });
});
