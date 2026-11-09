package com.oduvamarga.core.service;

import com.oduvamarga.core.dto.AssignmentCreateDto;
import com.oduvamarga.core.dto.AssignmentQueryDto;
import com.oduvamarga.core.dto.AssignmentUpdateDto;
import com.oduvamarga.core.mapper.AssignmentMapper;
import com.oduvamarga.core.model.Assignment;
import com.oduvamarga.core.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentMapper assignmentMapper;

    public Assignment createAssignment(AssignmentCreateDto assignmentCreateDto, Long teacherId) {
        Assignment assignment = assignmentMapper.toAssignment(assignmentCreateDto);
        assignment.setTeacherId(teacherId);
        // TODO add one more dto to send back the created assignment
        return assignmentRepository.save(assignment);
    }

    public List<Assignment> getAssignments(AssignmentQueryDto assignmentQueryDto) {
        return assignmentRepository.findAll();
    }

    public Assignment updateAssignment(long assignmentId, AssignmentUpdateDto assignmentUpdateDto) {
        Assignment assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        // TODO add only the teacher who created are able to update the assignment
        assignment.setQuestion(assignmentUpdateDto.assignment());
        return assignmentRepository.save(assignment);
    }

    public Assignment getAssignment(long assignmentId) {
        return assignmentRepository.findById(assignmentId).orElseThrow();
    }
}
