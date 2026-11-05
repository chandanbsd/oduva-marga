import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AssignmentStore } from '../../../../state/assignment/assignment.store';

@Component({
  selector: 'app-student-assignment-list-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './assignment-list.page.html',
  styleUrl: './assignment-list.page.scss'
})
export class StudentAssignmentListPageComponent {
  private readonly store = inject(AssignmentStore);

  readonly assignments = this.store.assignments;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;

  constructor() {
    this.store.loadList();
  }
}
