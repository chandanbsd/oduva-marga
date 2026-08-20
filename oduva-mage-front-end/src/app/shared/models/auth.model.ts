export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  email: string;
  displayName: string;
  authenticatedAt: string;
}
