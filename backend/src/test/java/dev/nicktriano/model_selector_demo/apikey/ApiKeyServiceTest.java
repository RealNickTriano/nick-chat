package dev.nicktriano.model_selector_demo.apikey;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import dev.nicktriano.model_selector_demo.crypto.CryptoService;
import dev.nicktriano.model_selector_demo.crypto.EncryptedValue;

class ApiKeyServiceTest {

  private ApiKeyRepository repository;
  private CryptoService cryptoService;
  private ApiKeyService service;

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final String PROVIDER = "openai";
  private static final String RAW_KEY = "sk-abcdefghijklmnop";
  private static final String AAD = USER_ID + ":" + PROVIDER;

  @BeforeEach
  void setUp() {
    repository = mock(ApiKeyRepository.class);
    cryptoService = mock(CryptoService.class);
    service = new ApiKeyService(repository, cryptoService);
  }

  @Test
  void upsert_newKey_createsEntity() {
    EncryptedValue encrypted = new EncryptedValue("cipherB64", "ivB64");
    when(cryptoService.encrypt(RAW_KEY, AAD)).thenReturn(encrypted);
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER)).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER, RAW_KEY);

    assertEquals(PROVIDER, response.provider());
    assertEquals("sk-a...mnop", response.keyMask());
    verify(cryptoService).encrypt(RAW_KEY, AAD);
    verify(repository).save(any(ApiKeyEntity.class));
  }

  @Test
  void upsert_existingKey_updatesInPlace() {
    ApiKeyEntity existing = new ApiKeyEntity();
    existing.setUserId(USER_ID);
    existing.setProvider(PROVIDER);
    existing.setEncryptedKey("oldCipher");
    existing.setKeyIv("oldIv");
    existing.setKeyMask("old...mask");

    EncryptedValue encrypted = new EncryptedValue("newCipher", "newIv");
    when(cryptoService.encrypt(RAW_KEY, AAD)).thenReturn(encrypted);
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER)).thenReturn(Optional.of(existing));
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.upsert(USER_ID, PROVIDER, RAW_KEY);

    assertEquals("newCipher", existing.getEncryptedKey());
    assertEquals("newIv", existing.getKeyIv());
    verify(repository).save(existing);
  }

  @Test
  void upsert_blankKey_throwsBadRequest() {
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.upsert(USER_ID, PROVIDER, "  "));

    assertEquals(400, ex.getStatusCode().value());
  }

  @Test
  void upsert_nullKey_throwsBadRequest() {
    assertThrows(ResponseStatusException.class,
        () -> service.upsert(USER_ID, PROVIDER, null));
  }

  @Test
  void upsert_mask_isFirstFourDotsLastFour() {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER, "sk-abcdefghijklmnop");

    assertEquals("sk-a...mnop", response.keyMask());
  }

  @Test
  void upsert_shortKey_maskIsDots() {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER, "short");

    assertEquals("...", response.keyMask());
  }

  @Test
  void listKeys_returnsMappedResponses() {
    ApiKeyEntity e1 = entityWith(PROVIDER, "mask1");
    ApiKeyEntity e2 = entityWith("anthropic", "mask2");
    when(repository.findByUserId(USER_ID)).thenReturn(List.of(e1, e2));

    List<ApiKeyResponse> result = service.listKeys(USER_ID);

    assertEquals(2, result.size());
    assertEquals(PROVIDER, result.get(0).provider());
    assertEquals("anthropic", result.get(1).provider());
  }

  @Test
  void listKeys_noKeys_returnsEmptyList() {
    when(repository.findByUserId(USER_ID)).thenReturn(List.of());

    assertTrue(service.listKeys(USER_ID).isEmpty());
  }

  @Test
  void delete_delegatesToRepository() {
    service.delete(USER_ID, PROVIDER);

    verify(repository).deleteByUserIdAndProvider(USER_ID, PROVIDER);
  }

  @Test
  void getDecryptedKey_found_returnsPlaintext() {
    ApiKeyEntity entity = new ApiKeyEntity();
    entity.setEncryptedKey("cipherB64");
    entity.setKeyIv("ivB64");
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER)).thenReturn(Optional.of(entity));
    when(cryptoService.decrypt("cipherB64", "ivB64", AAD)).thenReturn(RAW_KEY);

    String result = service.getDecryptedKey(USER_ID, PROVIDER);

    assertEquals(RAW_KEY, result);
    verify(cryptoService).decrypt(eq("cipherB64"), eq("ivB64"), eq(AAD));
  }

  @Test
  void getDecryptedKey_notFound_throwsNotFound() {
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER)).thenReturn(Optional.empty());

    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> service.getDecryptedKey(USER_ID, PROVIDER));

    assertEquals(404, ex.getStatusCode().value());
  }

  private static ApiKeyEntity entityWith(String provider, String mask) {
    ApiKeyEntity e = new ApiKeyEntity();
    e.setUserId(USER_ID);
    e.setProvider(provider);
    e.setKeyMask(mask);
    return e;
  }
}
