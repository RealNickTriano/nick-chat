package dev.nicktriano.model_selector_demo.model_selector;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.langchain4j.model.catalog.ModelCatalog;
import dev.langchain4j.model.catalog.ModelDescription;
import dev.langchain4j.model.catalog.ModelType;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
public class ModelSelectorController {
  
  private final ModelSelectorService modelSelectorService;

  public ModelSelectorController(ModelSelectorService service) {
    this.modelSelectorService = service;
  }

  @GetMapping("/catalog")
  public List<ModelDescription> getModelCatalog() {
    List<ModelDescription> models = new ArrayList<>();
    List<ModelDescription> openAiModels = modelSelectorService.getOpenAiModels();
    List<ModelDescription> anthropicModels = modelSelectorService.getAnthropicModels();
    
    models.addAll(openAiModels);
    models.addAll(anthropicModels);

    return models;
  }

  @GetMapping("/catalog/chat-only")
  public List<ModelDescription> getModelCatalogChatOnly() {
    return modelSelectorService.getOpenAiModels((el) -> {
      return isNotSnapshot(el.name());
    });
  }

  private boolean isNotSnapshot(String id) {
    // Matches patterns like "-0613" or "-2024" at the end of the string
    return (
      !id.matches(".*-\\d{4}$")
        && !id.matches(".*-\\d{4}-\\d{2}-\\d{2}$")
        && !id.contains("-preview")
        && !id.contains("-image")
        && !id.contains("-audio")
        && !id.contains("davinci")
        && !id.contains("babbage")
        && !id.contains("dall-e")
        && !id.contains("tts")
        && !id.contains("text")
        && !id.contains("transcribe")
        && !id.contains("search")
        && !id.contains("sora")
        && !id.contains("whisper")
        && !id.contains("realtime")
    );
  }
}
