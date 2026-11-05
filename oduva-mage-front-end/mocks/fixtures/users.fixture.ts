import { UserRole } from '../../src/app/shared/models/auth.model';

export interface MockUserFixture {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export const usersFixture: MockUserFixture[] = [
  {
    email: 'jordan.taylor@example.com',
    password: 'MockPass123!',
    displayName: 'Jordan Taylor',
    role: 'student'
  },
  {
    email: 'sam.rivera@example.com',
    password: 'MockPass456!',
    displayName: 'Sam Rivera',
    role: 'student'
  },
  {
    email: 'alex.morgan@example.com',
    password: 'MockPass789!',
    displayName: 'Alex Morgan',
    role: 'teacher'
  }
];
