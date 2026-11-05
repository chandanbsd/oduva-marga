import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AssignmentCreatePageComponent } from './assignment-create.page';
import { AssignmentStore } from '../../../../state/assignment/assignment.store';

describe('AssignmentCreatePageComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  async function setup(): Promise<ComponentFixture<AssignmentCreatePageComponent>> {
    await TestBed.configureTestingModule({
      imports: [AssignmentCreatePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(AssignmentCreatePageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;

  function fill(f: ComponentFixture<unknown>, title: string, question: string): void {
    const title$ = el(f).querySelector('input') as HTMLInputElement;
    const question$ = el(f).querySelector('textarea') as HTMLTextAreaElement;
    title$.value = title;
    title$.dispatchEvent(new Event('input'));
    question$.value = question;
    question$.dispatchEvent(new Event('input'));
  }

  function submit(f: ComponentFixture<unknown>): void {
    (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    f.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('shows required messages and sends nothing when submitted empty', async () => {
    const fixture = await setup();

    submit(fixture);

    expect(el(fixture).textContent).toContain('Title is required.');
    expect(el(fixture).textContent).toContain('Question is required.');
    httpMock.expectNone('/api/assignments');
  });

  it('treats whitespace-only values as blank', async () => {
    const fixture = await setup();
    fill(fixture, '   ', '  \n ');

    submit(fixture);

    expect(el(fixture).textContent).toContain('Title is required.');
    httpMock.expectNone('/api/assignments');
  });

  it('POSTs the title and question, then navigates to the list', async () => {
    const fixture = await setup();
    fill(fixture, 'My title', 'My question');

    submit(fixture);
    const req = httpMock.expectOne('/api/assignments');
    expect(req.request.body).toEqual({ title: 'My title', question: 'My question' });
    req.flush({ id: 'a1', title: 'My title', question: 'My question', createdAt: 'x', createdByEmail: 'y' });
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/teacher/assignments']);
  });

  it('shows a server error in an alert', async () => {
    const fixture = await setup();
    fill(fixture, 'T', 'Q');

    submit(fixture);
    httpMock.expectOne('/api/assignments').flush({ message: 'Only teachers can create assignments.' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain('Only teachers can create assignments.');
  });

  it('disables the submit button while saving', async () => {
    const fixture = await setup();
    fill(fixture, 'T', 'Q');

    submit(fixture);

    expect((el(fixture).querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    httpMock.expectOne('/api/assignments');
  });

  it('resets a stale saved status on init so it does not navigate immediately', async () => {
    TestBed.configureTestingModule({
      imports: [AssignmentCreatePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()]
    });
    const store = TestBed.inject(AssignmentStore);
    const http = TestBed.inject(HttpTestingController);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.create({ title: 'T', question: 'Q' });
    http.expectOne('/api/assignments').flush({ id: 'a1', title: 'T', question: 'Q', createdAt: 'x', createdByEmail: 'y' });
    expect(store.status()).toBe('saved');

    const fixture = TestBed.createComponent(AssignmentCreatePageComponent);
    fixture.detectChanges();

    expect(store.status()).toBe('idle');
    expect(navigate).not.toHaveBeenCalled();
    http.verify();
  });
});
