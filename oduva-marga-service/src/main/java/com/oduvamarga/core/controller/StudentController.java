package com.oduvamarga.core.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.oduvamarga.core.dto.StudentRegistrationDto;
import com.oduvamarga.core.service.StudentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("student")
@RequiredArgsConstructor
@Tag(name = "Student Registration", description = "Endpoints for managing student and account registration")
public class StudentController {

    private final StudentService studentService;

    @Operation(
            summary = "Register a new student",
            description = "Creates a new student account record after validating the provided details."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Student registered successfully",
                    content = @Content(schema = @Schema(implementation = StudentRegistrationDto.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid input or validation failed for request fields",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Student record already exists (e.g. duplicate email)",
                    content = @Content
            )
    })
    @PostMapping("register")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentRegistrationDto registerUser(@Valid @RequestBody StudentRegistrationDto user) {
        return studentService.register(user);
    }
}
