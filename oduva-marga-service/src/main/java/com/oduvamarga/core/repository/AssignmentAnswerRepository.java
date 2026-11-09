package com.oduvamarga.core.repository;

import com.oduvamarga.core.model.AssignmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentAnswerRepository extends JpaRepository<AssignmentAnswer, Long> {
    List<AssignmentAnswer> findByAssignmentId(long assignmentId);
    boolean existsByAssignmentIdAndStudentId(long assignmentId, long studentId);
    boolean existsByIdAndStudentId(long submissionId, long studentId);
}
