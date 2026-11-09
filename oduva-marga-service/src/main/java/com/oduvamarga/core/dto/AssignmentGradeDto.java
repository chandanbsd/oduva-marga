package com.oduvamarga.core.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record AssignmentGradeDto(
        @Min(0)
        @Max(Integer.MAX_VALUE)
        int grade
) {
}
