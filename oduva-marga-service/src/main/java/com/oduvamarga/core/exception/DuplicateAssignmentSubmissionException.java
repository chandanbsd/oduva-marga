package com.oduvamarga.core.exception;

public class DuplicateAssignmentSubmissionException extends RuntimeException {
    public DuplicateAssignmentSubmissionException() {
        super("Student has already submitted the assignment.");
    }
}
