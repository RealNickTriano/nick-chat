package dev.nicktriano.model_selector_demo.apikey;

import java.time.Instant;

public record ApiKeyResponse(String provider, String keyMask, Instant createdAt, Instant updatedAt) {

  static ApiKeyResponse from(ApiKeyEntity entity) {
    return new ApiKeyResponse(
        entity.getProvider(),
        entity.getKeyMask(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }
}
