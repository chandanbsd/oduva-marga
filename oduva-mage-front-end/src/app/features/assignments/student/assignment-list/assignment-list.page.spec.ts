import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { StudentAssignmentListPageComponent } from './assignment-list.page';
import { AssignmentSummary } from '../../../../shared/models/assignment.model';

const summary = (id: string, title: string, submitted: boolean): AssignmentSummary => ({
  id,
  title,
  question: 'Q',
  maxMarks: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdByEmail: 'alex.morgan@example.com',
  submitted
});

describe('StudentAssignmentListPageComponent', () => {
  let fixture: ComponentFixture<StudentAssignmentListPageComponent>;
  let httpMock: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentAssignmentListPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentAssignmentListPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders a linked row per assignment with its submitted state', () => {
    httpMock.expectOne('/api/assignments').flush([summary('a1', 'First', true), summary('a2', 'Second', false)]);
    fixture.detectChanges();

    const rows = Array.from(el().querySelectorAll('li'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('a[href="/student/assignments/a1"]')?.textContent).toContain('First');
    expect(rows[0].textContent).toContain('Submitted');
    expect(rows[0].textContent).not.toContain('Not submitted');
    expect(rows[1].textContent).toContain('Not submitted');
  });

  it('shows an empty message and a back link', () => {
    httpMock.expectOne('/api/assignments').flush([]);
    fixture.detectChanges();

    expect(el().textContent).toContain('No assignments yet.');
    expect(el().querySelector('a[href="/home"]')?.textContent).toContain('Back to home');
  });
});
