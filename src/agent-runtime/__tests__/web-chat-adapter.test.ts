/**
 * WebChatAdapter — Unit Tests
 *
 * Verifies the HTTP + SSE-based web chat adapter:
 *   - Initial state: isConnected() === false, id matches config
 *   - connect() starts HTTP server, sets isConnected() to true
 *   - connect() is idempotent
 *   - disconnect() closes server, sets isConnected() to false
 *   - disconnect() is idempotent
 *   - poll() returns [] when disconnected
 *   - poll() returns [] when queue is empty
 *   - poll() returns RawInput items pushed via POST /api/message
 *   - poll() respects maxBatchSize
 *   - poll() ignores blank messages
 *   - send() queues output for SSE delivery
 *   - GET / serves the chat HTML page
 *   - GET /api/events returns SSE stream
 *   - POST /api/message enqueues input
 *   - POST /api/message rejects empty body
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebChatAdapter } from '../web-chat-adapter.js';
import type { AgentOutput } from '../types.js';
import * as http from 'node:http';

// Helper to make HTTP requests to the adapter's server
function request(
  port: number,
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, method, path, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body: data }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Helper to open an SSE stream and collect events
function openSse(port: number): { events: string[]; close: () => void; response: Promise<void> } {
  const events: string[] = [];
  let req: http.ClientRequest;
  const response = new Promise<void>((resolve) => {
    req = http.request(
      { hostname: 'localhost', port, method: 'GET', path: '/api/events' },
      (res) => {
        res.on('data', (chunk: Buffer) => { events.push(chunk.toString()); });
        res.on('end', resolve);
        // Swallow errors from intentional close
        res.on('error', () => resolve());
      },
    );
    // Swallow errors from intentional destroy
    req.on('error', () => resolve());
    req.end();
  });
  return { events, close: () => req!.destroy(), response };
}

describe('WebChatAdapter', () => {
  let adapter: WebChatAdapter;
  let port: number;

  beforeEach(() => {
    // Use port 0 to let OS assign a free port
    adapter = new WebChatAdapter({ port: 0, adapterId: 'web-test' });
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  // ── Basic state ──────────────────────────────────────────

  it('starts disconnected', () => {
    expect(adapter.isConnected()).toBe(false);
    expect(adapter.id).toBe('web-test');
  });

  it('uses default id when none provided', () => {
    const a = new WebChatAdapter({ port: 0 });
    expect(a.id).toBe('web-chat');
  });

  // ── connect / disconnect ─────────────────────────────────

  it('connect() starts server and sets isConnected', async () => {
    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);
    port = adapter.port;
    expect(port).toBeGreaterThan(0);
  });

  it('connect() is idempotent', async () => {
    await adapter.connect();
    const firstPort = adapter.port;
    await adapter.connect();
    expect(adapter.port).toBe(firstPort);
  });

  it('disconnect() sets isConnected to false', async () => {
    await adapter.connect();
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  it('disconnect() is idempotent', async () => {
    await adapter.connect();
    await adapter.disconnect();
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  // ── poll() ───────────────────────────────────────────────

  it('poll() returns [] when disconnected', async () => {
    expect(await adapter.poll()).toEqual([]);
  });

  it('poll() returns [] when queue is empty', async () => {
    await adapter.connect();
    expect(await adapter.poll()).toEqual([]);
  });

  it('poll() returns messages posted via HTTP', async () => {
    await adapter.connect();
    port = adapter.port;

    await request(port, 'POST', '/api/message', JSON.stringify({ text: 'hello' }));

    const inputs = await adapter.poll();
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.text).toBe('hello');
    expect(inputs[0]!.adapterId).toBe('web-test');
  });

  it('poll() respects maxBatchSize', async () => {
    const smallBatch = new WebChatAdapter({ port: 0, adapterId: 'batch-test', maxBatchSize: 2 });
    await smallBatch.connect();
    const p = smallBatch.port;

    await request(p, 'POST', '/api/message', JSON.stringify({ text: 'a' }));
    await request(p, 'POST', '/api/message', JSON.stringify({ text: 'b' }));
    await request(p, 'POST', '/api/message', JSON.stringify({ text: 'c' }));

    const batch1 = await smallBatch.poll();
    expect(batch1).toHaveLength(2);
    const batch2 = await smallBatch.poll();
    expect(batch2).toHaveLength(1);

    await smallBatch.disconnect();
  });

  it('poll() ignores blank messages', async () => {
    await adapter.connect();
    port = adapter.port;

    await request(port, 'POST', '/api/message', JSON.stringify({ text: '   ' }));
    await request(port, 'POST', '/api/message', JSON.stringify({ text: '' }));

    expect(await adapter.poll()).toEqual([]);
  });

  // ── HTTP routes ──────────────────────────────────────────

  it('GET / serves HTML', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'GET', '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<!DOCTYPE html>');
  });

  it('POST /api/message returns 200 on valid message', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'POST', '/api/message', JSON.stringify({ text: 'hi' }));
    expect(res.status).toBe(200);
  });

  it('POST /api/message returns 400 on missing text', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'POST', '/api/message', JSON.stringify({}));
    expect(res.status).toBe(400);
  });

  it('POST /api/message returns 400 on blank text', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'POST', '/api/message', JSON.stringify({ text: '  ' }));
    expect(res.status).toBe(400);
  });

  it('POST /api/message returns 400 on invalid JSON', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'POST', '/api/message', 'not json');
    expect(res.status).toBe(400);
  });

  it('unknown route returns 404', async () => {
    await adapter.connect();
    port = adapter.port;

    const res = await request(port, 'GET', '/nope');
    expect(res.status).toBe(404);
  });

  // ── send() + SSE ─────────────────────────────────────────

  it('send() delivers output via SSE stream', async () => {
    await adapter.connect();
    port = adapter.port;

    // Open SSE stream
    const sse = openSse(port);

    // Wait a moment for connection to establish
    await new Promise(r => setTimeout(r, 50));

    // Send agent output
    const output: AgentOutput = { text: 'Hello from agent' };
    await adapter.send(output);

    // Give SSE time to deliver
    await new Promise(r => setTimeout(r, 50));

    sse.close();

    const combined = sse.events.join('');
    expect(combined).toContain('data: ');
    expect(combined).toContain('Hello from agent');
  });

  it('send() is a no-op when disconnected', async () => {
    // Should not throw
    await adapter.send({ text: 'dropped' });
  });
});
