package com.oduvamarga.core.exception;

public class AssignmentNotFoundException extends RuntimeException {
    public AssignmentNotFoundException(Long assignmentId) {
        super("Assignment " + assignmentId + " was not found.");
    }
}
