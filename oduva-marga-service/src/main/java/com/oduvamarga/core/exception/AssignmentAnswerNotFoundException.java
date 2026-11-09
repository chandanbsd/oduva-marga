package com.oduvamarga.core.exception;

public class AssignmentAnswerNotFoundException extends RuntimeException {
    public AssignmentAnswerNotFoundException(long submissionId) {
        super("Assignment submission " + submissionId + " was not found.");
    }
}
