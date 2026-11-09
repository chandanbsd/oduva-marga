package com.oduvamarga.core.controller;

import com.oduvamarga.core.constants.CommonConstants;
import com.oduvamarga.core.dto.AssignmentCreateDto;
import com.oduvamarga.core.dto.AssignmentQueryDto;
import com.oduvamarga.core.dto.AssignmentUpdateDto;
import com.oduvamarga.core.model.Assignment;
import com.oduvamarga.core.service.AssignmentService;
import jakarta.validation.Valid;
import jakarta.ws.rs.PathParam;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequiredArgsConstructor
@RequestMapping("assignment")
public class AssignmentController {

    final private AssignmentService assignmentService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('student', 'teacher')")
    public List<Assignment> getAssignments(@RequestParam(required = false) AssignmentQueryDto assignmentQueryDto) {
        return assignmentService.getAssignments(assignmentQueryDto);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('student', 'teacher')")
    public Assignment getAssignment(
            @RequestParam(required = false) AssignmentQueryDto assignmentQueryDto,
            @PathVariable("id") long assignmentId
    ) {
       return assignmentService.getAssignment(assignmentId);
    }

    @PostMapping("create")
    @PreAuthorize("hasAuthority('teacher')")
    @ResponseStatus(code = HttpStatus.CREATED)
    public Assignment createAssignment(
            @Valid @RequestBody AssignmentCreateDto assignmentCreateDto,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long omId = jwt.getClaim(CommonConstants.USER_ID);
        return assignmentService.createAssignment(assignmentCreateDto, omId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('teacher')")
    public Assignment updateAssignment(
            @PathVariable("id") long id,
            @Valid @RequestBody() AssignmentUpdateDto assignmentUpdateDto
    ) {
        return assignmentService.updateAssignment(id, assignmentUpdateDto);
    }
}
