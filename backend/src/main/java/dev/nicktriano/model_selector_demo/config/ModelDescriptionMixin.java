package dev.nicktriano.model_selector_demo.config;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.catalog.ModelType;

public abstract class ModelDescriptionMixin {
  @JsonProperty("name") abstract String name();
  @JsonProperty("displayName") abstract String displayName();
  @JsonProperty("description") abstract String description();
  @JsonProperty("provider") abstract ModelProvider provider(); // Using Object if type is 3rd party
  @JsonProperty("type") abstract ModelType type();
  @JsonProperty("maxInputTokens") abstract Integer maxInputTokens();
  @JsonProperty("maxOutputTokens") abstract Integer maxOutputTokens();
  @JsonProperty("createdAt") abstract Instant createdAt();
  @JsonProperty("owner") abstract String owner();
}
