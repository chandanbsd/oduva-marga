package com.oduvamarga.core.dto;

import jakarta.validation.constraints.*;

public record StudentRegistrationDto (
        @NotBlank(message = "firstName cannot be blank")
        @Size(min = 2, max = 50, message = "lastName should be between 2 and 50 characters")
        String firstName,

        @NotBlank(message = "lastName cannot be blank")
        @Size(min = 2, max = 50, message = "lastName should be between 2 and 50 characters")
        String lastName,

        @NotNull(message = "Email is required")
        @Email(message = "Invalid email format")
        String personalEmail,

        String password
) {}
