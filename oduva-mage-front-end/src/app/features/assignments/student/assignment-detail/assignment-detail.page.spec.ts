import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { StudentAssignmentDetailPageComponent } from './assignment-detail.page';
import { Assignment, Submission } from '../../../../shared/models/assignment.model';
import { AssignmentStore } from '../../../../state/assignment/assignment.store';

const assignment: Assignment = {
  id: 'a1',
  title: 'Photosynthesis',
  question: 'Explain it.',
  createdAt: '2026-01-01T00:00:00.000Z',
  createdByEmail: 'alex.morgan@example.com'
};
const existing: Submission = {
  id: 's1',
  assignmentId: 'a1',
  studentEmail: 'jordan.taylor@example.com',
  studentName: 'Jordan Taylor',
  submittedAt: '2026-01-02T10:00:00.000Z',
  answer: { kind: 'text', text: 'Earlier answer.' }
};
const MB = 1_048_576;

describe('StudentAssignmentDetailPageComponent', () => {
  let fixture: ComponentFixture<StudentAssignmentDetailPageComponent>;
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof AssignmentStore>;
  const el = () => fixture.nativeElement as HTMLElement;
  const POST = (r: { method: string; url: string }) => r.method === 'POST' && r.url === '/api/assignments/a1/submissions';
  const GET = (r: { method: string; url: string }) => r.method === 'GET' && r.url === '/api/assignments/a1/submissions';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentAssignmentDetailPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a1' }) } } }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AssignmentStore);
    fixture = TestBed.createComponent(StudentAssignmentDetailPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  function load(submissions: Submission[]): void {
    httpMock.expectOne('/api/assignments/a1').flush(assignment);
    httpMock.expectOne(GET).flush(submissions);
    fixture.detectChanges();
  }

  function typeAnswer(text: string): void {
    const textarea = el().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function chooseFileMode(): void {
    const toggle = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Upload file'));
    toggle?.click();
    fixture.detectChanges();
  }

  function pickFile(file: File): void {
    const input = el().querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  async function until(condition: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !condition(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(condition()).toBeTrue();
  }

  it('does not render the form until submissions have loaded', () => {
    httpMock.expectOne('/api/assignments/a1').flush(assignment);
    fixture.detectChanges();

    expect(el().querySelector('form')).toBeNull();
    httpMock.expectOne(GET);
  });

  it('shows the question with Type answer / Upload file toggle when not yet submitted', () => {
    load([]);

    expect(el().textContent).toContain('Explain it.');
    expect(el().textContent).toContain('Type answer');
    expect(el().textContent).toContain('Upload file');
    expect(el().querySelector('textarea')).not.toBeNull();
  });

  it('requires a non-blank answer and sends nothing otherwise', () => {
    load([]);

    submit();
    expect(el().textContent).toContain('Answer is required.');

    typeAnswer('   ');
    submit();
    expect(el().textContent).toContain('Answer is required.');
    httpMock.expectNone(POST);
  });

  it('POSTs a text answer and then shows it read-only', () => {
    load([]);
    typeAnswer('my answer');

    submit();
    const req = httpMock.expectOne(POST);
    expect(req.request.body).toEqual({ answer: { kind: 'text', text: 'my answer' } });
    req.flush({ ...existing, answer: { kind: 'text', text: 'my answer' } });
    fixture.detectChanges();

    expect(el().querySelector('form')).toBeNull();
    expect(el().textContent).toContain('my answer');
  });

  it('rejects a file over 1 MB and sends nothing', () => {
    load([]);
    chooseFileMode();

    pickFile(new File([new Uint8Array(MB + 1)], 'big.bin'));
    submit();

    expect(el().textContent).toContain('File must be 1 MB or smaller.');
    httpMock.expectNone(POST);
  });

  it('rejects an empty file and sends nothing', () => {
    load([]);
    chooseFileMode();

    pickFile(new File([], 'empty.txt'));
    submit();

    expect(el().textContent).toContain('File is empty.');
    httpMock.expectNone(POST);
  });

  it('asks for a file when none is chosen', () => {
    load([]);
    chooseFileMode();

    submit();

    expect(el().textContent).toContain('Please choose a file.');
    httpMock.expectNone(POST);
  });

  it('POSTs a valid file with its data URL', async () => {
    load([]);
    chooseFileMode();
    pickFile(new File([new Uint8Array([104, 105])], 'notes.txt', { type: 'text/plain' }));

    submit();
    await until(() => store.isSaving());
    const req = httpMock.expectOne(POST);

    expect(req.request.body).toEqual({
      answer: {
        kind: 'file',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 2,
        dataUrl: 'data:text/plain;base64,aGk='
      }
    });
    req.flush({ ...existing, answer: req.request.body.answer });
  });

  it('accepts a file of exactly 1 MB', async () => {
    load([]);
    chooseFileMode();
    pickFile(new File([new Uint8Array(MB)], 'exact.bin'));

    submit();
    await until(() => store.isSaving());

    expect(httpMock.expectOne(POST).request.body.answer.sizeBytes).toBe(MB);
  });

  it('shows an already-submitted answer read-only with no form', () => {
    load([existing]);

    expect(el().querySelector('form')).toBeNull();
    expect(el().textContent).toContain('Earlier answer.');
  });

  it('shows the stored answer, with no error, when the server reports a duplicate (409)', () => {
    load([]);
    typeAnswer('second try');

    submit();
    httpMock.expectOne(POST).flush({ message: 'You have already submitted this assignment.' }, { status: 409, statusText: 'Conflict' });
    httpMock.expectOne(GET).flush([existing]);
    fixture.detectChanges();

    expect(el().querySelector('form')).toBeNull();
    expect(el().textContent).toContain('Earlier answer.');
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('disables the submit button while saving', () => {
    load([]);
    typeAnswer('x');

    submit();

    expect((el().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    httpMock.expectOne(POST);
  });

  it('shows Assignment not found. in an alert on 404', () => {
    const notFound = { status: 404, statusText: 'Not Found' };
    httpMock.expectOne('/api/assignments/a1').flush({ message: 'Assignment not found.' }, notFound);
    httpMock.expectOne(GET).flush({ message: 'Assignment not found.' }, notFound);
    fixture.detectChanges();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Assignment not found.');
  });
});
