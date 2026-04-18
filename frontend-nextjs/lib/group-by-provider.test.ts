import { describe, expect, it } from "vitest";
import type { Model } from "@/types/model";
import { groupByProvider } from "./group-by-provider";

function model(overrides: Partial<Model> & Pick<Model, "id" | "provider">): Model {
  return {
    id: overrides.id,
    label: overrides.label ?? overrides.id,
    provider: overrides.provider,
    description: overrides.description ?? null,
    createdAt: overrides.createdAt ?? null,
  };
}

describe("groupByProvider", () => {
  it("returns an empty array for no models", () => {
    expect(groupByProvider([])).toEqual([]);
  });

  it("groups models by provider", () => {
    const groups = groupByProvider([
      model({ id: "a", provider: "ANTHROPIC" }),
      model({ id: "b", provider: "OPEN_AI" }),
      model({ id: "c", provider: "ANTHROPIC" }),
    ]);

    expect(groups).toHaveLength(2);
    const anthropic = groups.find((g) => g.provider === "ANTHROPIC");
    const openai = groups.find((g) => g.provider === "OPEN_AI");
    expect(anthropic?.models.map((m) => m.id).sort()).toEqual(["a", "c"]);
    expect(openai?.models.map((m) => m.id)).toEqual(["b"]);
  });

  it("preserves the first-seen order of providers", () => {
    const groups = groupByProvider([
      model({ id: "a", provider: "OPEN_AI" }),
      model({ id: "b", provider: "ANTHROPIC" }),
      model({ id: "c", provider: "OPEN_AI" }),
    ]);

    expect(groups.map((g) => g.provider)).toEqual(["OPEN_AI", "ANTHROPIC"]);
  });

  it("sorts each provider's models by createdAt newest first", () => {
    const [{ models }] = groupByProvider([
      model({ id: "old", provider: "ANTHROPIC", createdAt: "2024-01-01T00:00:00Z" }),
      model({ id: "new", provider: "ANTHROPIC", createdAt: "2026-01-01T00:00:00Z" }),
      model({ id: "mid", provider: "ANTHROPIC", createdAt: "2025-06-01T00:00:00Z" }),
    ]);

    expect(models.map((m) => m.id)).toEqual(["new", "mid", "old"]);
  });

  it("places models with null createdAt at the end", () => {
    const [{ models }] = groupByProvider([
      model({ id: "missing", provider: "OPEN_AI", createdAt: null }),
      model({ id: "dated", provider: "OPEN_AI", createdAt: "2025-01-01T00:00:00Z" }),
    ]);

    expect(models.map((m) => m.id)).toEqual(["dated", "missing"]);
  });

  it("sorts independently within each provider", () => {
    const groups = groupByProvider([
      model({ id: "a-old", provider: "ANTHROPIC", createdAt: "2024-01-01T00:00:00Z" }),
      model({ id: "o-old", provider: "OPEN_AI", createdAt: "2024-01-01T00:00:00Z" }),
      model({ id: "a-new", provider: "ANTHROPIC", createdAt: "2026-01-01T00:00:00Z" }),
      model({ id: "o-new", provider: "OPEN_AI", createdAt: "2026-01-01T00:00:00Z" }),
    ]);

    const anthropic = groups.find((g) => g.provider === "ANTHROPIC");
    const openai = groups.find((g) => g.provider === "OPEN_AI");
    expect(anthropic?.models.map((m) => m.id)).toEqual(["a-new", "a-old"]);
    expect(openai?.models.map((m) => m.id)).toEqual(["o-new", "o-old"]);
  });
});
