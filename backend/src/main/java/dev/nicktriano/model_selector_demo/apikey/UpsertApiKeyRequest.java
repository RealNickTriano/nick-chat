package dev.nicktriano.model_selector_demo.apikey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertApiKeyRequest(
    @NotBlank(message = "key must not be blank")
    @Size(max = 500, message = "key must not exceed 500 characters")
    String key
) {}
