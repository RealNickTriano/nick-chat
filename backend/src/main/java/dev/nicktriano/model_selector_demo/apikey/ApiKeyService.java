package dev.nicktriano.model_selector_demo.apikey;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.nicktriano.model_selector_demo.crypto.CryptoService;
import dev.nicktriano.model_selector_demo.crypto.EncryptedValue;

@Service
@Transactional
public class ApiKeyService {

  private final ApiKeyRepository apiKeyRepository;
  private final CryptoService cryptoService;

  public ApiKeyService(ApiKeyRepository apiKeyRepository, CryptoService cryptoService) {
    this.apiKeyRepository = apiKeyRepository;
    this.cryptoService = cryptoService;
  }

  public ApiKeyResponse upsert(UUID userId, String provider, String rawKey) {
    if (rawKey == null || rawKey.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "key must not be blank");
    }
    String aad = aad(userId, provider);
    EncryptedValue encrypted = cryptoService.encrypt(rawKey, aad);
    String mask = mask(rawKey);

    ApiKeyEntity entity = apiKeyRepository
        .findByUserIdAndProvider(userId, provider)
        .orElseGet(() -> {
          ApiKeyEntity e = new ApiKeyEntity();
          e.setUserId(userId);
          e.setProvider(provider);
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
    apiKeyRepository.deleteByUserIdAndProvider(userId, provider);
  }

  @Transactional(readOnly = true)
  public String getDecryptedKey(UUID userId, String provider) {
    ApiKeyEntity entity = apiKeyRepository.findByUserIdAndProvider(userId, provider)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "No key saved for provider: " + provider));
    return cryptoService.decrypt(entity.getEncryptedKey(), entity.getKeyIv(), aad(userId, provider));
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
