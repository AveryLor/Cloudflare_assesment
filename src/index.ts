// src/index.ts
export interface Env {
  AI: any;
  TASK_ASSISTANT: DurableObjectNamespace;
}

export { TaskAssistantDO } from "./durable-objects/TaskAssistantDO";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve HTML interface
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    // API endpoint for chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const { message, sessionId } = (await request.json()) as {
          message: string;
          sessionId: string;
        };

        // Get or create Durable Object instance for this session
        const id = env.TASK_ASSISTANT.idFromName(sessionId);
        const stub = env.TASK_ASSISTANT.get(id);

        // Forward request to Durable Object
        const doResponse = await stub.fetch(request.url, {
          method: "POST",
          body: JSON.stringify({ message }),
          headers: { "Content-Type": "application/json" },
        });

        const data = await doResponse.json();

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to process request" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Task Assistant</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 800px;
      height: 600px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .message {
      display: flex;
      gap: 10px;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message.user { justify-content: flex-end; }
    .message-content {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 18px;
      word-wrap: break-word;
    }
    .message.user .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .message.assistant .message-content {
      background: #f1f3f4;
      color: #333;
    }
    .input-container {
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 10px;
    }
    .input-container input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 25px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s;
    }
    .input-container input:focus {
      border-color: #667eea;
    }
    .input-container button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .input-container button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    .input-container button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }
    .typing span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI Task Assistant</h1>
      <p>Powered by Cloudflare Workers AI (Llama 3.3) with Durable Objects</p>
    </div>
    <div class="chat-container" id="chatContainer">
      <div class="message assistant">
        <div class="message-content">
          Hello! I'm your AI Task Assistant. I can help you manage tasks, remember information, and answer questions. Try asking me to "add a task" or "what tasks do I have?"
        </div>
      </div>
    </div>
    <div class="input-container">
      <input type="text" id="messageInput" placeholder="Type your message..." />
      <button id="sendButton">Send</button>
    </div>
  </div>

  <script>
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);

    function addMessage(text, isUser) {
      const messageDiv = document.createElement('div');
      messageDiv.className = \`message \${isUser ? 'user' : 'assistant'}\`;
      messageDiv.innerHTML = \`<div class="message-content">\${text}</div>\`;
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showTyping() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'message assistant';
      typingDiv.id = 'typing';
      typingDiv.innerHTML = '<div class="message-content typing"><span></span><span></span><span></span></div>';
      chatContainer.appendChild(typingDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function hideTyping() {
      const typingDiv = document.getElementById('typing');
      if (typingDiv) typingDiv.remove();
    }

    async function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;

      addMessage(message, true);
      messageInput.value = '';
      sendButton.disabled = true;
      showTyping();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sessionId }),
        });

        const data = await response.json();
        hideTyping();
        addMessage(data.response, false);
      } catch (error) {
        hideTyping();
        addMessage('Sorry, something went wrong. Please try again.', false);
      } finally {
        sendButton.disabled = false;
        messageInput.focus();
      }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    messageInput.focus();
  </script>
</body>
</html>`;
