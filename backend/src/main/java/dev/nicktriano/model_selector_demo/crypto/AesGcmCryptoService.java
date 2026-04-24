package dev.nicktriano.model_selector_demo.crypto;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AesGcmCryptoService implements CryptoService {

  private static final String ALGORITHM = "AES/GCM/NoPadding";
  private static final int IV_LENGTH_BYTES = 12;
  private static final int TAG_LENGTH_BITS = 128;

  private final SecretKeySpec masterKey;

  public AesGcmCryptoService(@Value("${app.encryption.master-key}") String masterKeyB64) {
    byte[] keyBytes = Base64.getDecoder().decode(masterKeyB64);
    if (keyBytes.length != 32) {
      throw new IllegalStateException(
          "app.encryption.master-key must decode to exactly 32 bytes, got " + keyBytes.length);
    }
    this.masterKey = new SecretKeySpec(keyBytes, "AES");
  }

  @Override
  public EncryptedValue encrypt(String plaintext, String aad) {
    try {
      byte[] iv = new byte[IV_LENGTH_BYTES];
      new SecureRandom().nextBytes(iv);

      Cipher cipher = Cipher.getInstance(ALGORITHM);
      cipher.init(Cipher.ENCRYPT_MODE, masterKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
      cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
      byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

      return new EncryptedValue(
          Base64.getEncoder().encodeToString(ciphertext),
          Base64.getEncoder().encodeToString(iv));
    } catch (GeneralSecurityException e) {
      throw new CryptoException("Encryption failed", e);
    }
  }

  @Override
  public String decrypt(String ciphertextB64, String ivB64, String aad) {
    try {
      byte[] iv = Base64.getDecoder().decode(ivB64);
      byte[] ciphertext = Base64.getDecoder().decode(ciphertextB64);

      Cipher cipher = Cipher.getInstance(ALGORITHM);
      cipher.init(Cipher.DECRYPT_MODE, masterKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
      cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
      byte[] plaintext = cipher.doFinal(ciphertext);

      return new String(plaintext, StandardCharsets.UTF_8);
    } catch (GeneralSecurityException e) {
      throw new CryptoException("Decryption failed", e);
    }
  }
}
