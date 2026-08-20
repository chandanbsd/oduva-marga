export interface MockUserFixture {
  email: string;
  password: string;
  displayName: string;
}

export const usersFixture: MockUserFixture[] = [
  {
    email: 'jordan.taylor@example.com',
    password: 'MockPass123!',
    displayName: 'Jordan Taylor'
  },
  {
    email: 'sam.rivera@example.com',
    password: 'MockPass456!',
    displayName: 'Sam Rivera'
  }
];
