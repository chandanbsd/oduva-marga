import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthStore } from '../../../state/auth/auth.store';

interface LoginFormControls {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPageComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly form = new FormGroup<LoginFormControls>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  readonly isAuthenticating = this.store.isAuthenticating;
  readonly isAuthenticated = this.store.isAuthenticated;
  readonly loginError = this.store.error;

  constructor() {
    // FR-012: a successful login must reach the authenticated landing view.
    effect(() => {
      if (this.isAuthenticated()) {
        void this.router.navigateByUrl('/home');
      }
    });
  }

  onSubmit(): void {
    if (this.isAuthenticating()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.store.login({ email: value.email.trim(), password: value.password });
  }
}
