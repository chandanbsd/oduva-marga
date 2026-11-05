import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { downloadDataUrl } from '../../../../shared/util/download-data-url';
import { formatBytes } from '../../../../shared/util/format-bytes';
import { FileAnswer } from '../../../../shared/models/assignment.model';
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

  download(answer: FileAnswer): void {
    downloadDataUrl(answer.fileName, answer.dataUrl);
  }
}
