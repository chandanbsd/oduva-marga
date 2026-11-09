package com.oduvamarga.core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignmentUpdateDto(
        @NotBlank(message = "question should not be blank")
        @Size(min = 2, max = 50, message = "lastName should be between 2 and 50 characters")
        String assignment
) {}
