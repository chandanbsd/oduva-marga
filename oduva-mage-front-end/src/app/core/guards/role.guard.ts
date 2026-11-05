import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../../shared/models/auth.model';
import { AuthStore } from '../../state/auth/auth.store';

/**
 * Unauthenticated users go to /login; authenticated users with a different role go to /home.
 * Handles the unauthenticated case itself so routes need only this guard, not `authGuard` too.
 */
export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const store = inject(AuthStore);
    const router = inject(Router);

    if (!store.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    return store.user()?.role === role ? true : router.createUrlTree(['/home']);
  };
}
