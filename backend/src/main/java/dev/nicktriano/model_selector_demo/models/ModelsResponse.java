package dev.nicktriano.model_selector_demo.models;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.catalog.ModelType;

public record ModelsResponse(List<ProviderModels> providers) {

    public record ProviderModels(String provider, List<ModelEntry> models) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ModelEntry(
        String id,
        String displayName,
        String description,
        ModelProvider provider,
        ModelType type,
        Integer maxInputTokens,
        Integer maxOutputTokens,
        Instant createdAt,
        String owner
    ) {}
}
