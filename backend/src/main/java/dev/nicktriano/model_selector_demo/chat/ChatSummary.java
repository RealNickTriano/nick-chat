package dev.nicktriano.model_selector_demo.chat;

import java.time.Instant;
import java.util.UUID;

public record ChatSummary(UUID id, String title, Instant createdAt, Instant updatedAt) {}
