package com.oduvamarga.core.exception;

public class InvalidGradeException extends RuntimeException {
    public InvalidGradeException() {
        super("Grade should not be greater than maximum grade.");
    }
}
