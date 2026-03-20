/**
 * AnthropicLlmClient — ILlmClient for the Anthropic Messages API.
 *
 * Handles both API-key auth (x-api-key) and OAuth (Bearer + beta headers)
 * via injected IAuthProvider. OAuth tokens require the Claude Code identity
 * prefix in the system prompt (block-structured format).
 *
 * Domain: 0.3.1.5.1 LLM-Backed Consciousness Substrate Adapter
 */

import type { IAuthProvider } from "./auth-providers.js";
import { CLAUDE_CODE_IDENTITY } from "./auth-providers.js";
import type {
  ILlmClient,
  LlmInferenceResult,
  LlmProbeResult,
  LlmToolInferenceResult,
  LlmContentBlock,
  ToolDefinition,
  ToolAwareMessage,
} from "./llm-substrate-adapter.js";

/** Anthropic content block for structured system prompts. */
interface SystemBlock {
  type: "text";
  text: string;
}

export class AnthropicLlmClient implements ILlmClient {
  constructor(
    private readonly modelId: string,
    private readonly authProvider: IAuthProvider,
    private readonly endpoint: string
  ) {}

  async probe(): Promise<LlmProbeResult> {
    const start = Date.now();
    try {
      await this.infer("You are a health probe. Reply with one word.", [
        { role: "user", content: "ping" },
      ], 4);
      return { latencyMs: Date.now() - start, reachable: true };
    } catch (err) {
      return {
        latencyMs: Date.now() - start,
        reachable: false,
        error: String(err),
      };
    }
  }

  async infer(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    maxTokens: number
  ): Promise<LlmInferenceResult> {
    const start = Date.now();

    // OAuth tokens require the Claude Code identity prefix in block-structured format
    let system: string | SystemBlock[];
    if (this.authProvider.requiresSystemIdentityPrefix()) {
      system = [
        { type: "text", text: CLAUDE_CODE_IDENTITY },
        { type: "text", text: systemPrompt },
      ];
    } else {
      system = systemPrompt;
    }

    const body = {
      model: this.modelId,
      max_tokens: maxTokens,
      system,
      messages,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      ...this.authProvider.getHeaders(),
    };

    const response = await fetch(`${this.endpoint}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(could not read body)");
      throw new Error(
        `Anthropic API error ${response.status}: ${response.statusText}\n${errorBody}`
      );
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const content = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    // Anthropic Messages API does not expose per-token logprobs in the standard response.
    // tokenLogprobs is left empty; proxy-Phi will be 0 (honest about missing data).
    const usage = data.usage ?? { input_tokens: 0, output_tokens: 0 };

    return {
      content,
      tokenLogprobs: [],
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      latencyMs: Date.now() - start,
    };
  }

  async inferWithTools(
    systemPrompt: string,
    messages: ToolAwareMessage[],
    tools: ToolDefinition[],
    maxTokens: number,
  ): Promise<LlmToolInferenceResult> {
    const start = Date.now();

    let system: string | SystemBlock[];
    if (this.authProvider.requiresSystemIdentityPrefix()) {
      system = [
        { type: "text", text: CLAUDE_CODE_IDENTITY },
        { type: "text", text: systemPrompt },
      ];
    } else {
      system = systemPrompt;
    }

    const body = {
      model: this.modelId,
      max_tokens: maxTokens,
      system,
      messages,
      tools,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      ...this.authProvider.getHeaders(),
    };

    const response = await fetch(`${this.endpoint}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(could not read body)");
      throw new Error(
        `Anthropic API error ${response.status}: ${response.statusText}\n${errorBody}`
      );
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const contentBlocks: LlmContentBlock[] = data.content.map((block) => {
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use' as const,
          id: block.id!,
          name: block.name!,
          input: block.input ?? {},
        };
      }
      return { type: 'text' as const, text: block.text ?? '' };
    });

    const usage = data.usage ?? { input_tokens: 0, output_tokens: 0 };

    return {
      content: contentBlocks,
      stopReason: data.stop_reason ?? 'end_turn',
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      latencyMs: Date.now() - start,
    };
  }
}
