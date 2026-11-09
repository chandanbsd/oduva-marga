package com.oduvamarga.core.service;

import com.oduvamarga.core.dto.AssignmentGradeDto;
import com.oduvamarga.core.dto.AssignmentSubmitDto;
import com.oduvamarga.core.exception.AssignmentAnswerAccessDeniedException;
import com.oduvamarga.core.exception.AssignmentAnswerNotFoundException;
import com.oduvamarga.core.exception.AssignmentNotFoundException;
import com.oduvamarga.core.exception.DuplicateAssignmentSubmissionException;
import com.oduvamarga.core.exception.InvalidGradeException;
import com.oduvamarga.core.exception.TeacherUnauthorizedUpdateGradeException;
import com.oduvamarga.core.mapper.AssignmentSubmissionMapper;
import com.oduvamarga.core.model.Assignment;
import com.oduvamarga.core.model.AssignmentAnswer;
import com.oduvamarga.core.repository.AssignmentAnswerRepository;
import com.oduvamarga.core.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AssignmentAnswerService {

    private final AssignmentAnswerRepository assignmentAnswerRepository;
    private final AssignmentSubmissionMapper assignmentSubmissionMapper;
    private final AssignmentRepository assignmentRepository;

    public AssignmentAnswer submitAssignment(AssignmentSubmitDto assignmentSubmitDto, Long assignmentId, Long studentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new AssignmentNotFoundException(assignmentId);
        }

        if (assignmentAnswerRepository.existsByAssignmentIdAndStudentId(assignmentId, studentId)) {
            throw new DuplicateAssignmentSubmissionException();
        }

        AssignmentAnswer assignmentAnswer = assignmentSubmissionMapper.toSubmission(assignmentSubmitDto);
        assignmentAnswer.setAssignmentId(assignmentId);
        assignmentAnswer.setStudentId(studentId);

        return assignmentAnswerRepository.save(assignmentAnswer);
    }

    //
    public void updateGrade(AssignmentGradeDto assignmentGradeDto, long submissionId, long assignmentId, long teacherId) {
        // Last LEFT
        // check both assignment id and submission id in the below query
        AssignmentAnswer assignmentAssignmentAnswer = assignmentAnswerRepository.findById(submissionId)
                .orElseThrow(() -> new AssignmentAnswerNotFoundException(submissionId));

        // remove this once after implementation
        if (assignmentAssignmentAnswer.getAssignmentId() != assignmentId) {
            throw new AssignmentAnswerNotFoundException(submissionId);
        }

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AssignmentNotFoundException(assignmentId));

        if (assignment.getTeacherId() != teacherId) {
            throw new TeacherUnauthorizedUpdateGradeException();
        }

        if (assignmentGradeDto.grade() > assignment.getMaxGrade()) {
            throw new InvalidGradeException();
        }

        assignmentAssignmentAnswer.setGrade(assignmentGradeDto.grade());
        assignmentAnswerRepository.save(assignmentAssignmentAnswer);
    }

    public AssignmentAnswer getAssignmentAnswer(long submissionId, long assignmentId, Long userId) {
        AssignmentAnswer assignmentAnswer = assignmentAnswerRepository.findById(submissionId)
                .orElseThrow(() -> new AssignmentAnswerNotFoundException(submissionId));
        if (assignmentAnswer.getAssignmentId() != assignmentId) {
            throw new AssignmentAnswerNotFoundException(submissionId);
        }

        boolean isStudent = Objects.equals(assignmentAnswer.getStudentId(), userId);
        boolean isTeacher = assignmentRepository.existsByIdAndTeacherId(assignmentId, userId);
        if (!isStudent && !isTeacher) {
            throw new AssignmentAnswerAccessDeniedException();
        }

        return assignmentAnswer;
    }

    public List<AssignmentAnswer> getAssignmentAnswers(long assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new AssignmentNotFoundException(assignmentId);
        }
        return assignmentAnswerRepository.findByAssignmentId(assignmentId);
    }
}
