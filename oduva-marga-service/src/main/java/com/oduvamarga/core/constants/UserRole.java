package com.oduvamarga.core.constants;

import lombok.Getter;

@Getter
public enum UserRole {
    ADMIN(1),
    TEACHER(2),
    STUDENT(3);

    final private int roleId;

    UserRole(int roleId) {
        this.roleId = roleId;
    }
}
