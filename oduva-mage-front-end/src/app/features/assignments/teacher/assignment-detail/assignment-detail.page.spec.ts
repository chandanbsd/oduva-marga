import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { TeacherAssignmentDetailPageComponent } from './assignment-detail.page';
import { Assignment, Submission } from '../../../../shared/models/assignment.model';

const assignment: Assignment = {
  id: 'a1',
  title: 'Photosynthesis',
  question: 'Explain it.',
  createdAt: '2026-01-01T00:00:00.000Z',
  createdByEmail: 'alex.morgan@example.com'
};
const textSubmission: Submission = {
  id: 's1',
  assignmentId: 'a1',
  studentEmail: 'jordan.taylor@example.com',
  studentName: 'Jordan Taylor',
  submittedAt: '2026-01-02T10:00:00.000Z',
  answer: { kind: 'text', text: 'Plants eat light.' }
};
const fileSubmission: Submission = {
  id: 's2',
  assignmentId: 'a1',
  studentEmail: 'sam.rivera@example.com',
  studentName: 'Sam Rivera',
  submittedAt: '2026-01-03T10:00:00.000Z',
  answer: { kind: 'file', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 12, dataUrl: 'data:text/plain;base64,aGk=' }
};

describe('TeacherAssignmentDetailPageComponent', () => {
  let fixture: ComponentFixture<TeacherAssignmentDetailPageComponent>;
  let httpMock: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherAssignmentDetailPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a1' }) } } }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherAssignmentDetailPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  function flushLoads(submissions: Submission[]): void {
    httpMock.expectOne('/api/assignments/a1').flush(assignment);
    httpMock.expectOne('/api/assignments/a1/submissions').flush(submissions);
    fixture.detectChanges();
  }

  it('shows the title, question and a back link', () => {
    flushLoads([]);

    expect(el().textContent).toContain('Photosynthesis');
    expect(el().textContent).toContain('Explain it.');
    expect(el().querySelector('a[href="/teacher/assignments"]')?.textContent).toContain('Back to assignments');
  });

  it('lists text and file submissions with student names', () => {
    flushLoads([textSubmission, fileSubmission]);

    const text = el().textContent ?? '';
    expect(text).toContain('Jordan Taylor');
    expect(text).toContain('Plants eat light.');
    expect(text).toContain('Sam Rivera');
    expect(text).toContain('notes.txt');
    expect(text).toContain('12 bytes');
  });

  it('downloads a file submission when Download is clicked', async () => {
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(URL, 'revokeObjectURL');
    const names: string[] = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    flushLoads([fileSubmission]);

    const button = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Download'));
    button?.click();

    expect(names).toEqual(['notes.txt']);
    expect(await (createObjectUrl.calls.mostRecent().args[0] as Blob).text()).toBe('hi');
  });

  it('shows an empty message when there are no submissions', () => {
    flushLoads([]);

    expect(el().textContent).toContain('No submissions yet.');
  });

  it('shows Assignment not found. in an alert on 404', () => {
    const notFound = { status: 404, statusText: 'Not Found' };
    httpMock.expectOne('/api/assignments/a1').flush({ message: 'Assignment not found.' }, notFound);
    httpMock.expectOne('/api/assignments/a1/submissions').flush({ message: 'Assignment not found.' }, notFound);
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Assignment not found.');
  });
});
