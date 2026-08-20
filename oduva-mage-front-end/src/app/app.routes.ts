import { Routes } from '@angular/router';

import { EnrollmentApplicationPageComponent } from './features/enrollment-application/enrollment-application.page';
import { LoginPageComponent } from './features/auth/login/login.page';
import { LandingPageComponent } from './features/auth/landing/landing.page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'apply', component: EnrollmentApplicationPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'home', component: LandingPageComponent, canActivate: [authGuard] }
];
