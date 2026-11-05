import { Routes } from '@angular/router';

import { EnrollmentApplicationPageComponent } from './features/enrollment-application/enrollment-application.page';
import { LoginPageComponent } from './features/auth/login/login.page';
import { LandingPageComponent } from './features/auth/landing/landing.page';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'apply', component: EnrollmentApplicationPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'home', component: LandingPageComponent, canActivate: [authGuard] },
  {
    path: 'teacher/assignments',
    canActivate: [roleGuard('teacher')],
    loadComponent: () =>
      import('./features/assignments/teacher/assignment-list/assignment-list.page').then(
        (m) => m.TeacherAssignmentListPageComponent
      )
  },
  {
    path: 'teacher/assignments/new',
    canActivate: [roleGuard('teacher')],
    loadComponent: () =>
      import('./features/assignments/teacher/assignment-create/assignment-create.page').then(
        (m) => m.AssignmentCreatePageComponent
      )
  },
  {
    path: 'teacher/assignments/:id',
    canActivate: [roleGuard('teacher')],
    loadComponent: () =>
      import('./features/assignments/teacher/assignment-detail/assignment-detail.page').then(
        (m) => m.TeacherAssignmentDetailPageComponent
      )
  },
  {
    path: 'student/assignments',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/assignments/student/assignment-list/assignment-list.page').then(
        (m) => m.StudentAssignmentListPageComponent
      )
  },
  {
    path: 'student/assignments/:id',
    canActivate: [roleGuard('student')],
    loadComponent: () =>
      import('./features/assignments/student/assignment-detail/assignment-detail.page').then(
        (m) => m.StudentAssignmentDetailPageComponent
      )
  }
];
