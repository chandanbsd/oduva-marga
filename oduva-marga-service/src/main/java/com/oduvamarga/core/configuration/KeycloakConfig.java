package com.oduvamarga.core.configuration;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakConfig {

    final private String keycloakServerUrl;
    final private String realmName;
    final private String clientId;
    final private String clientSecret;

    public KeycloakConfig(@Value("${keycloak.serverUrl}") String keycloakServerUrl,
                          @Value("${keycloak.realm}") String realmName,
                          @Value("${keycloak.client-id}") String clientId,
                          @Value("${keycloak.client-secret}") String clientSecret) {
        this.keycloakServerUrl = keycloakServerUrl;
        this.realmName = realmName;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    @Bean
    
    public Keycloak keycloak() {
        return KeycloakBuilder.builder()
                .serverUrl(keycloakServerUrl)
                .realm(realmName)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .grantType("client_credentials")
                .build();
    }
}
