package com.oduvamarga.core.exception;

public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String s) {
        super(s);
    }
}
