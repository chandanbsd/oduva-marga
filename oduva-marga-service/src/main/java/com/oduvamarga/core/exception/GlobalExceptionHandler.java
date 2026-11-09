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

    @ExceptionHandler(InvalidGradeException.class)
    public ResponseEntity<ApiError> handleInvalidGrade(InvalidGradeException ex) {
        ApiError error = new ApiError("INVALID_GRADE", ex.getMessage(), "grade");
        return ResponseEntity.status(BAD_REQUEST).body(error);
    }

    @ExceptionHandler(DuplicateAssignmentSubmissionException.class)
    public ResponseEntity<ApiError> handleDuplicateAssignmentSubmission(DuplicateAssignmentSubmissionException ex) {
        ApiError error = new ApiError("DUPLICATE_ASSIGNMENT_SUBMISSION", ex.getMessage(), "general");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(AssignmentNotFoundException.class)
    public ResponseEntity<ApiError> handleAssignmentNotFound(AssignmentNotFoundException ex) {
        ApiError error = new ApiError("ASSIGNMENT_NOT_FOUND", ex.getMessage(), "assignmentId");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AssignmentAnswerNotFoundException.class)
    public ResponseEntity<ApiError> handleAssignmentAnswerNotFound(AssignmentAnswerNotFoundException ex) {
        ApiError error = new ApiError("ASSIGNMENT_ANSWER_NOT_FOUND", ex.getMessage(), "submissionId");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AssignmentAnswerAccessDeniedException.class)
    public ResponseEntity<ApiError> handleAssignmentAnswerAccessDenied(AssignmentAnswerAccessDeniedException ex) {
        ApiError error = new ApiError("ASSIGNMENT_ANSWER_ACCESS_DENIED", ex.getMessage(), "general");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleGenericConflict(IllegalStateException ex) {
        ApiError error = new ApiError("REGISTRATION_CONFLICT", ex.getMessage(), "general");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(TeacherUnauthorizedUpdateGradeException.class)
    public ResponseEntity<ApiError> handleTeacherUnauthorizedUpdateGrade(TeacherUnauthorizedUpdateGradeException ex) {
        ApiError error = new ApiError("TEACHER_UNAUTHORIZED_UPDATE_GRADE", ex.getMessage(), "general");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }
}
