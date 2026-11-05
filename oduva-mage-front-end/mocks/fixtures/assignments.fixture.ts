import { Assignment, Submission } from '../../src/app/shared/models/assignment.model';

export const assignmentsFixture: Assignment[] = [
  {
    id: 'seed-assignment-1',
    title: 'Photosynthesis',
    question: 'In your own words, explain how photosynthesis converts light into chemical energy.',
    maxMarks: 10,
    createdAt: '2026-01-05T09:00:00.000Z',
    createdByEmail: 'alex.morgan@example.com'
  },
  {
    id: 'seed-assignment-2',
    title: 'The Water Cycle',
    question: 'Describe the stages of the water cycle and name one human activity that affects it.',
    maxMarks: 20,
    createdAt: '2026-01-06T09:00:00.000Z',
    createdByEmail: 'alex.morgan@example.com'
  }
];

export const submissionsFixture: Submission[] = [];
