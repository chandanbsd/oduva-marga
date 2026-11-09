package com.oduvamarga.core.constants;

import lombok.Getter;

@Getter
public enum UserRole {
    STUDENT(1),
    TEACHER(2);

    private final int roleId;

    UserRole(int roleId) {
        this.roleId = roleId;
    }
}
