package dev.nicktriano.model_selector_demo.models;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import dev.langchain4j.model.ModelProvider;

@RestController
public class ModelController {

  private final ModelService modelService;

  public ModelController(ModelService modelService) {
    this.modelService = modelService;
  }

  @GetMapping("/models")
  public ModelsResponse getModels(@RequestParam(required = false) String provider) {
    validateProvider(provider);
    return modelService.listModels(Optional.ofNullable(provider));
  }

  private void validateProvider(String provider) {
    if (provider != null) {
      try {
        ModelProvider.valueOf(provider);
      } catch (IllegalArgumentException e) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider: " + provider);
      }
    }
  }
}
