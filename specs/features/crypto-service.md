# CryptoService

Handles AES-256-GCM encryption and decryption of user API keys before they are stored in the database.

---

## Interface

```java
package dev.nicktriano.model_selector_demo.crypto;

public interface CryptoService {
    EncryptedValue encrypt(String plaintext, String aad);
    String decrypt(String ciphertextB64, String ivB64, String aad);
}
```

`EncryptedValue` is a record:

```java
package dev.nicktriano.model_selector_demo.crypto;

public record EncryptedValue(String ciphertextB64, String ivB64) {}
```

---

## Implementation: `AesGcmCryptoService`

Single Spring `@Service` bean. No other implementations.

### Master Key

Loaded from the environment at startup via `@Value("${app.encryption.master-key}")`. The value must be a **base64-encoded 32-byte** key. Decode it once in the constructor and store it as `SecretKeySpec`.

Fail fast: if the decoded key is not exactly 32 bytes, throw `IllegalStateException` in the constructor — do not let the app start with an invalid key.

```java
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
                "app.encryption.master-key must decode to exactly 32 bytes, got " + keyBytes.length
            );
        }
        this.masterKey = new SecretKeySpec(keyBytes, "AES");
    }
}
```

### `encrypt`

1. Generate a random 12-byte IV using `SecureRandom`.
2. Build a `GCMParameterSpec(TAG_LENGTH_BITS, iv)`.
3. Initialize `Cipher` in `ENCRYPT_MODE` with the master key, GCM params, and the AAD bytes (`aad.getBytes(StandardCharsets.UTF_8)`).
4. Call `cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8))` — the output is `ciphertext + 16-byte auth tag` (GCM appends the tag automatically).
5. Return `new EncryptedValue(Base64.getEncoder().encodeToString(ciphertext), Base64.getEncoder().encodeToString(iv))`.

```java
@Override
public EncryptedValue encrypt(String plaintext, String aad) {
    byte[] iv = new byte[IV_LENGTH_BYTES];
    new SecureRandom().nextBytes(iv);

    Cipher cipher = Cipher.getInstance(ALGORITHM);
    cipher.init(Cipher.ENCRYPT_MODE, masterKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
    cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
    byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

    return new EncryptedValue(
        Base64.getEncoder().encodeToString(ciphertext),
        Base64.getEncoder().encodeToString(iv)
    );
}
```

### `decrypt`

1. Decode `ivB64` and `ciphertextB64` from base64.
2. Build `GCMParameterSpec` and initialize `Cipher` in `DECRYPT_MODE` with the same AAD.
3. Call `cipher.doFinal(ciphertext)` — GCM verifies the auth tag automatically; if it fails, `AEADBadTagException` is thrown (a subclass of `BadPaddingException`).
4. Return `new String(plaintext, StandardCharsets.UTF_8)`.
5. On any exception, **do not propagate the cause** to the caller — throw a generic `CryptoException` (see below).

```java
@Override
public String decrypt(String ciphertextB64, String ivB64, String aad) {
    byte[] iv = Base64.getDecoder().decode(ivB64);
    byte[] ciphertext = Base64.getDecoder().decode(ciphertextB64);

    Cipher cipher = Cipher.getInstance(ALGORITHM);
    cipher.init(Cipher.DECRYPT_MODE, masterKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
    cipher.updateAAD(aad.getBytes(StandardCharsets.UTF_8));
    byte[] plaintext = cipher.doFinal(ciphertext); // throws AEADBadTagException on tamper

    return new String(plaintext, StandardCharsets.UTF_8);
}
```

Wrap the body in try/catch and rethrow as `CryptoException` on failure (see Error Handling).

---

## AAD Convention

The caller constructs the AAD string. For API key encryption the convention is:

```
aad = userId.toString() + ":" + provider   // e.g. "550e8400-e29b-41d4-a716-446655440000:anthropic"
```

This binds each ciphertext to a specific user and provider, preventing an encrypted key from being replayed under a different user or provider row.

The AAD is **not stored** — it is reconstructed from known context at decrypt time. If the wrong AAD is supplied during decryption, the GCM tag check fails and `CryptoException` is thrown.

---

## Error Handling

Define a `CryptoException`:

```java
package dev.nicktriano.model_selector_demo.crypto;

public class CryptoException extends RuntimeException {
    public CryptoException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

`decrypt` catches all checked exceptions (`GeneralSecurityException`) and rethrows as `CryptoException("Decryption failed", cause)`. The cause is kept for server-side logging but the `GlobalExceptionHandler` maps `CryptoException` to a `500 INTERNAL_ERROR` response with no internal detail exposed to the client.

---

## Package Layout

```
crypto/
├── CryptoService.java        (interface)
├── AesGcmCryptoService.java  (implementation)
├── EncryptedValue.java       (record)
└── CryptoException.java      (runtime exception)
```

---

## Tests

Unit tests in `CryptoServiceTest`:

| Test | What it verifies |
|---|---|
| `encryptThenDecrypt_roundTrip` | Decrypt(Encrypt(x)) == x for a sample key |
| `encrypt_differentIvEachCall` | Two calls with the same input produce different IVs |
| `decrypt_wrongAad_throws` | Supplying a different AAD string throws `CryptoException` |
| `decrypt_tamperedCiphertext_throws` | Flipping a byte in the ciphertext throws `CryptoException` |
| `constructor_badKeyLength_throws` | A key that decodes to != 32 bytes throws `IllegalStateException` |

Use `@SpringBootTest` is overkill here — plain JUnit with a hardcoded test key is sufficient.
