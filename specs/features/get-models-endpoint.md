# GET /models Endpoint

## Context & Current State

There is already a prototype model catalog endpoint at `GET /catalog` (`ModelSelectorController` / `ModelSelectorService`). It returns a flat list of `ModelDescription` objects and is initialized at startup with application-level keys from `app.openai.key` and `app.anthropic.key`. The frontend (`lib/catalog.ts`) currently calls this endpoint.

This endpoint needs to be replaced with `GET /models`. Its sole job is to return a static list of supported providers and their models — no user API keys, no live provider calls.

---

## What Changes

### 1. New `models/` package

**`ModelController.java`** — replaces `ModelSelectorController`

```
GET /models?provider={providerName}   (provider is optional)
```

- If `provider` is present, validates it against `SUPPORTED_PROVIDERS`; returns `400` with `"Unknown provider: <value>"` on mismatch.
- Delegates to `ModelService.listModels(optionalProvider)`.
- Returns `ModelsResponse`. No `userId` needed.

**`ModelService.java`**

The model list is fetched from LangChain4j's `ModelCatalog` implementations using application-level keys (not per-user keys) and cached with a TTL. No `ApiKeyService` dependency.

Cache strategy: store the full `List<ProviderModels>` in memory with a timestamp. On request, if the cache is older than `app.models.cache-ttl-minutes` (default 15), re-fetch from all providers and replace it. If a re-fetch fails, log the error and serve the stale cache rather than returning an error.

```java
@Service
public class ModelService {

    private final String openAiKey;
    private final String anthropicKey;
    private volatile List<ProviderModels> cache = List.of();
    private volatile Instant cacheTime = Instant.EPOCH;

    public ModelService(
        @Value("${app.openai.key}") String openAiKey,
        @Value("${app.anthropic.key}") String anthropicKey,
        @Value("${app.models.cache-ttl-minutes:15}") int cacheTtlMinutes
    ) {
        this.openAiKey = openAiKey;
        this.anthropicKey = anthropicKey;
        this.cacheTtlMinutes = cacheTtlMinutes;
    }

    public ModelsResponse listModels(Optional<String> providerFilter) {
        refreshIfStale();
        List<ProviderModels> result = providerFilter
            .map(p -> cache.stream().filter(pm -> pm.provider().equals(p)).toList())
            .orElse(cache);
        return new ModelsResponse(result);
    }

    private synchronized void refreshIfStale() {
        if (Duration.between(cacheTime, Instant.now()).toMinutes() < cacheTtlMinutes) return;
        try {
            cache = buildCatalog();
            cacheTime = Instant.now();
        } catch (Exception e) {
            log.warn("Model catalog refresh failed, serving stale cache", e);
        }
    }
}
```

`buildCatalog()` calls each supported `ModelCatalog` implementation, maps `ModelDescription` → `ModelEntry`, and collects into `List<ProviderModels>`. Providers that throw during the fetch are logged and omitted from that refresh cycle.

**`catalogFor` method:**

```java
private Optional<ModelCatalog> catalogFor(ModelProvider provider, String apiKey) {
    return switch (provider) {
        case OPEN_AI   -> Optional.of(new OpenAiModelCatalog.Builder().apiKey(apiKey).build());
        case ANTHROPIC -> Optional.of(new AnthropicModelCatalog.Builder().apiKey(apiKey).build());
        default        -> Optional.empty();  // GOOGLE_AI_GEMINI, MISTRAL_AI — no catalog yet
    };
}
```

**`ModelsResponse.java`** (records):

```java
record ModelsResponse(List<ProviderModels> providers) {}
record ProviderModels(String provider, List<ModelEntry> models) {}
record ModelEntry(String id, String displayName, ModelType type, Integer maxInputTokens, Integer maxOutputTokens) {}
```

Field mapping from `ModelDescription`:

| `ModelDescription` method | `ModelEntry` field | Notes |
|---|---|---|
| `name()` | `id` | Always present |
| `displayName() ?? name()` | `displayName` | Non-null fallback to `name()` |
| `type()` | `type` | Omit if null |
| `maxInputTokens()` | `maxInputTokens` | Omit if null |
| `maxOutputTokens()` | `maxOutputTokens` | Omit if null |

Use `@JsonInclude(NON_NULL)` on the records to suppress null fields.

---

### 2. Remove / retire old endpoints

- Delete `ModelSelectorController.java` and `ModelSelectorService.java`.
- `JacksonConfig` and `ModelDescriptionMixin` serialized raw `ModelDescription` for the old flat-list response. Since `GET /models` now uses explicit DTOs, these can be deleted — verify nothing else serializes `ModelDescription` directly first.

---

### 3. Frontend update (`lib/catalog.ts`)

- Change the fetch URL from `/catalog` to `/models`.
- Adapt to the new response shape: `data.providers` is an array of `{ provider, models }`. Flatten across providers to build `Model[]`, setting each model's `provider` from the wrapping `ProviderModels.provider` field.
- Update `BackendModel` interface: `name` becomes `id`; `description`, `provider`, `createdAt` are no longer top-level model fields.
- Update `types/model.ts` if the `Model` type changes (e.g. dropping `description` / `createdAt` if unused by the UI).

---

### 4. Config

Add to `application.properties`:
```properties
app.models.cache-ttl-minutes=15
```

Each provider has its own application-level key used exclusively for catalog fetching. These are distinct from `app.title-generation.openai-api-key`:

```properties
app.openai.key=${OPEN_AI_API_KEY}
app.anthropic.key=${ANTHROPIC_API_KEY}
# add when catalog support lands:
# app.google.key=${GOOGLE_API_KEY}
# app.mistral.key=${MISTRAL_API_KEY}
```

`ModelService` injects these directly (e.g. `@Value("${app.openai.key}")`). The title-generation key is never used here.

---

## Request / Response

**Request:**
```
GET /models
GET /models?provider=OPEN_AI
```

**Response `200 OK`:**
```json
{
  "providers": [
    {
      "provider": "OPEN_AI",
      "models": [
        {
          "id": "gpt-4o",
          "displayName": "GPT-4o",
          "type": "CHAT",
          "maxInputTokens": 128000,
          "maxOutputTokens": 16384
        }
      ]
    },
    {
      "provider": "ANTHROPIC",
      "models": [
        {
          "id": "claude-opus-4-7",
          "displayName": "Claude Opus 4.7",
          "type": "CHAT",
          "maxInputTokens": 200000,
          "maxOutputTokens": 32000
        }
      ]
    }
  ]
}
```

**Error cases:**
- `400` — unknown provider value in query param
- `401` — missing/invalid session

---

## Call Sequence

```
GET /models?provider=OPEN_AI
  → ModelController.getModels("OPEN_AI")
  → ModelService.listModels(Optional.of("OPEN_AI"))
      → refreshIfStale()
          → if cache age < 15 min: skip
          → else: call OpenAiModelCatalog + AnthropicModelCatalog, rebuild cache
      → filter cache to OPEN_AI
  → return ModelsResponse([ProviderModels("OPEN_AI", [...])])
```

---

## Files to Create
- `models/ModelController.java`
- `models/ModelService.java`
- `models/ModelsResponse.java` (or inline records in `ModelService`)

## Files to Delete
- `model_selector/ModelSelectorController.java`
- `model_selector/ModelSelectorService.java`
- `config/JacksonConfig.java` *(verify nothing else uses `ModelDescriptionMixin` first)*
- `config/ModelDescriptionMixin.java`

## Files to Update
- `frontend-nextjs/lib/catalog.ts` — new URL + new response shape
- `frontend-nextjs/types/model.ts` — update `Model` type if fields change
