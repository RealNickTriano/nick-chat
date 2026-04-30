package dev.nicktriano.model_selector_demo.models;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.anthropic.AnthropicModelCatalog;
import dev.langchain4j.model.catalog.ModelCatalog;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.openai.OpenAiModelCatalog;
import dev.nicktriano.model_selector_demo.models.ModelsResponse.ModelEntry;
import dev.nicktriano.model_selector_demo.models.ModelsResponse.ProviderModels;

@Service
public class ModelService {

  private static final Logger log = Logger.getLogger(ModelService.class.getName());

  private static final List<ModelProvider> CATALOG_PROVIDERS = List.of(
      ModelProvider.OPEN_AI,
      ModelProvider.ANTHROPIC);

  private final String openAiKey;
  private final String anthropicKey;
  private final int cacheTtlMinutes;

  private volatile List<ProviderModels> cache = List.of();
  private volatile Instant cacheTime = Instant.EPOCH;

  public ModelService(
      @Value("${app.openai.key}") String openAiKey,
      @Value("${app.anthropic.key}") String anthropicKey,
      @Value("${app.models.cache-ttl-minutes:15}") int cacheTtlMinutes) {
    this.openAiKey = openAiKey;
    this.anthropicKey = anthropicKey;
    this.cacheTtlMinutes = cacheTtlMinutes;
  }

  public ModelsResponse listModels(Optional<String> providerFilter) {
    refreshIfStale();
    List<ProviderModels> result = providerFilter
        .map(p -> cache.stream().filter(pm -> pm.provider().equals(p)).toList())
        .orElse(cache);
    return new ModelsResponse(result);
  }

  private synchronized void refreshIfStale() {
    if (Duration.between(cacheTime, Instant.now()).toMinutes() < cacheTtlMinutes)
      return;
    try {
      cache = buildCatalog();
      cacheTime = Instant.now();
    } catch (Exception e) {
      log.warning("Model catalog refresh failed, serving stale cache: " + e.getMessage());
    }
  }

  private List<ProviderModels> buildCatalog() {
    List<ProviderModels> result = new ArrayList<>();
    for (ModelProvider provider : CATALOG_PROVIDERS) {
      try {
        Optional<ModelCatalog> catalog = catalogFor(provider);
        if (catalog.isEmpty())
          continue;
        List<ModelEntry> models = catalog.get().listModels().stream()
            .map(this::toEntry)
            .toList();
        result.add(new ProviderModels(provider.name(), models));
      } catch (Exception e) {
        log.warning("Failed to fetch models for provider " + provider + ": " + e.getMessage());
      }
    }
    return List.copyOf(result);
  }

  private Optional<ModelCatalog> catalogFor(ModelProvider provider) {
    return switch (provider) {
      case OPEN_AI -> Optional.of(new OpenAiModelCatalog.Builder()
          .apiKey(openAiKey)
          .build());
      case ANTHROPIC -> Optional.of(new AnthropicModelCatalog.Builder()
          .apiKey(anthropicKey)
          .build());
      default -> Optional.empty();
    };
  }

  private ModelEntry toEntry(ModelDescription m) {
    return new ModelEntry(
        m.name(),
        m.displayName(),
        m.description(),
        m.provider(),
        m.type(),
        m.maxInputTokens(),
        m.maxOutputTokens(),
        m.createdAt(),
        m.owner()
    );
  }
}
