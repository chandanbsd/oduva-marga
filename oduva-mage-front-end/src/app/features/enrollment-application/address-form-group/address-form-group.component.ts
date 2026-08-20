import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface AddressFormControls {
  label: FormControl<string>;
  street1: FormControl<string>;
  street2: FormControl<string>;
  city: FormControl<string>;
  stateRegion: FormControl<string>;
  postalCode: FormControl<string>;
  country: FormControl<string>;
}

export function createAddressFormGroup(options: { label: string }): FormGroup<AddressFormControls> {
  return new FormGroup<AddressFormControls>({
    label: new FormControl(options.label, { nonNullable: true }),
    street1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    street2: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    stateRegion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
}

function uniqueLabelValidator(getSiblingLabels: () => string[]): ValidatorFn {
  return (control) => {
    const value = (control.value ?? '').toString().trim().toLowerCase();
    if (!value) {
      return null;
    }
    const isDuplicate = getSiblingLabels().some((label) => label.trim().toLowerCase() === value);
    return isDuplicate ? { duplicateLabel: true } : null;
  };
}

@Component({
  selector: 'app-address-form-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './address-form-group.component.html',
  styleUrl: './address-form-group.component.scss'
})
export class AddressFormGroupComponent implements OnInit {
  // Named `addressGroup` (not `formGroup`) so this Input doesn't collide with
  // ReactiveFormsModule's own `[formGroup]` directive selector, which would otherwise
  // also match this host element in any consumer template that imports ReactiveFormsModule.
  @Input({ required: true }) addressGroup!: FormGroup<AddressFormControls>;
  @Input() editableLabel = false;
  @Input() siblingLabels: string[] = [];

  ngOnInit(): void {
    if (!this.editableLabel) {
      return;
    }
    // Closes over `this.siblingLabels` (not a captured snapshot) so re-validation triggered
    // by the parent's change detection always sees the current sibling label set.
    const labelControl = this.addressGroup.controls.label;
    labelControl.setValidators([Validators.required, uniqueLabelValidator(() => this.siblingLabels)]);
    labelControl.updateValueAndValidity({ emitEvent: false });
  }
}
