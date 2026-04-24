package dev.nicktriano.model_selector_demo.crypto;

public interface CryptoService {
  EncryptedValue encrypt(String plaintext, String aad);
  String decrypt(String ciphertextB64, String ivB64, String aad);
}
