import { Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { notBlank } from '../../../../shared/util/not-blank.validator';
import { AssignmentStore } from '../../../../state/assignment/assignment.store';

interface CreateFormControls {
  title: FormControl<string>;
  question: FormControl<string>;
}

@Component({
  selector: 'app-assignment-create-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './assignment-create.page.html',
  styleUrl: './assignment-create.page.scss'
})
export class AssignmentCreatePageComponent {
  private readonly store = inject(AssignmentStore);
  private readonly router = inject(Router);

  readonly form = new FormGroup<CreateFormControls>({
    title: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    question: new FormControl('', { nonNullable: true, validators: [notBlank] })
  });

  readonly isSaving = this.store.isSaving;
  readonly error = this.store.error;

  constructor() {
    // Clear a stale `saved` status from an earlier create so the effect below cannot navigate at once.
    this.store.reset();
    effect(() => {
      if (this.store.isSaved()) {
        void this.router.navigate(['/teacher/assignments']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, question } = this.form.getRawValue();
    this.store.create({ title: title.trim(), question: question.trim() });
  }
}
