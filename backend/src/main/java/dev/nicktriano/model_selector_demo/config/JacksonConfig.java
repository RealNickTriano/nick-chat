package dev.nicktriano.model_selector_demo.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import dev.langchain4j.model.catalog.ModelDescription;

@Configuration
public class JacksonConfig {
  @Bean
  public JsonMapperBuilderCustomizer addCustomSerialization() {
    return builder -> builder.addMixIn(ModelDescription.class, ModelDescriptionMixin.class);
  }
}