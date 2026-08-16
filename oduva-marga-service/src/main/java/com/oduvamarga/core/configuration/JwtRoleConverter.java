package com.oduvamarga.core.configuration;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;
import java.util.stream.Collectors;

public class JwtRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, List<String>> realmAccess = jwt.getClaim("realm_access");
        assert realmAccess != null;
        List<String> roles = realmAccess.getOrDefault("roles", Collections.emptyList());

        return roles.stream()
                .map(Objects::toString)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }

}
