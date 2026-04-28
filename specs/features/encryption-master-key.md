# Encryption Master Key — Setup and Management

## Purpose

`ENCRYPTION_MASTER_KEY` is the AES-256-GCM master key used by `AesGcmCryptoService` to encrypt and decrypt user API keys before they are stored in the database. Every row in `api_keys` is encrypted with this key using a unique random IV and an AAD of `userId:provider`. Without a valid key the application will not start (`IllegalStateException` is thrown in the constructor if the decoded key is not exactly 32 bytes).

---

## Generating a Real Key

The key must be **32 cryptographically random bytes**, base64-encoded (no URL-safe encoding, standard base64). The result is always 44 characters.

**Using OpenSSL (recommended):**
```bash
openssl rand -base64 32
```

**Using Python:**
```python
import secrets, base64
print(base64.b64encode(secrets.token_bytes(32)).decode())
```

**Using Java (one-off):**
```java
byte[] key = new byte[32];
new java.security.SecureRandom().nextBytes(key);
System.out.println(java.util.Base64.getEncoder().encodeToString(key));
```

The output looks like:
```
3n7kLmP0+Qr4TvWxYz8aAbBcCdDdEeFfGgHhIiJjKkLl=
```

Set it in `.env`:
```
ENCRYPTION_MASTER_KEY=<output from above>
```

---

## Critical: Key Is Tied to Stored Data

**If you change the key, all previously encrypted rows become unreadable.** There is no automatic migration. Decryption will throw `CryptoException` for every existing row when the app tries to use a stored API key.

Safe sequences:
- **Fresh environment** (no stored keys): generate a new key freely.
- **Existing keys in DB**: you must either (a) re-encrypt all rows with the new key before switching, or (b) delete all rows from `api_keys` and have users re-enter their keys after the swap.

Key rotation (re-encrypting rows with a new key) is out of scope for v1. Track it separately when it becomes a requirement.

---

## Environment Separation

Generate a separate key for each environment. Never reuse the dev key in production.

| Environment | Source |
|---|---|
| Local dev | `.env` file (gitignored) |
| CI / staging | CI secret (GitHub Actions secret, etc.) |
| Production | Secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) — inject as env var at runtime |

The `application.properties` binding `app.encryption.master-key=${ENCRYPTION_MASTER_KEY}` is the injection point in all environments.

---

## `.env` File Hygiene

`.env` must be in `.gitignore`. An `.env.example` file should live in the repo with a placeholder:

```bash
# Generate with: openssl rand -base64 32
ENCRYPTION_MASTER_KEY=<generate with openssl rand -base64 32>
```

Never commit an actual key value to git, even a dev key. If a key is accidentally committed, treat it as compromised and rotate immediately (which requires re-encrypting stored rows — see above).

---

## Startup Validation

`AesGcmCryptoService` decodes the key in its constructor and throws `IllegalStateException` if the decoded length is not exactly 32 bytes. This means:

- A missing env var → Spring `@Value` injection fails at startup.
- A wrongly-padded or truncated value → `IllegalArgumentException` from `Base64.getDecoder()` or `IllegalStateException` from the length check.

Either way the app refuses to start, which is the correct behavior — a misconfigured key is caught before any user data is touched.

---

## What the Key Does Not Protect Against

- A compromised database **and** a compromised server process: an attacker who can read memory or environment variables has the key.
- The key does not protect keys in transit — TLS handles that.
- The AAD (`userId:provider`) binds each ciphertext to a specific row, preventing cross-user or cross-provider ciphertext swapping, but the key itself is shared across all rows.

For a higher security bar (e.g., per-user keys, envelope encryption), that would be a separate design exercise.
