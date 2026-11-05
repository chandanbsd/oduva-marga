import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AssignmentStore } from '../../../../state/assignment/assignment.store';

@Component({
  selector: 'app-teacher-assignment-list-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './assignment-list.page.html',
  styleUrl: './assignment-list.page.scss'
})
export class TeacherAssignmentListPageComponent {
  private readonly store = inject(AssignmentStore);

  readonly assignments = this.store.assignments;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;

  constructor() {
    this.store.loadList();
  }
}
