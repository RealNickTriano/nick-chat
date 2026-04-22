package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;

public record Chat(
    String id,
    String userId,
    String title,
    Instant createdAt,
    Instant updatedAt
) {}
