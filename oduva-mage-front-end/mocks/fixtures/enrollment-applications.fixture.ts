import { EnrollmentApplication } from '../../src/app/shared/models/enrollment-application.model';

export const enrollmentApplicationsFixture: EnrollmentApplication[] = [
  {
    id: 'seed-application-1',
    firstName: 'Priya',
    lastName: 'Natarajan',
    personalEmail: 'priya.natarajan@example.com',
    enrollmentTypes: ['STUDENT'],
    homeAddress: {
      label: 'Home',
      street1: '221 Maple Street',
      city: 'Springfield',
      stateRegion: 'IL',
      postalCode: '62704',
      country: 'USA'
    },
    additionalAddresses: [],
    submittedAt: '2026-01-15T09:30:00.000Z'
  }
];
