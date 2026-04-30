package dev.nicktriano.model_selector_demo.apikey;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.langchain4j.model.ModelProvider;
import dev.nicktriano.model_selector_demo.crypto.CryptoService;
import dev.nicktriano.model_selector_demo.crypto.EncryptedValue;

@Service
@Transactional
public class ApiKeyService {

  private static final Set<ModelProvider> SUPPORTED_PROVIDERS = EnumSet.of(
      ModelProvider.ANTHROPIC,
      ModelProvider.OPEN_AI,
      ModelProvider.GOOGLE_AI_GEMINI,
      ModelProvider.MISTRAL_AI
  );

  private final ApiKeyRepository apiKeyRepository;
  private final CryptoService cryptoService;

  public ApiKeyService(ApiKeyRepository apiKeyRepository, CryptoService cryptoService) {
    this.apiKeyRepository = apiKeyRepository;
    this.cryptoService = cryptoService;
  }

  public ApiKeyResponse upsert(UUID userId, String provider, String rawKey) {
    String storedProvider = resolveProvider(provider).name();
    String aad = aad(userId, storedProvider);
    EncryptedValue encrypted = cryptoService.encrypt(rawKey, aad);
    String mask = mask(rawKey);

    ApiKeyEntity entity = apiKeyRepository
        .findByUserIdAndProvider(userId, storedProvider)
        .orElseGet(() -> {
          ApiKeyEntity e = new ApiKeyEntity();
          e.setUserId(userId);
          e.setProvider(storedProvider);
          return e;
        });

    entity.setEncryptedKey(encrypted.ciphertextB64());
    entity.setKeyIv(encrypted.ivB64());
    entity.setKeyMask(mask);

    return ApiKeyResponse.from(apiKeyRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public List<ApiKeyResponse> listKeys(UUID userId) {
    return apiKeyRepository.findByUserId(userId).stream()
        .map(ApiKeyResponse::from)
        .toList();
  }

  public void delete(UUID userId, String provider) {
    String storedProvider = resolveProvider(provider).name();
    apiKeyRepository.deleteByUserIdAndProvider(userId, storedProvider);
  }

  @Transactional(readOnly = true)
  public String getDecryptedKey(UUID userId, String provider) {
    String storedProvider = resolveProvider(provider).name();
    ApiKeyEntity entity = apiKeyRepository.findByUserIdAndProvider(userId, storedProvider)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "No API key saved for provider: " + storedProvider));
    return cryptoService.decrypt(entity.getEncryptedKey(), entity.getKeyIv(), aad(userId, storedProvider));
  }

  private static ModelProvider resolveProvider(String value) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "provider must not be blank");
    }
    ModelProvider provider;
    try {
      provider = ModelProvider.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider: " + value);
    }
    if (!SUPPORTED_PROVIDERS.contains(provider)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown provider: " + value);
    }
    return provider;
  }

  private static String aad(UUID userId, String provider) {
    return userId + ":" + provider;
  }

  private static String mask(String key) {
    if (key.length() <= 8) {
      return "...";
    }
    return key.substring(0, 4) + "..." + key.substring(key.length() - 4);
  }
}
