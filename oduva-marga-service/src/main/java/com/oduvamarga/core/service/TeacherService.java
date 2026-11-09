package com.oduvamarga.core.service;

import java.util.List;
import java.util.UUID;

import org.jspecify.annotations.NonNull;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;

import com.oduvamarga.core.constants.UserRole;
import com.oduvamarga.core.dto.TeacherRegistrationDto;
import com.oduvamarga.core.mapper.UserMapper;
import com.oduvamarga.core.model.User;
import com.oduvamarga.core.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TeacherService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final KeycloakService keycloakService;

    public TeacherRegistrationDto register(TeacherRegistrationDto teacherDto) {
        keycloakService.registerUser(createUserRepresentation(teacherDto));
        UserRepresentation savedUserRepresentation = keycloakService.getUserByEmail(teacherDto.personalEmail());
        User savedUser = userRepository.save(getTeacherUserEntity(teacherDto, savedUserRepresentation));
        keycloakService.addUserId(savedUserRepresentation, savedUser.getId());
        return userMapper.toTeacherDto(savedUser);
    }

    private @NonNull User getTeacherUserEntity(
            TeacherRegistrationDto teacherDto,
            UserRepresentation savedUserRepresentation
    ) {
        User user = userMapper.toEntity(teacherDto);
        user.setRoleId(UserRole.TEACHER.getRoleId());
        user.setAuthServerId(UUID.fromString(savedUserRepresentation.getId()));
        return user;
    }

    private static @NonNull UserRepresentation createUserRepresentation(TeacherRegistrationDto teacherDto) {
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setUsername(teacherDto.personalEmail());
        userRepresentation.setEmail(teacherDto.personalEmail());
        userRepresentation.setFirstName(teacherDto.firstName());
        userRepresentation.setLastName(teacherDto.lastName());
        userRepresentation.setEnabled(true);
        userRepresentation.setEmailVerified(true);
        userRepresentation.setGroups(List.of("/teacher"));

        CredentialRepresentation credentialRepresentation = new CredentialRepresentation();
        credentialRepresentation.setTemporary(false);
        credentialRepresentation.setType(CredentialRepresentation.PASSWORD);
        credentialRepresentation.setValue(teacherDto.password());
        userRepresentation.setCredentials(List.of(credentialRepresentation));
        return userRepresentation;
    }
}
