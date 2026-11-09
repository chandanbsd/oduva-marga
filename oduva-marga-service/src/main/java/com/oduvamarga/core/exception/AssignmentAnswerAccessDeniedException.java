package com.oduvamarga.core.exception;

public class AssignmentAnswerAccessDeniedException extends RuntimeException {
    public AssignmentAnswerAccessDeniedException() {
        super("You are not authorized to view this assignment submission.");
    }
}
