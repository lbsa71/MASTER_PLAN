/**
 * Chat HTML page served by WebChatAdapter.
 *
 * Single-file inline HTML/CSS/JS — no build step, no external dependencies.
 * Communicates with the agent via:
 *   POST /api/message   — send user input
 *   GET  /api/events    — receive agent responses (SSE)
 */

export const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conscious Agent — Chat</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 12px 20px;
    background: #12121a;
    border-bottom: 1px solid #2a2a3a;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  header h1 { font-size: 16px; font-weight: 600; color: #a0a0ff; }
  #status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #1a3a1a;
    color: #4ade80;
  }
  #status.disconnected { background: #3a1a1a; color: #f87171; }
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .msg {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 12px;
    line-height: 1.5;
    font-size: 14px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .msg.user {
    align-self: flex-end;
    background: #2a2a5a;
    color: #d0d0ff;
    border-bottom-right-radius: 4px;
  }
  .msg.agent {
    align-self: flex-start;
    background: #1a2a1a;
    color: #c0e0c0;
    border-bottom-left-radius: 4px;
  }
  .msg.system {
    align-self: center;
    background: transparent;
    color: #606070;
    font-size: 12px;
    font-style: italic;
  }
  #input-bar {
    padding: 12px 20px;
    background: #12121a;
    border-top: 1px solid #2a2a3a;
    display: flex;
    gap: 8px;
  }
  #input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #2a2a3a;
    border-radius: 8px;
    background: #0a0a0f;
    color: #e0e0e0;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    resize: none;
    min-height: 42px;
    max-height: 120px;
  }
  #input:focus { border-color: #4a4a8a; }
  #send-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: #3a3a7a;
    color: #e0e0ff;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
  }
  #send-btn:hover { background: #4a4a9a; }
  #send-btn:disabled { opacity: 0.4; cursor: default; }
</style>
</head>
<body>

<header>
  <h1>Conscious Agent</h1>
  <span id="status">connecting...</span>
</header>

<div id="messages">
  <div class="msg system">Connecting to agent...</div>
</div>

<div id="input-bar">
  <textarea id="input" rows="1" placeholder="Type a message..." disabled></textarea>
  <button id="send-btn" disabled>Send</button>
</div>

<script>
(function() {
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const statusEl = document.getElementById('status');

  function addMessage(text, cls) {
    const div = document.createElement('div');
    div.className = 'msg ' + cls;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
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
      addMessage('Connected to agent.', 'system');
    };
    es.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.text) addMessage(data.text, 'agent');
      } catch {}
    };
    es.onerror = function() {
      statusEl.textContent = 'disconnected';
      statusEl.className = 'disconnected';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      es.close();
      addMessage('Connection lost. Reconnecting...', 'system');
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
    addMessage(text, 'user');
    try {
      await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });
    } catch (err) {
      addMessage('Failed to send message.', 'system');
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
})();
</script>
</body>
</html>`;
