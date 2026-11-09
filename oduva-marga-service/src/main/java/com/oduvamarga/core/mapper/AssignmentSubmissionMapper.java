package com.oduvamarga.core.mapper;

import com.oduvamarga.core.dto.AssignmentSubmitDto;
import com.oduvamarga.core.model.AssignmentAnswer;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AssignmentSubmissionMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(source = "answer", target = "answer")
    AssignmentAnswer toSubmission(AssignmentSubmitDto assignmentSubmitDto);
}

