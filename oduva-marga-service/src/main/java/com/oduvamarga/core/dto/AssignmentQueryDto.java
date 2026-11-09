package com.oduvamarga.core.dto;

import org.hibernate.query.Page;

public record AssignmentQueryDto (
    Page page,
    String sortByDate,
    String sortByAssignment
) {}
