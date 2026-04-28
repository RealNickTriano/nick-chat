import { useState, useEffect } from "react";
import { http } from "./http";
import { ProviderId } from "@/types/model";
import { providerApiKeyUrl, providerLabel } from "./models";

interface BackendApiKeyResponse {
  provider: ProviderId;
  keyMask?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FetchApiKeysResponse {
  apiKeys: BackendApiKeyResponse[];
}

export type ApiKey = BackendApiKeyResponse & {
  label: string;
  docsUrl: string;
  unencryptedKey?: string;
};

const KNOWN_PROVIDERS: ProviderId[] = ["ANTHROPIC", "OPEN_AI", "GOOGLE_AI_GEMINI", "MISTRAL_AI"];

async function fetchApiKeys(): Promise<BackendApiKeyResponse[]> {
  const res = await http.get<FetchApiKeysResponse>("/api-keys");
  return res.data.apiKeys;
}

async function postKeyForProvider(
  provider: string,
  unencryptedKey: string,
): Promise<BackendApiKeyResponse> {
  const res = await http.put<BackendApiKeyResponse>(`/api-keys/${provider}`, {
    key: unencryptedKey,
  });
  return res.data;
}

async function deleteKeyForProviderRequest(provider: string): Promise<void> {
  await http.delete(`/api-keys/${provider}`);
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(
    KNOWN_PROVIDERS.map((p) => ({
      provider: p,
      label: providerLabel(p),
      docsUrl: providerApiKeyUrl(p),
    })),
  );
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Record<ProviderId, "saving" | "deleting" | undefined>>(
    {} as Record<ProviderId, "saving" | "deleting" | undefined>,
  );
  const [errors, setErrors] = useState<Record<ProviderId, string | undefined>>(
    {} as Record<ProviderId, string | undefined>,
  );

  useEffect(() => {
    refreshKeys().then(() => setLoaded(true));
  }, []);

  function clearError(provider: ProviderId) {
    setErrors((prev) => ({ ...prev, [provider]: undefined }));
  }

  function setError(provider: ProviderId, message: string) {
    setErrors((prev) => ({ ...prev, [provider]: message }));
  }

  function setPendingFor(provider: ProviderId, state: "saving" | "deleting" | undefined) {
    setPending((prev) => ({ ...prev, [provider]: state }));
  }

  async function refreshKeys() {
    try {
      const result = await fetchApiKeys();
      setKeys((prev) => {
        const copy = [...prev];
        for (const el of result) {
          const idx = copy.findIndex((item) => el.provider === item.provider);
          if (idx !== -1) copy[idx] = { ...copy[idx], ...el };
        }
        return copy;
      });
    } catch (err) {
      console.error("Error while fetching api keys", err);
    }
  }

  async function saveKeyForProvider(provider: ProviderId, unencryptedKey: string) {
    setPendingFor(provider, "saving");
    clearError(provider);
    try {
      const result = await postKeyForProvider(provider, unencryptedKey);
      setKeys((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((item) => result.provider === item.provider);
        if (idx !== -1) copy[idx] = { ...copy[idx], ...result, unencryptedKey: undefined };
        return copy;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save key";
      setError(provider, message);
      throw err;
    } finally {
      setPendingFor(provider, undefined);
    }
  }

  async function deleteKeyForProvider(provider: ProviderId) {
    setPendingFor(provider, "deleting");
    clearError(provider);
    try {
      await deleteKeyForProviderRequest(provider);
      setKeys((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((item) => provider === item.provider);
        if (idx !== -1) {
          copy[idx] = {
            ...copy[idx],
            keyMask: undefined,
            createdAt: undefined,
            updatedAt: undefined,
          };
        }
        return copy;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete key";
      setError(provider, message);
      throw err;
    } finally {
      setPendingFor(provider, undefined);
    }
  }

  return {
    keys,
    loaded,
    pending,
    errors,
    refreshKeys,
    saveKeyForProvider,
    deleteKeyForProvider,
  };
}
