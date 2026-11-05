import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MAX_ANSWER_FILE_BYTES } from '../../../../shared/models/assignment.model';
import { formatBytes } from '../../../../shared/util/format-bytes';
import { notBlank } from '../../../../shared/util/not-blank.validator';
import { readFileAsDataUrl } from '../../../../shared/util/read-file-as-data-url';
import { AssignmentStore } from '../../../../state/assignment/assignment.store';

type AnswerMode = 'text' | 'file';

@Component({
  selector: 'app-student-assignment-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './assignment-detail.page.html',
  styleUrl: './assignment-detail.page.scss'
})
export class StudentAssignmentDetailPageComponent {
  private readonly store = inject(AssignmentStore);
  private readonly assignmentId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly assignment = this.store.selected;
  readonly submissionsLoaded = this.store.submissionsLoaded;
  readonly isSaving = this.store.isSaving;
  readonly error = this.store.error;
  readonly mySubmission = computed(() => this.store.submissions()[0] ?? null);
  readonly formatBytes = formatBytes;

  readonly mode = signal<AnswerMode>('text');
  readonly answerText = new FormControl('', { nonNullable: true, validators: [notBlank] });
  // A FormGroup (not a bare control) so <form (ngSubmit)> and mat-error submit-state work.
  readonly form = new FormGroup({ answerText: this.answerText });
  readonly file = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);

  constructor() {
    this.store.reset();
    this.store.loadOne(this.assignmentId);
    this.store.loadSubmissions(this.assignmentId);
  }

  onFileSelected(event: Event): void {
    const chosen = (event.target as HTMLInputElement).files?.item(0) ?? null;
    this.file.set(chosen);
    this.fileError.set(chosen ? this.validateFile(chosen) : null);
  }

  async onSubmit(): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    if (this.mode() === 'text') {
      this.answerText.markAsTouched();
      if (this.answerText.invalid) {
        return;
      }
      this.store.submit({ assignmentId: this.assignmentId, answer: { kind: 'text', text: this.answerText.value } });
      return;
    }

    const file = this.file();
    const problem = file ? this.validateFile(file) : 'Please choose a file.';
    this.fileError.set(problem);
    if (!file || problem) {
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    this.store.submit({
      assignmentId: this.assignmentId,
      answer: {
        kind: 'file',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl
      }
    });
  }

  private validateFile(file: File): string | null {
    if (file.size === 0) {
      return 'File is empty.';
    }
    return file.size > MAX_ANSWER_FILE_BYTES ? 'File must be 1 MB or smaller.' : null;
  }
}
