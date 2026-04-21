package dev.nicktriano.model_selector_demo.auth;

import java.time.Instant;

public record User(
    String id,
    String googleSub,
    String email,
    String displayName,
    String pictureUrl,
    Instant createdAt,
    Instant lastLoginAt
) {}
