import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TeacherAssignmentListPageComponent } from './assignment-list.page';
import { Assignment } from '../../../../shared/models/assignment.model';

const assignment = (id: string, title: string): Assignment => ({
  id,
  title,
  question: 'Q',
  maxMarks: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdByEmail: 'alex.morgan@example.com'
});

describe('TeacherAssignmentListPageComponent', () => {
  let fixture: ComponentFixture<TeacherAssignmentListPageComponent>;
  let httpMock: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherAssignmentListPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherAssignmentListPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders one linked row per assignment', () => {
    httpMock.expectOne('/api/assignments').flush([assignment('a1', 'First'), assignment('a2', 'Second')]);
    fixture.detectChanges();

    const first = el().querySelector('a[href="/teacher/assignments/a1"]');
    expect(first?.textContent).toContain('First');
    expect(el().querySelector('a[href="/teacher/assignments/a2"]')?.textContent).toContain('Second');
  });

  it('links to the create page and back to home', () => {
    httpMock.expectOne('/api/assignments').flush([]);
    fixture.detectChanges();

    expect(el().querySelector('a[href="/teacher/assignments/new"]')?.textContent).toContain('New assignment');
    expect(el().querySelector('a[href="/home"]')?.textContent).toContain('Back to home');
  });

  it('shows an empty message when there are no assignments', () => {
    httpMock.expectOne('/api/assignments').flush([]);
    fixture.detectChanges();

    expect(el().textContent).toContain('No assignments yet.');
  });

  it('shows a load error in an alert', () => {
    httpMock.expectOne('/api/assignments').flush({ message: 'Not signed in.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Not signed in.');
  });
});
