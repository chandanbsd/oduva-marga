package com.oduvamarga.core.controller;

import com.oduvamarga.core.constants.CommonConstants;
import com.oduvamarga.core.dto.AssignmentGradeDto;
import com.oduvamarga.core.dto.AssignmentSubmitDto;
import com.oduvamarga.core.model.AssignmentAnswer;
import com.oduvamarga.core.service.AssignmentAnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/assignment/{assignmentId}")
@RequiredArgsConstructor
public class AssignmentAnswerController {

    private final AssignmentAnswerService submissionService;

    @PostMapping("/submit")
    @PreAuthorize("hasAuthority('student')")
    public AssignmentAnswer submitAssignment(
            @PathVariable("assignmentId") Long assignmentId,
            @RequestBody AssignmentSubmitDto submission,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long studentId = jwt.getClaim(CommonConstants.USER_ID);
        assert studentId != null;
        return submissionService.submitAssignment(submission, assignmentId, studentId);
    }

    @PutMapping("/answer/{submissionId}/grade")
    @PreAuthorize("hasAuthority('teacher')")
    // TODO teacher who owns the assignment should be able to grade the submission
    public void updateGrade(
            @RequestBody AssignmentGradeDto assignmentGradeDto,
            @PathVariable("assignmentId") long assignmentId,
            @PathVariable("submissionId") long submissionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long teacherId = jwt.getClaim(CommonConstants.USER_ID);
        assert teacherId != null;
        submissionService.updateGrade(assignmentGradeDto, submissionId, assignmentId, teacherId);
    }

    @GetMapping("/answer/{submissionId}")
    @PreAuthorize("hasAnyAuthority('student', 'teacher')")
    // teacher who owns the assignment should be able see the submission
    // and student who submitted should be able to see their submission
    public AssignmentAnswer getAssignmentAnswer(
            @PathVariable("assignmentId") long assignmentId,
            @PathVariable("submissionId") long submissionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = jwt.getClaim(CommonConstants.USER_ID);
        return submissionService.getAssignmentAnswer(submissionId, assignmentId, userId);
    }

    @GetMapping("answers")
    @PreAuthorize("hasAuthority('teacher')")
    public List<AssignmentAnswer> getAssignmentAnswers(
            @PathVariable("assignmentId") long assignmentId
    ) {
        return submissionService.getAssignmentAnswers(assignmentId);
    }
}
