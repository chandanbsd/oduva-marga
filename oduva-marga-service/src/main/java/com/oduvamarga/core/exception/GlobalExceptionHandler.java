package com.oduvamarga.core.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationExceptions(MethodArgumentNotValidException exception) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(BAD_REQUEST);
        problemDetail.setTitle("Validation Failed");
        problemDetail.setDetail("One are more fields failed input validation rules");

        Map<String, String> errors = exception.getBindingResult().getAllErrors().stream()
                .collect(Collectors.toMap(
                        error -> ((FieldError) error).getField(),
                        error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value"));
        problemDetail.setProperty("errors", errors);

        return new ResponseEntity<>(problemDetail, BAD_REQUEST);
    }

    public record ApiError(String code, String message, String filed) {}

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiError> handleDuplicateEmail(DuplicateEmailException ex) {
        ApiError error = new ApiError("DUPLICATE_EMAIL", ex.getMessage(), "email");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ApiError> handleDuplicateUsername(DuplicateUsernameException ex) {
        ApiError error = new ApiError("DUPLICATE_USERNAME", ex.getMessage(), "username");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleGenericConflict(IllegalStateException ex) {
        ApiError error = new ApiError("REGISTRATION_CONFLICT", ex.getMessage(), "general");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }
}
