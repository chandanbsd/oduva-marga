import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Like `Validators.required`, but whitespace-only strings also fail (same `required` error key). */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}
