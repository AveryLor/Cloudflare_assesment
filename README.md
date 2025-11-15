# AI Task Assistant - Cloudflare Assessment

An AI-powered task management application built on Cloudflare's edge platform, showcasing Workers AI, Durable Objects, and serverless architecture.

## 🎯 Features

All required components for the assessment:

✅ **LLM Integration**: Llama 3.3 70B via Cloudflare Workers AI  
✅ **Workflow Coordination**: Cloudflare Workers handling requests and routing  
✅ **User Input**: Chat-based interface with real-time messaging  
✅ **Memory/State**: Durable Objects for persistent conversation history and task storage

## 🏗️ Architecture

```
User Browser
    ↓
Cloudflare Worker (Main Entry Point)
    ↓
Durable Object (Session-based State)
    ├── Conversation History
    ├── Task Management
    └── Workers AI (Llama 3.3)
```

### Components:

1. **Worker (index.ts)**: Main entry point that serves the UI and routes API requests
2. **Durable Object (TaskAssistantDO.ts)**: Manages per-session state, conversation history, and task data
3. **Workers AI**: Integrates Llama 3.3 70B for intelligent responses
4. **Built-in UI**: Responsive chat interface with gradient design

## 🚀 Setup & Deployment

### Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI installed globally: `npm install -g wrangler`

### Installation

1. **Create project directory:**

```bash
mkdir ai-task-assistant
cd ai-task-assistant
```

2. **Create the file structure:**

```
ai-task-assistant/
├── src/
│   ├── index.ts
│   └── durable-objects/
│       └── TaskAssistantDO.ts
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

3. **Copy the code files** from the artifacts into their respective locations

4. **Install dependencies:**

```bash
npm install
```

5. **Authenticate with Cloudflare:**

```bash
wrangler login
```

6. **Deploy to Cloudflare:**

```bash
wrangler deploy
```

### Local Development

Run locally with:

```bash
npm run dev
```

Then open `http://localhost:8787` in your browser.

## 💬 Usage

The assistant supports natural language commands:

### Task Management

- **Add tasks**: "Add task: Buy groceries" or "Create task: Finish report"
- **List tasks**: "Show my tasks" or "What tasks do I have?"
- **Complete tasks**: "Complete task 1" or "Mark task 2 as done"
- **Delete tasks**: "Delete task 1" or "Remove task 3"

### General Conversation

Ask questions, get help, or have natural conversations. The AI remembers context within your session.

## 🔧 Technical Details

### State Management

- Each user session gets a unique Durable Object instance
- Conversation history (last 10 messages) persists across refreshes
- Tasks are stored permanently until deleted
- Session ID generated client-side for simplicity

### LLM Integration

- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Temperature: 0.7 for balanced creativity
- Max tokens: 512 for concise responses
- Context window includes system prompt + conversation history

### Workflow Coordination

1. User sends message via chat UI
2. Worker routes request to appropriate Durable Object
3. Durable Object checks for task commands
4. If not a command, sends to Workers AI with context
5. Response stored in conversation history
6. State persisted in Durable Object storage

## 🎨 Customization

### Change LLM Model

Edit `TaskAssistantDO.ts`:

```typescript
const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  // ... config
});
```

### Adjust Conversation History Length

Modify the history limit in `TaskAssistantDO.ts`:

```typescript
if (this.state.conversationHistory.length > 20) {
  this.state.conversationHistory = this.state.conversationHistory.slice(-20);
}
```

### Customize UI Theme

Edit the `<style>` section in `index.ts` to change colors, gradients, or layout.

## 📊 Assessment Criteria Coverage

| Requirement  | Implementation                             |
| ------------ | ------------------------------------------ |
| LLM          | ✅ Llama 3.3 70B via Workers AI            |
| Workflow     | ✅ Workers + Durable Objects coordination  |
| User Input   | ✅ Chat interface with real-time messaging |
| Memory/State | ✅ Durable Objects with persistent storage |

## 🔒 Security Notes

- CORS enabled for development (restrict in production)
- No authentication (add auth for production use)
- Rate limiting recommended for production
- Session IDs are client-generated (use server-side tokens in production)

## 📝 License

MIT License - Feel free to use for your assessment and beyond!

---

Built with ❤️ using Cloudflare's edge platform
//
