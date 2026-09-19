package com.oduvamarga.core.service;

import com.oduvamarga.core.exception.DuplicateEmailException;
import com.oduvamarga.core.exception.DuplicateUsernameException;
import jakarta.ws.rs.core.Response;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.ErrorRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class KeycloakService {

    final private String realm;
    final private Keycloak keycloak;

    public KeycloakService(@Value("${keycloak.realm}") String realm, Keycloak keycloak) {
        this.realm = realm;
        this.keycloak = keycloak;
    }

    public void registerUser(UserRepresentation user) {
        try (Response response = keycloak.realm(realm).users().create(user)) {
            int status = response.getStatus();

            if (status == 201) {
                return;
            }

            if (status == 409) {
                handleDuplicateError(response);
            }

            if (status == 403 || status == 401) {
                throw new SecurityException("Authorization failed. Check Keycloak client roles.");
            }

            throw new RuntimeException("Client error handling during user registration: " + response);
        }

    }

    public UserRepresentation getUserByEmail(String email) {
        List<UserRepresentation> searchResults = keycloak.realm(realm)
                .users()
                .searchByEmail(email, true);

        if (searchResults == null || searchResults.isEmpty()) {
            throw new IllegalArgumentException("User with email " + email + " not found.");
        }
        if (searchResults.size() > 1) {
            throw new IllegalStateException("Multiple users found with email " + email + ". Data is in an inconsistent state.");
        }

        return searchResults.getFirst();
    }

    public void addUserId(UserRepresentation user, long id) {
        String userId = user.getId();

        user.singleAttribute("om_id", String.valueOf(id));

        keycloak.realm(realm)
                .users()
                .get(userId)
                .update(user);
    }

    private void handleDuplicateError(Response response) {
        ErrorRepresentation error = response.readEntity(ErrorRepresentation.class);
        String errorMessage = error.getErrorMessage() != null ? error.getErrorMessage().toLowerCase() : "";

        if (errorMessage.contains("email")) {
            throw new DuplicateEmailException("A user with this email address already exists.");
        } else if (errorMessage.contains("username")) {
            throw new DuplicateUsernameException("This username is already taken.");
        } else {
            throw new IllegalStateException("User registration conflict: " + errorMessage);
        }
    }
}