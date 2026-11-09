package com.oduvamarga.core.repository;

import com.oduvamarga.core.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    boolean existsByIdAndTeacherId(long assignmentId, long teacherId);
}
