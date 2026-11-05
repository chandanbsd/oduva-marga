export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'teacher' | 'student';

export interface AuthenticatedUser {
  email: string;
  displayName: string;
  role: UserRole;
  authenticatedAt: string;
}
