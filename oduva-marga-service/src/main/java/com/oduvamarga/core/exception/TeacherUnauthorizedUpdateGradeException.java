package com.oduvamarga.core.exception;

public class TeacherUnauthorizedUpdateGradeException extends RuntimeException {
    public TeacherUnauthorizedUpdateGradeException() {
        super("Teacher is not authorized to update the grade for this assignment.");
    }
}
