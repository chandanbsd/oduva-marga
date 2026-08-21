export type EnrollmentType = 'STUDENT' | 'FACULTY';

export interface Address {
  label: string;
  street1: string;
  street2?: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
}

export interface EnrollmentApplication {
  id: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  enrollmentTypes: EnrollmentType[];
  homeAddress: Address;
  additionalAddresses: Address[];
  submittedAt: string;
}
