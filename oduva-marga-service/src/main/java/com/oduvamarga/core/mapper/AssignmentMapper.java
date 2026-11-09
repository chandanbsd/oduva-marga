package com.oduvamarga.core.mapper;

import com.oduvamarga.core.dto.AssignmentCreateDto;
import com.oduvamarga.core.model.Assignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AssignmentMapper {
    @Mapping(source="assignment", target = "question")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "teacherId", ignore = true)
    Assignment toAssignment(AssignmentCreateDto assignmentCreateDto);
}
