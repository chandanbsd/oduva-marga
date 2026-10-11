package com.oduvamarga.core.mapper;


import com.oduvamarga.core.domain.User;
import com.oduvamarga.core.dto.StudentRegistrationDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(StudentRegistrationDto dto);
    StudentRegistrationDto toStudentDto(User user);
}
