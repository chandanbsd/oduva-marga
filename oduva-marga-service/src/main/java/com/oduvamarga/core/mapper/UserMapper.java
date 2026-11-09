package com.oduvamarga.core.mapper;


import com.oduvamarga.core.model.User;
import com.oduvamarga.core.dto.StudentRegistrationDto;
import com.oduvamarga.core.dto.TeacherRegistrationDto;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(StudentRegistrationDto dto);
    StudentRegistrationDto toStudentDto(User user);
    User toEntity(TeacherRegistrationDto dto);
    TeacherRegistrationDto toTeacherDto(User user);
}
