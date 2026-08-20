import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  AddressFormControls,
  AddressFormGroupComponent,
  createAddressFormGroup
} from './address-form-group/address-form-group.component';
import { EnrollmentApplicationStore } from '../../state/enrollment-application/enrollment-application.store';
import { Address, EnrollmentType } from '../../shared/models/enrollment-application.model';

interface EnrollmentApplicationFormControls {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  personalEmail: FormControl<string>;
  enrollmentTypes: FormControl<EnrollmentType[]>;
  homeAddress: FormGroup<AddressFormControls>;
  additionalAddresses: FormArray<FormGroup<AddressFormControls>>;
}

@Component({
  selector: 'app-enrollment-application-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AddressFormGroupComponent
  ],
  templateUrl: './enrollment-application.page.html',
  styleUrl: './enrollment-application.page.scss'
})
export class EnrollmentApplicationPageComponent {
  private readonly store = inject(EnrollmentApplicationStore);

  readonly enrollmentTypeOptions: Array<{ value: EnrollmentType; label: string }> = [
    { value: 'STUDENT', label: 'Student' },
    { value: 'FACULTY', label: 'Faculty' }
  ];

  readonly form = new FormGroup<EnrollmentApplicationFormControls>({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    personalEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    enrollmentTypes: new FormControl<EnrollmentType[]>([], {
      nonNullable: true,
      validators: [Validators.required]
    }),
    homeAddress: createAddressFormGroup({ label: 'Home' }),
    additionalAddresses: new FormArray<FormGroup<AddressFormControls>>([])
  });

  readonly status = this.store.status;
  readonly isSubmitting = this.store.isSubmitting;
  readonly isSubmitted = this.store.isSubmitted;
  readonly submissionError = this.store.error;
  readonly lastSubmission = this.store.lastSubmission;

  get additionalAddresses(): FormArray<FormGroup<AddressFormControls>> {
    return this.form.controls.additionalAddresses;
  }

  addAdditionalAddress(): void {
    this.additionalAddresses.push(createAddressFormGroup({ label: '' }));
  }

  removeAdditionalAddress(index: number): void {
    this.additionalAddresses.removeAt(index);
  }

  siblingLabelsFor(index: number): string[] {
    return this.additionalAddresses.controls
      .filter((_, i) => i !== index)
      .map((control) => control.controls.label.value)
      .filter((label): label is string => label.trim().length > 0);
  }

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.store.submit({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      personalEmail: value.personalEmail.trim(),
      enrollmentTypes: value.enrollmentTypes,
      homeAddress: value.homeAddress as Address,
      additionalAddresses: value.additionalAddresses as Address[]
    });
  }
}
