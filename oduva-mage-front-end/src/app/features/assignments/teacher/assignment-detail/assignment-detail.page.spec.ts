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
  maxMarks: 10,
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

  describe('grading', () => {
    const row = (name: string) =>
      Array.from(el().querySelectorAll('li')).find((li) => li.textContent?.includes(name)) as HTMLElement;

    function enterGrade(name: string, value: string): void {
      const input = row(name).querySelector('input[type="number"]') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }

    function saveGrade(name: string): void {
      (Array.from(row(name).querySelectorAll('button')).find((b) => b.textContent?.includes('Save grade')) as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    it('shows the maximum marks', () => {
      flushLoads([]);

      expect(el().textContent).toContain('Maximum marks: 10');
    });

    it('PUTs a fractional grade and then shows it', () => {
      flushLoads([textSubmission]);
      enterGrade('Jordan Taylor', '7.5');

      saveGrade('Jordan Taylor');
      const req = httpMock.expectOne('/api/assignments/a1/submissions/s1/grade');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ marks: 7.5 });
      req.flush({ ...textSubmission, grade: 7.5 });
      fixture.detectChanges();

      expect(row('Jordan Taylor').textContent).toContain('Graded: 7.5 / 10');
    });

    it('pre-fills and shows an existing grade', () => {
      flushLoads([{ ...textSubmission, grade: 8 }]);

      expect(row('Jordan Taylor').textContent).toContain('Graded: 8 / 10');
      expect((row('Jordan Taylor').querySelector('input[type="number"]') as HTMLInputElement).value).toBe('8');
    });

    it('rejects blank, negative and above-max grades without sending anything', () => {
      flushLoads([textSubmission]);

      for (const bad of ['', '-1', '10.5']) {
        enterGrade('Jordan Taylor', bad);
        saveGrade('Jordan Taylor');
        expect(row('Jordan Taylor').textContent).toContain('Enter a grade between 0 and 10.');
      }
      httpMock.expectNone((r) => r.method === 'PUT');
    });

    it('accepts 0 as a valid grade', () => {
      flushLoads([textSubmission]);
      enterGrade('Jordan Taylor', '0');

      saveGrade('Jordan Taylor');

      expect(httpMock.expectOne('/api/assignments/a1/submissions/s1/grade').request.body).toEqual({ marks: 0 });
    });
  });
});
