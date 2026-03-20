/**
 * Chat HTML page served by WebChatServer.
 *
 * Two-panel layout:
 *   - Main panel: inner monologue stream (drive activations, tool calls, reflections)
 *   - Bottom bar: chat input for user messages
 *
 * SSE events:
 *   { type: 'chat', text: '...' }         — agent chat responses
 *   { type: 'monologue', entry: { ... } } — inner monologue entries
 *
 * Communicates via:
 *   POST /api/message   — send user input
 *   GET  /api/events    — receive agent responses + monologue (SSE)
 */

export const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conscious Agent — Inner Monologue</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    background: #0a0a0f;
    color: #c8c8d0;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 10px 20px;
    background: #0e0e16;
    border-bottom: 1px solid #1e1e2e;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  header h1 { font-size: 14px; font-weight: 600; color: #8888cc; letter-spacing: 0.5px; }
  #status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #1a3a1a;
    color: #4ade80;
  }
  #status.disconnected { background: #3a1a1a; color: #f87171; }
  #counter {
    margin-left: auto;
    font-size: 11px;
    color: #505060;
  }

  /* ── Main monologue stream ─────────────────────── */
  #monologue {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    line-height: 1.6;
  }
  .entry {
    padding: 2px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .entry.drive_activation {
    color: #e0a040;
    border-left: 3px solid #e0a040;
    padding-left: 10px;
    margin-top: 16px;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .entry.system_prompt { color: #505060; font-size: 11px; }
  .entry.user_message {
    color: #7090d0;
    border-left: 3px solid #4060a0;
    padding-left: 10px;
  }
  .entry.assistant_text {
    color: #90d090;
    border-left: 3px solid #408040;
    padding-left: 10px;
  }
  .entry.tool_call {
    color: #b090d0;
    padding-left: 14px;
    font-size: 12px;
  }
  .entry.tool_result {
    padding-left: 14px;
    font-size: 12px;
  }
  .entry.tool_result.ok { color: #70a070; }
  .entry.tool_result.err { color: #d07070; }
  .entry.final_output {
    color: #d0d0e0;
    background: #14142a;
    padding: 8px 12px;
    border-radius: 6px;
    margin: 6px 0;
  }
  .entry.summary {
    color: #505060;
    font-size: 11px;
    border-top: 1px solid #1a1a2a;
    padding-top: 4px;
    margin-bottom: 12px;
  }
  .entry.error { color: #e06060; font-weight: 600; }
  .entry.chat_user {
    color: #8090c0;
    background: #1a1a30;
    padding: 6px 12px;
    border-radius: 6px;
    margin: 4px 0;
    align-self: flex-end;
    max-width: 80%;
  }
  .entry.chat_agent {
    color: #a0c0a0;
    background: #141a14;
    padding: 6px 12px;
    border-radius: 6px;
    margin: 4px 0;
    max-width: 80%;
  }
  .ts {
    color: #383848;
    font-size: 11px;
    margin-right: 6px;
    user-select: none;
  }
  .tool-name { color: #c0a0e0; font-weight: 600; }

  /* ── Input bar ─────────────────────────────────── */
  #input-bar {
    padding: 10px 20px;
    background: #0e0e16;
    border-top: 1px solid #1e1e2e;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  #input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #1e1e2e;
    border-radius: 6px;
    background: #0a0a0f;
    color: #c8c8d0;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    resize: none;
    min-height: 36px;
    max-height: 100px;
  }
  #input:focus { border-color: #3a3a6a; }
  #send-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #2a2a5a;
    color: #b0b0e0;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
  }
  #send-btn:hover { background: #3a3a7a; }
  #send-btn:disabled { opacity: 0.3; cursor: default; }
</style>
</head>
<body>

<header>
  <h1>INNER MONOLOGUE</h1>
  <span id="status">connecting...</span>
  <span id="counter">0 events</span>
</header>

<div id="monologue"></div>

<div id="input-bar">
  <textarea id="input" rows="1" placeholder="Send a message to the agent..." disabled></textarea>
  <button id="send-btn" disabled>Send</button>
</div>

<script>
(function() {
  const mono = document.getElementById('monologue');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const statusEl = document.getElementById('status');
  const counterEl = document.getElementById('counter');
  let eventCount = 0;

  function timeStr(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  }

  function addEntry(cls, content, timestamp, extra) {
    const div = document.createElement('div');
    div.className = 'entry ' + cls;

    const ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = timeStr(timestamp);
    div.appendChild(ts);

    if (extra) {
      div.appendChild(extra);
    } else {
      const text = document.createTextNode(content);
      div.appendChild(text);
    }

    mono.appendChild(div);
    mono.scrollTop = mono.scrollHeight;
    eventCount++;
    counterEl.textContent = eventCount + ' events';
  }

  function handleMonologue(entry) {
    switch (entry.type) {
      case 'drive_activation':
        addEntry('drive_activation', 'DRIVE: ' + entry.content, entry.timestamp);
        break;
      case 'system_prompt':
        // Skip system prompts to reduce noise — they're in the file log
        break;
      case 'user_message':
        addEntry('user_message', entry.content, entry.timestamp);
        break;
      case 'assistant_text':
        addEntry('assistant_text', entry.content, entry.timestamp);
        break;
      case 'tool_call': {
        const span = document.createElement('span');
        const nameEl = document.createElement('span');
        nameEl.className = 'tool-name';
        nameEl.textContent = (entry.metadata && entry.metadata.name) || 'tool';
        span.appendChild(document.createTextNode('\\u2699 '));
        span.appendChild(nameEl);
        const inputStr = entry.metadata && entry.metadata.input
          ? ' ' + JSON.stringify(entry.metadata.input)
          : '';
        if (inputStr.length > 200) {
          span.appendChild(document.createTextNode(inputStr.slice(0, 200) + '...'));
        } else {
          span.appendChild(document.createTextNode(inputStr));
        }
        addEntry('tool_call', '', entry.timestamp, span);
        break;
      }
      case 'tool_result': {
        const isErr = entry.metadata && entry.metadata.isError;
        const cls = 'tool_result ' + (isErr ? 'err' : 'ok');
        const prefix = isErr ? '\\u2717 ' : '\\u2713 ';
        const name = (entry.metadata && entry.metadata.name) || '';
        const preview = entry.content.length > 300 ? entry.content.slice(0, 300) + '...' : entry.content;
        addEntry(cls, prefix + name + ': ' + preview, entry.timestamp);
        break;
      }
      case 'final_output':
        addEntry('final_output', entry.content, entry.timestamp);
        break;
      case 'summary':
        addEntry('summary', entry.content, entry.timestamp);
        break;
      case 'error':
        addEntry('error', '\\u2717 ' + entry.content, entry.timestamp);
        break;
    }
  }

  // ── SSE connection ─────────────────────────────────────
  let es = null;
  function connectSSE() {
    es = new EventSource('/api/events');
    es.onopen = function() {
      statusEl.textContent = 'connected';
      statusEl.className = '';
      inputEl.disabled = false;
      sendBtn.disabled = false;
    };
    es.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'monologue' && data.entry) {
          handleMonologue(data.entry);
        } else if (data.type === 'chat' && data.text) {
          addEntry('chat_agent', data.text, new Date().toISOString());
        } else if (data.text) {
          // Legacy format fallback
          addEntry('chat_agent', data.text, new Date().toISOString());
        }
      } catch {}
    };
    es.onerror = function() {
      statusEl.textContent = 'disconnected';
      statusEl.className = 'disconnected';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      es.close();
      addEntry('error', 'Connection lost. Reconnecting...', new Date().toISOString());
      setTimeout(connectSSE, 2000);
    };
  }
  connectSSE();

  // ── Send message ───────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    addEntry('chat_user', text, new Date().toISOString());
    try {
      await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
    } catch (err) {
      addEntry('error', 'Failed to send message.', new Date().toISOString());
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
})();
</script>
</body>
</html>`;
