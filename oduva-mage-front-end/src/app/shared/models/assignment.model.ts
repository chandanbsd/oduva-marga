/** Largest file a student may attach as an answer: 1 MB. */
export const MAX_ANSWER_FILE_BYTES = 1_048_576;

export interface Assignment {
  id: string;
  title: string;
  question: string;
  /** Maximum marks a submission can earn; always > 0. */
  maxMarks: number;
  createdAt: string;
  createdByEmail: string;
}

/** `submitted` is present only when the caller is a student. */
export interface AssignmentSummary extends Assignment {
  submitted?: boolean;
}

export interface TextAnswer {
  kind: 'text';
  text: string;
}

export interface FileAnswer {
  kind: 'file';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export type SubmissionAnswer = TextAnswer | FileAnswer;

export interface Submission {
  id: string;
  assignmentId: string;
  studentEmail: string;
  studentName: string;
  submittedAt: string;
  answer: SubmissionAnswer;
  /** Marks awarded by the teacher (0..maxMarks, fractions allowed); absent until graded. */
  grade?: number;
}
