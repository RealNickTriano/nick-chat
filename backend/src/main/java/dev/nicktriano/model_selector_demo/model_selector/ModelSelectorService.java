package dev.nicktriano.model_selector_demo.model_selector;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import ch.qos.logback.classic.Level;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.catalog.ModelType;
import dev.langchain4j.model.openai.OpenAiModelCatalog;

@Service
public class ModelSelectorService {

  private final Logger logger = Logger.getLogger(ModelSelectorService.class.getName());

  private final OpenAiModelCatalog openAiModelCatalog;

  public ModelSelectorService(@Value("${app.openai.key}") String openAiApiKey) {
    logger.info("Loading Open AI API Key...");
    this.openAiModelCatalog = new OpenAiModelCatalog.Builder()
      .logRequests(true)
      .logResponses(true)
      .apiKey(openAiApiKey)
      .build();
  }

  public List<ModelDescription> getOpenAiModels() {
    return openAiModelCatalog.listModels();
  }

  public List<ModelDescription> getOpenAiModels(Predicate<? super ModelDescription> filterFunc) {
    return openAiModelCatalog.listModels()
      .stream()
      .filter(filterFunc)
      .toList();
  }
}
