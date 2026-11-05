import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { downloadDataUrl } from '../../../../shared/util/download-data-url';
import { formatBytes } from '../../../../shared/util/format-bytes';
import { FileAnswer, Submission } from '../../../../shared/models/assignment.model';
import { AssignmentStore } from '../../../../state/assignment/assignment.store';

@Component({
  selector: 'app-teacher-assignment-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule],
  templateUrl: './assignment-detail.page.html',
  styleUrl: './assignment-detail.page.scss'
})
export class TeacherAssignmentDetailPageComponent {
  private readonly store = inject(AssignmentStore);

  readonly assignment = this.store.selected;
  readonly submissions = this.store.submissions;
  readonly error = this.store.error;
  readonly formatBytes = formatBytes;

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.store.loadOne(id);
    this.store.loadSubmissions(id);
  }

  // Unsaved grade text per submission id, and the validation message per submission id.
  private readonly drafts = signal<Record<string, string>>({});
  readonly gradeErrors = signal<Record<string, string>>({});

  draft(submission: Submission): string {
    return this.drafts()[submission.id] ?? (submission.grade !== undefined ? String(submission.grade) : '');
  }

  onDraftInput(submissionId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.drafts.update((drafts) => ({ ...drafts, [submissionId]: value }));
  }

  saveGrade(submission: Submission): void {
    const max = this.assignment()?.maxMarks ?? 0;
    const raw = this.draft(submission).trim();
    const marks = raw === '' ? NaN : Number(raw);
    const valid = Number.isFinite(marks) && marks >= 0 && marks <= max;
    this.gradeErrors.update((errors) => ({
      ...errors,
      [submission.id]: valid ? '' : `Enter a grade between 0 and ${max}.`
    }));
    if (valid) {
      this.store.gradeSubmission({ assignmentId: submission.assignmentId, submissionId: submission.id, marks });
    }
  }

  download(answer: FileAnswer): void {
    downloadDataUrl(answer.fileName, answer.dataUrl);
  }
}
