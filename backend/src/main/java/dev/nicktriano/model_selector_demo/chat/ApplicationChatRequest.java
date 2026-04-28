package dev.nicktriano.model_selector_demo.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplicationChatRequest(
    @NotBlank String provider,
    @NotBlank String model,
    @NotBlank @Size(max = 100_000) String content
) {}
