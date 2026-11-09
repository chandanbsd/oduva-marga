package com.oduvamarga.core.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.oduvamarga.core.dto.TeacherRegistrationDto;
import com.oduvamarga.core.service.TeacherService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher Registration", description = "Endpoints for teacher account registration")
public class TeacherController {

    private final TeacherService teacherService;

    @Operation(
            summary = "Register a new teacher",
            description = "Creates a teacher account. Only an authenticated teacher can register another teacher."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Teacher registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input or validation failed"),
            @ApiResponse(responseCode = "401", description = "Authentication is required"),
            @ApiResponse(responseCode = "403", description = "Only teachers can register teachers"),
            @ApiResponse(responseCode = "409", description = "Teacher record already exists")
    })
    @PostMapping("register")
    @PreAuthorize("hasAuthority('teacher')")
    @ResponseStatus(HttpStatus.CREATED)
    public TeacherRegistrationDto registerTeacher(@Valid @RequestBody TeacherRegistrationDto teacher) {
        return teacherService.register(teacher);
    }
}
