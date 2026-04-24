package dev.nicktriano.model_selector_demo.apikey;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.nicktriano.model_selector_demo.auth.CurrentUserId;

@RestController
@RequestMapping("/api-keys")
public class ApiKeyController {

  private final ApiKeyService apiKeyService;

  public ApiKeyController(ApiKeyService apiKeyService) {
    this.apiKeyService = apiKeyService;
  }

  @PutMapping("/{provider}")
  public ResponseEntity<ApiKeyResponse> upsert(
      @CurrentUserId UUID userId,
      @PathVariable String provider,
      @RequestBody UpsertApiKeyRequest request
  ) {
    return ResponseEntity.ok(apiKeyService.upsert(userId, provider, request.key()));
  }

  @GetMapping
  public ResponseEntity<List<ApiKeyResponse>> list(@CurrentUserId UUID userId) {
    return ResponseEntity.ok(apiKeyService.listKeys(userId));
  }

  @DeleteMapping("/{provider}")
  public ResponseEntity<Void> delete(
      @CurrentUserId UUID userId,
      @PathVariable String provider
  ) {
    apiKeyService.delete(userId, provider);
    return ResponseEntity.noContent().build();
  }
}
