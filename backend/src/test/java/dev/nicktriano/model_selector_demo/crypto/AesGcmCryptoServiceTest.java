package dev.nicktriano.model_selector_demo.crypto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Base64;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AesGcmCryptoServiceTest {

  // 32 zero-bytes as base64 — valid AES-256 key for tests only
  private static final String TEST_KEY_B64 = Base64.getEncoder().encodeToString(new byte[32]);

  private AesGcmCryptoService service;

  @BeforeEach
  void setUp() {
    service = new AesGcmCryptoService(TEST_KEY_B64);
  }

  @Test
  void encryptThenDecrypt_roundTrip() {
    String plaintext = "sk-ant-api03-supersecretkey";
    String aad = "550e8400-e29b-41d4-a716-446655440000:anthropic";

    EncryptedValue encrypted = service.encrypt(plaintext, aad);
    String decrypted = service.decrypt(encrypted.ciphertextB64(), encrypted.ivB64(), aad);

    assertEquals(plaintext, decrypted);
  }

  @Test
  void encrypt_differentIvEachCall() {
    String plaintext = "sk-ant-api03-supersecretkey";
    String aad = "user-id:anthropic";

    EncryptedValue first = service.encrypt(plaintext, aad);
    EncryptedValue second = service.encrypt(plaintext, aad);

    assertNotEquals(first.ivB64(), second.ivB64());
    assertNotEquals(first.ciphertextB64(), second.ciphertextB64());
  }

  @Test
  void decrypt_wrongAad_throws() {
    String plaintext = "sk-ant-api03-supersecretkey";
    EncryptedValue encrypted = service.encrypt(plaintext, "user-id:anthropic");

    assertThrows(CryptoException.class,
        () -> service.decrypt(encrypted.ciphertextB64(), encrypted.ivB64(), "user-id:openai"));
  }

  @Test
  void decrypt_tamperedCiphertext_throws() {
    String plaintext = "sk-ant-api03-supersecretkey";
    String aad = "user-id:anthropic";
    EncryptedValue encrypted = service.encrypt(plaintext, aad);

    byte[] cipherBytes = Base64.getDecoder().decode(encrypted.ciphertextB64());
    cipherBytes[0] ^= 0xFF;
    String tampered = Base64.getEncoder().encodeToString(cipherBytes);

    assertThrows(CryptoException.class,
        () -> service.decrypt(tampered, encrypted.ivB64(), aad));
  }

  @Test
  void constructor_badKeyLength_throws() {
    String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

    assertThrows(IllegalStateException.class, () -> new AesGcmCryptoService(shortKey));
  }
}
