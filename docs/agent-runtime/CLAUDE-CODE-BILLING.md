# Claude Code Billing Hack

## Overview

The agent runtime can make Anthropic API calls **billed to your Claude Pro/Max subscription** instead of requiring a paid API key. This works by reusing the OAuth tokens that the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) uses internally. There are two methods:

| Method | Token source | Persistence | Setup effort |
|---|---|---|---|
| **Setup-token** (recommended) | `claude setup-token` CLI command | `~/.master-plan/credentials.json` | One paste |
| **OAuth credential file** | `~/.claude/.credentials.json` | Auto (Claude Code manages it) | Zero (if Claude Code is installed) |

Both methods send requests to `https://api.anthropic.com/v1/messages` using `Authorization: Bearer <token>` with specific beta headers that identify the caller as Claude Code. Billing routes through the subscription associated with the token.

---

## Method 1: Setup-Token (Recommended)

### Step 1 — Generate a setup-token

In a **separate terminal**, run:

```bash
claude setup-token
```

This prints an OAuth token starting with `sk-ant-oat01-...` (≈100+ characters). Copy the full token.

> **Prerequisite:** You must have the Claude Code CLI installed and be logged in (`claude login`).

### Step 2 — Start the agent runtime

```bash
npx tsx src/agent-runtime/main.ts --web
```

If no stored token is found, the runtime prints:

```
  No Anthropic setup-token found.

  To authenticate, run this in a separate terminal:

    claude setup-token

  Then paste the generated token below.

  Paste setup-token:
```

Paste the token and press Enter.

### Step 3 — Token is persisted

The token is saved to `~/.master-plan/credentials.json`:

```json
{
  "anthropic": {
    "setupToken": "sk-ant-oat01-..."
  }
}
```

On subsequent runs the runtime reads the stored token and skips the prompt entirely.

### How it works under the hood

1. `ensureSetupToken()` in [`src/agent-runtime/setup-token.ts`](../../src/agent-runtime/setup-token.ts) checks `FileTokenStore` → prompts if empty → validates → persists.
2. `buildLlmClient()` in [`src/agent-runtime/main.ts`](../../src/agent-runtime/main.ts) creates a `SetupTokenAuthProvider` with the token.
3. `SetupTokenAuthProvider` (in [`src/llm-substrate/auth-providers.ts`](../../src/llm-substrate/auth-providers.ts)) attaches these headers to every API call:

   ```
   Authorization: Bearer sk-ant-oat01-...
   anthropic-beta: claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14,interleaved-thinking-2025-05-14
   user-agent: claude-cli/2.1.75
   x-app: cli
   ```

4. The `AnthropicLlmClient` prepends the **Claude Code identity prefix** to the system prompt (required by the OAuth API):

   ```
   You are Claude Code, Anthropic's official CLI for Claude.
   ```

   This is injected as the first system block; the agent's actual system prompt follows as a second block.

---

## Method 2: OAuth Credential File (Automatic)

If you have Claude Code installed and logged in, the runtime can read the OAuth access token directly from Claude Code's credential file.

### Usage

```bash
npx tsx src/agent-runtime/main.ts --provider anthropic-oauth --web
```

The `anthropic-oauth` provider reads `~/.claude/.credentials.json`, which has this shape:

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oauth-...",
    "refreshToken": "rt-...",
    "expiresAt": "2026-03-20T18:00:00.000Z",
    "subscriptionType": "max",
    "rateLimitTier": "standard",
    "scopes": "default"
  }
}
```

`ClaudeOAuthProvider` uses the `accessToken` with the same Bearer + beta headers as the setup-token method. The token has an `expiresAt` — when it expires, re-run `claude login` to refresh.

---

## Token Validation

The setup-token flow validates input before storing:

| Check | Rule |
|---|---|
| Non-empty | Token string must not be blank |
| Prefix | Must start with `sk-ant-oat01-` |
| Length | Must be ≥ 80 characters |

Invalid input is rejected with an error message and the prompt repeats.

---

## Clearing / Rotating Tokens

**Setup-token:** Delete or edit `~/.master-plan/credentials.json`. The next run will prompt for a new token.

**OAuth:** Run `claude login` to refresh `~/.claude/.credentials.json`.

---

## Provider Summary

| `--provider` flag | Auth mechanism | Billing |
|---|---|---|
| *(default)* | Setup-token (`claude setup-token`) | Claude Pro/Max subscription |
| `anthropic-oauth` | OAuth credential file (`~/.claude/.credentials.json`) | Claude Pro/Max subscription |
| `anthropic` | API key (`LLM_API_KEY` env var) | Anthropic API usage-based billing |
| `openai` | API key (`LLM_API_KEY` env var) | OpenAI billing |
| `local` | None or API key | Free (local model e.g. Ollama) |

---

## Why This Works

Claude Code's OAuth endpoint accepts any client that presents a valid `sk-ant-oat01-*` Bearer token with the correct beta headers and the Claude Code identity system prompt prefix. The API treats it as a Claude Code session billed to the subscription owner. This project's `SetupTokenAuthProvider` and `ClaudeOAuthProvider` replicate exactly the headers that the official CLI sends.
