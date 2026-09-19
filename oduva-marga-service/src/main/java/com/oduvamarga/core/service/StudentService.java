package com.oduvamarga.core.service;

import java.util.List;
import java.util.UUID;

import org.jspecify.annotations.NonNull;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;

import com.oduvamarga.core.constants.UserRole;
import com.oduvamarga.core.domain.User;
import com.oduvamarga.core.dto.StudentRegistrationDto;
import com.oduvamarga.core.mapper.UserMapper;
import com.oduvamarga.core.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final KeycloakService keycloakService;

    public StudentRegistrationDto register(StudentRegistrationDto userDto) {
        keycloakService.registerUser(createUserRepresentation(userDto));
        UserRepresentation saveUserRepresentation = keycloakService.getUserByEmail(userDto.personalEmail());
        User savedUser = userRepository.save(
                getStudentUserEntity(userDto, saveUserRepresentation)
        );
        keycloakService.addUserId(saveUserRepresentation, savedUser.getId());
        return userMapper.toStudentDto(savedUser);
    }

    private @NonNull User getStudentUserEntity(StudentRegistrationDto userDto, UserRepresentation saveUserRepresentation) {
        User user = userMapper.toEntity(userDto);
        user.setRoleId(UserRole.STUDENT.getRoleId());
        user.setAuthServerId(UUID.fromString(saveUserRepresentation.getId()));
        return user;
    }

    private static @NonNull UserRepresentation createUserRepresentation(StudentRegistrationDto userDto) {
        UserRepresentation userRepresentation =  new UserRepresentation();
        userRepresentation.setUsername(userDto.personalEmail());
        userRepresentation.setEmail(userDto.personalEmail());
        userRepresentation.setFirstName(userDto.firstName());
        userRepresentation.setLastName(userDto.lastName());
        userRepresentation.setEnabled(true);
        userRepresentation.setEmailVerified(true);
        userRepresentation.setGroups(List.of("/student"));

        CredentialRepresentation credentialRepresentation = new CredentialRepresentation();
        credentialRepresentation.setTemporary(false);
        credentialRepresentation.setType(CredentialRepresentation.PASSWORD);
        credentialRepresentation.setValue(userDto.password());

        userRepresentation.setCredentials(List.of(credentialRepresentation));
        return userRepresentation;
    }
}
