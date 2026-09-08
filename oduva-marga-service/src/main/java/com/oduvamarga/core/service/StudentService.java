package com.oduvamarga.core.service;

import com.oduvamarga.core.constants.UserRole;
import com.oduvamarga.core.domain.User;
import com.oduvamarga.core.dto.StudentRegistrationDto;
import com.oduvamarga.core.mapper.UserMapper;
import com.oduvamarga.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StudentService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public StudentRegistrationDto register(StudentRegistrationDto userDto) {
        User user = userMapper.toEntity(userDto);
        user.setRoleId(UserRole.STUDENT.getRoleId());
        User savedUser = userRepository.save(user);
        return userMapper.toStudentDto(savedUser);
    }
}
