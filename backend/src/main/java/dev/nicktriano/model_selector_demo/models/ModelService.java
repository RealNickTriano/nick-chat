package dev.nicktriano.model_selector_demo.models;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import dev.langchain4j.model.ModelProvider;
import dev.langchain4j.model.anthropic.AnthropicModelCatalog;
import dev.langchain4j.model.catalog.ModelCatalog;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.googleai.GoogleAiGeminiModelCatalog;
import dev.langchain4j.model.mistralai.MistralAiModelCatalog;
import dev.langchain4j.model.openai.OpenAiModelCatalog;
import dev.nicktriano.model_selector_demo.models.ModelsResponse.ModelEntry;
import dev.nicktriano.model_selector_demo.models.ModelsResponse.ProviderModels;

@Service
public class ModelService {

  private static final Logger log = Logger.getLogger(ModelService.class.getName());

  private static final List<ModelProvider> CATALOG_PROVIDERS = List.of(
      ModelProvider.OPEN_AI,
      ModelProvider.ANTHROPIC,
      ModelProvider.GOOGLE_AI_GEMINI,
      ModelProvider.MISTRAL_AI);

  private final String openAiKey;
  private final String anthropicKey;
  private final String googleKey;
  private final String mistralKey;
  private final int cacheTtlMinutes;

  private volatile List<ProviderModels> cache = List.of();
  private volatile Instant cacheTime = Instant.EPOCH;

  public ModelService(
      @Value("${app.openai.key}") String openAiKey,
      @Value("${app.anthropic.key}") String anthropicKey,
      @Value("${app.google.key}") String googleKey,
      @Value("${app.mistral.key}") String mistralKey,
      @Value("${app.models.cache-ttl-minutes:15}") int cacheTtlMinutes) {
    this.openAiKey = openAiKey;
    this.anthropicKey = anthropicKey;
    this.googleKey = googleKey;
    this.mistralKey = mistralKey;
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
            .map(m -> toEntry(m, provider))
            .filter(distinctById())
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
      case GOOGLE_AI_GEMINI -> Optional.of(new GoogleAiGeminiModelCatalog.Builder()
          .apiKey(googleKey)
          .build());
      case MISTRAL_AI -> Optional.of(new MistralAiModelCatalog.Builder()
          .apiKey(mistralKey)
          .build());
      default -> Optional.empty();
    };
  }

  private static Predicate<ModelEntry> distinctById() {
    Set<String> seen = new HashSet<>();
    return entry -> seen.add(entry.id());
  }

  private ModelEntry toEntry(ModelDescription m, ModelProvider provider) {
    return new ModelEntry(
        m.name(),
        m.displayName(),
        m.description(),
        m.provider(),
        m.type(),
        m.maxInputTokens(),
        m.maxOutputTokens(),
        provider == ModelProvider.MISTRAL_AI ? null : m.createdAt(),
        m.owner()
    );
  }
}
