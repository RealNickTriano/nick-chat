package dev.nicktriano.model_selector_demo.apikey;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.nicktriano.model_selector_demo.crypto.CryptoService;
import dev.nicktriano.model_selector_demo.crypto.EncryptedValue;

class ApiKeyServiceTest {

  private ApiKeyRepository repository;
  private CryptoService cryptoService;
  private ApiKeyService service;

  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final String PROVIDER_INPUT = "OPEN_AI";
  private static final String PROVIDER_STORED = "OPEN_AI"; // ModelProvider.OPEN_AI.name()
  private static final String RAW_KEY = "sk-abcdefghijklmnop";
  private static final String AAD = USER_ID + ":" + PROVIDER_STORED;

  @BeforeEach
  void setUp() {
    repository = mock(ApiKeyRepository.class);
    cryptoService = mock(CryptoService.class);
    service = new ApiKeyService(repository, cryptoService);
  }

  // --- provider validation ---

  @ParameterizedTest
  @ValueSource(strings = { "invalid", "AMAZON_BEDROCK", "GITHUB_MODELS", "OTHER" })
  void upsert_unsupportedProvider_throwsBadRequest(String provider) {
    assertThatThrownBy(() -> service.upsert(USER_ID, provider, RAW_KEY))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.BAD_REQUEST.value());
  }

  @ParameterizedTest
  @ValueSource(strings = { "", "  " })
  void upsert_blankProvider_throwsBadRequest(String provider) {
    assertThatThrownBy(() -> service.upsert(USER_ID, provider, RAW_KEY))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.BAD_REQUEST.value());
  }

  @Test
  void upsert_nullProvider_throwsBadRequest() {
    assertThatThrownBy(() -> service.upsert(USER_ID, null, RAW_KEY))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.BAD_REQUEST.value());
  }

  @ParameterizedTest
  @ValueSource(strings = { "OPEN_AI", "open_ai", "Open_Ai" })
  void upsert_providerIsCaseInsensitive(String provider) {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, provider, RAW_KEY);

    assertThat(response.provider()).isEqualTo(PROVIDER_STORED);
  }

  @ParameterizedTest
  @ValueSource(strings = { "ANTHROPIC", "OPEN_AI", "GOOGLE_AI_GEMINI", "MISTRAL_AI" })
  void upsert_allSupportedProviders_succeed(String provider) {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    assertThat(service.upsert(USER_ID, provider, RAW_KEY)).isNotNull();
  }

  // --- upsert behaviour ---

  @Test
  void upsert_newKey_createsEntityWithCorrectFields() {
    EncryptedValue encrypted = new EncryptedValue("cipherB64", "ivB64");
    when(cryptoService.encrypt(RAW_KEY, AAD)).thenReturn(encrypted);
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER_STORED)).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER_INPUT, RAW_KEY);

    assertThat(response.provider()).isEqualTo(PROVIDER_STORED);
    assertThat(response.keyMask()).isEqualTo("sk-a...mnop");
    verify(cryptoService).encrypt(RAW_KEY, AAD);
    verify(repository).save(any(ApiKeyEntity.class));
  }

  @Test
  void upsert_existingKey_updatesInPlace() {
    ApiKeyEntity existing = new ApiKeyEntity();
    existing.setUserId(USER_ID);
    existing.setProvider(PROVIDER_STORED);
    existing.setEncryptedKey("oldCipher");
    existing.setKeyIv("oldIv");
    existing.setKeyMask("old...mask");

    EncryptedValue encrypted = new EncryptedValue("newCipher", "newIv");
    when(cryptoService.encrypt(RAW_KEY, AAD)).thenReturn(encrypted);
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER_STORED)).thenReturn(Optional.of(existing));
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.upsert(USER_ID, PROVIDER_INPUT, RAW_KEY);

    assertThat(existing.getEncryptedKey()).isEqualTo("newCipher");
    assertThat(existing.getKeyIv()).isEqualTo("newIv");
    verify(repository).save(existing);
  }

  @Test
  void upsert_mask_firstFourDotsLastFour() {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER_INPUT, "sk-abcdefghijklmnop");

    assertThat(response.keyMask()).isEqualTo("sk-a...mnop");
  }

  @Test
  void upsert_shortKey_maskIsDots() {
    when(cryptoService.encrypt(any(), any())).thenReturn(new EncryptedValue("c", "i"));
    when(repository.findByUserIdAndProvider(any(), any())).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ApiKeyResponse response = service.upsert(USER_ID, PROVIDER_INPUT, "short");

    assertThat(response.keyMask()).isEqualTo("...");
  }

  // --- listKeys ---

  @Test
  void listKeys_returnsMappedResponses() {
    ApiKeyEntity e1 = entityWith(PROVIDER_STORED, "sk-a...mnop");
    ApiKeyEntity e2 = entityWith("ANTHROPIC", "sk-a...wxyz");
    when(repository.findByUserId(USER_ID)).thenReturn(List.of(e1, e2));

    List<ApiKeyResponse> result = service.listKeys(USER_ID);

    assertThat(result).hasSize(2);
    assertThat(result.get(0).provider()).isEqualTo(PROVIDER_STORED);
    assertThat(result.get(1).provider()).isEqualTo("ANTHROPIC");
  }

  @Test
  void listKeys_noKeys_returnsEmptyList() {
    when(repository.findByUserId(USER_ID)).thenReturn(List.of());

    assertThat(service.listKeys(USER_ID)).isEmpty();
  }

  // --- delete ---

  @Test
  void delete_delegatesToRepository_withNormalizedProvider() {
    service.delete(USER_ID, PROVIDER_INPUT);

    verify(repository).deleteByUserIdAndProvider(USER_ID, PROVIDER_STORED);
  }

  @Test
  void delete_unknownProvider_throwsBadRequest() {
    assertThatThrownBy(() -> service.delete(USER_ID, "invalid"))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.BAD_REQUEST.value());
  }

  // --- getDecryptedKey ---

  @Test
  void getDecryptedKey_found_returnsPlaintext() {
    ApiKeyEntity entity = new ApiKeyEntity();
    entity.setEncryptedKey("cipherB64");
    entity.setKeyIv("ivB64");
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER_STORED)).thenReturn(Optional.of(entity));
    when(cryptoService.decrypt("cipherB64", "ivB64", AAD)).thenReturn(RAW_KEY);

    String result = service.getDecryptedKey(USER_ID, PROVIDER_INPUT);

    assertThat(result).isEqualTo(RAW_KEY);
    verify(cryptoService).decrypt(eq("cipherB64"), eq("ivB64"), eq(AAD));
  }

  @Test
  void getDecryptedKey_notFound_throwsNotFound() {
    when(repository.findByUserIdAndProvider(USER_ID, PROVIDER_STORED)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getDecryptedKey(USER_ID, PROVIDER_INPUT))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.NOT_FOUND.value());
  }

  @Test
  void getDecryptedKey_unknownProvider_throwsBadRequest() {
    assertThatThrownBy(() -> service.getDecryptedKey(USER_ID, "invalid"))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(e -> ((ResponseStatusException) e).getStatusCode().value())
        .isEqualTo(HttpStatus.BAD_REQUEST.value());
  }

  // --- helpers ---

  private static ApiKeyEntity entityWith(String provider, String mask) {
    ApiKeyEntity e = new ApiKeyEntity();
    e.setUserId(USER_ID);
    e.setProvider(provider);
    e.setKeyMask(mask);
    return e;
  }
}
