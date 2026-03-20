/**
 * Tests for auth-providers (0.3.1.5.1 — LLM Auth Abstraction)
 *
 * Test strategy:
 *   - Unit: ApiKeyAuthProvider returns correct headers per provider convention
 *   - Unit: SetupTokenAuthProvider returns correct OAuth headers
 *   - Unit: NoopAuthProvider returns empty headers (for unauthenticated local endpoints)
 *   - Unit: createAuthProvider factory returns correct provider per type
 *   - Integration: LlmSubstrateAdapter wires the correct auth provider from config
 */

import { describe, it, expect } from "vitest";
import {
  type IAuthProvider,
  ApiKeyAuthProvider,
  SetupTokenAuthProvider,
  NoopAuthProvider,
  createAuthProvider,
} from "../auth-providers.js";
import { LlmSubstrateAdapter, type ILlmClient, type LlmInferenceResult, type LlmProbeResult } from "../llm-substrate-adapter.js";
import type { SubstrateConfig } from "../../conscious-core/types.js";

// ── Test doubles ──────────────────────────────────────────────────────────────

class MockLlmClient implements ILlmClient {
  async probe(): Promise<LlmProbeResult> {
    return { latencyMs: 5, reachable: true };
  }
  async infer(): Promise<LlmInferenceResult> {
    return {
      content: "Here is the information you requested.",
      tokenLogprobs: [],
      promptTokens: 10,
      completionTokens: 8,
      latencyMs: 50,
    };
  }
}

function makeConfig(overrides: Record<string, unknown> = {}): SubstrateConfig {
  return {
    type: "llm",
    parameters: {
      provider: "openai",
      modelId: "gpt-test",
      selfModelPath: `/tmp/auth-test-${Math.random().toString(36).slice(2)}.json`,
      contextWindowTokens: 8192,
      tContinuityMs: 2000,
      systemPromptTemplate: "You are a test agent.",
      ...overrides,
    },
  };
}

// ── ApiKeyAuthProvider ────────────────────────────────────────────────────────

describe("ApiKeyAuthProvider", () => {
  it("returns Authorization: Bearer header for openai provider", () => {
    const provider = new ApiKeyAuthProvider("openai", "sk-test-key-123");
    const headers = provider.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer sk-test-key-123");
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("returns x-api-key header for anthropic provider", () => {
    const provider = new ApiKeyAuthProvider("anthropic", "sk-ant-key-456");
    const headers = provider.getHeaders();
    expect(headers["x-api-key"]).toBe("sk-ant-key-456");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("returns Authorization: Bearer header for local provider", () => {
    const provider = new ApiKeyAuthProvider("local", "local-key");
    const headers = provider.getHeaders();
    expect(headers["Authorization"]).toBe("Bearer local-key");
  });

  it("returns empty headers when no apiKey is provided", () => {
    const provider = new ApiKeyAuthProvider("openai", undefined);
    const headers = provider.getHeaders();
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("isExpired() always returns false (static key never expires)", () => {
    const provider = new ApiKeyAuthProvider("openai", "sk-test");
    expect(provider.isExpired()).toBe(false);
  });

  it("requiresSystemIdentityPrefix() returns false", () => {
    const provider = new ApiKeyAuthProvider("anthropic", "sk-test");
    expect(provider.requiresSystemIdentityPrefix()).toBe(false);
  });
});

// ── SetupTokenAuthProvider ────────────────────────────────────────────────────

describe("SetupTokenAuthProvider", () => {
  const token = "sk-ant-oat01-testtoken123456789012345678901234567890123456789012345678901234567890";

  it("returns Authorization Bearer header with the setup-token", () => {
    const provider = new SetupTokenAuthProvider(token);
    const headers = provider.getHeaders();
    expect(headers["Authorization"]).toBe(`Bearer ${token}`);
  });

  it("does not include x-api-key header", () => {
    const provider = new SetupTokenAuthProvider(token);
    expect(provider.getHeaders()["x-api-key"]).toBeUndefined();
  });

  it("includes anthropic-beta header with OAuth and tool-streaming flags", () => {
    const provider = new SetupTokenAuthProvider(token);
    const headers = provider.getHeaders();
    expect(headers["anthropic-beta"]).toBe("claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14,interleaved-thinking-2025-05-14");
  });

  it("includes user-agent and x-app headers", () => {
    const provider = new SetupTokenAuthProvider(token);
    const headers = provider.getHeaders();
    expect(headers["user-agent"]).toBe("claude-cli/2.1.75");
    expect(headers["x-app"]).toBe("cli");
  });

  it("isExpired() always returns false", () => {
    const provider = new SetupTokenAuthProvider(token);
    expect(provider.isExpired()).toBe(false);
  });

  it("requiresSystemIdentityPrefix() returns true", () => {
    const provider = new SetupTokenAuthProvider(token);
    expect(provider.requiresSystemIdentityPrefix()).toBe(true);
  });
});

// ── NoopAuthProvider ──────────────────────────────────────────────────────────

describe("NoopAuthProvider", () => {
  it("returns empty headers", () => {
    const provider = new NoopAuthProvider();
    const headers = provider.getHeaders();
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it("isExpired() always returns false", () => {
    const provider = new NoopAuthProvider();
    expect(provider.isExpired()).toBe(false);
  });

  it("requiresSystemIdentityPrefix() returns false", () => {
    const provider = new NoopAuthProvider();
    expect(provider.requiresSystemIdentityPrefix()).toBe(false);
  });
});

// ── createAuthProvider factory ────────────────────────────────────────────────

describe("createAuthProvider()", () => {

  it("returns ApiKeyAuthProvider for provider='openai' with an apiKey", () => {
    const auth = createAuthProvider("openai", { apiKey: "sk-test" });
    expect(auth).toBeInstanceOf(ApiKeyAuthProvider);
    expect(auth.getHeaders()["Authorization"]).toBe("Bearer sk-test");
  });

  it("returns ApiKeyAuthProvider for provider='anthropic' with an apiKey", () => {
    const auth = createAuthProvider("anthropic", { apiKey: "sk-ant-test" });
    expect(auth).toBeInstanceOf(ApiKeyAuthProvider);
    expect(auth.getHeaders()["x-api-key"]).toBe("sk-ant-test");
  });

  it("returns NoopAuthProvider for provider='local' with no apiKey", () => {
    const auth = createAuthProvider("local", {});
    expect(auth).toBeInstanceOf(NoopAuthProvider);
  });

});
