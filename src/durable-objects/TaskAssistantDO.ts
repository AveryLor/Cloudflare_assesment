// src/durable-objects/TaskAssistantDO.ts
import { DurableObject } from "cloudflare:workers";

interface Env {
  AI: any;
}

interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface State {
  conversationHistory: ConversationMessage[];
  tasks: Task[];
  userContext: Record<string, any>;
}

export class TaskAssistantDO extends DurableObject {
  private state: State = {
    conversationHistory: [],
    tasks: [],
    userContext: {},
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    await this.loadState();

    const { message } = (await request.json()) as { message: string };

    // Add user message to history
    this.state.conversationHistory.push({
      role: "user",
      content: message,
    });

    // Process the message and generate response
    const response = await this.processMessage(message);

    // Add assistant response to history
    this.state.conversationHistory.push({
      role: "assistant",
      content: response,
    });

    // Keep only last 10 messages to manage memory
    if (this.state.conversationHistory.length > 10) {
      this.state.conversationHistory =
        this.state.conversationHistory.slice(-10);
    }

    await this.saveState();

    return new Response(JSON.stringify({ response }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async loadState(): Promise<void> {
    const stored = await this.ctx.storage.get<State>("state");
    if (stored) {
      this.state = stored;
    }
  }

  private async saveState(): Promise<void> {
    await this.ctx.storage.put("state", this.state);
  }

  private async processMessage(message: string): Promise<string> {
    // Check for task management commands
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("add task") ||
      lowerMessage.includes("create task")
    ) {
      return this.handleAddTask(message);
    }

    if (
      lowerMessage.includes("list task") ||
      lowerMessage.includes("show task") ||
      lowerMessage.includes("what tasks")
    ) {
      return this.handleListTasks();
    }

    if (
      lowerMessage.includes("complete task") ||
      lowerMessage.includes("finish task")
    ) {
      return this.handleCompleteTask(message);
    }

    if (
      lowerMessage.includes("delete task") ||
      lowerMessage.includes("remove task")
    ) {
      return this.handleDeleteTask(message);
    }

    // Use LLM for general conversation
    return await this.generateLLMResponse(message);
  }

  private handleAddTask(message: string): string {
    // Extract task title from message
    const patterns = [
      /add task[:\s]+(.+)/i,
      /create task[:\s]+(.+)/i,
      /add[:\s]+(.+)/i,
    ];

    let taskTitle = "";
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        taskTitle = match[1].trim();
        break;
      }
    }

    if (!taskTitle) {
      return "I'd be happy to add a task! Please tell me what the task is. For example: 'Add task: Buy groceries'";
    }

    const task: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      completed: false,
      createdAt: Date.now(),
    };

    this.state.tasks.push(task);
    return `✅ Task added: "${taskTitle}"`;
  }

  private handleListTasks(): string {
    if (this.state.tasks.length === 0) {
      return "You don't have any tasks yet. Try adding one by saying 'Add task: Your task description'";
    }

    const activeTasks = this.state.tasks.filter((t) => !t.completed);
    const completedTasks = this.state.tasks.filter((t) => t.completed);

    let response = "📋 Your Tasks:\n\n";

    if (activeTasks.length > 0) {
      response += "Active:\n";
      activeTasks.forEach((task, i) => {
        response += `${i + 1}. ${task.title}\n`;
      });
    }

    if (completedTasks.length > 0) {
      response += "\n✓ Completed:\n";
      completedTasks.forEach((task, i) => {
        response += `${i + 1}. ${task.title}\n`;
      });
    }

    return response;
  }

  private handleCompleteTask(message: string): string {
    const numberMatch = message.match(/\d+/);
    if (!numberMatch) {
      return "Please specify which task to complete by number. For example: 'Complete task 1'";
    }

    const taskNumber = parseInt(numberMatch[0], 10) - 1;
    const activeTasks = this.state.tasks.filter((t) => !t.completed);

    if (taskNumber < 0 || taskNumber >= activeTasks.length) {
      return `Task ${taskNumber + 1} not found. You have ${
        activeTasks.length
      } active tasks.`;
    }

    activeTasks[taskNumber].completed = true;
    return `✓ Completed: "${activeTasks[taskNumber].title}"`;
  }

  private handleDeleteTask(message: string): string {
    const numberMatch = message.match(/\d+/);
    if (!numberMatch) {
      return "Please specify which task to delete by number. For example: 'Delete task 1'";
    }

    const taskNumber = parseInt(numberMatch[0], 10) - 1;
    const activeTasks = this.state.tasks.filter((t) => !t.completed);

    if (taskNumber < 0 || taskNumber >= activeTasks.length) {
      return `Task ${taskNumber + 1} not found. You have ${
        activeTasks.length
      } active tasks.`;
    }

    const taskToDelete = activeTasks[taskNumber];
    this.state.tasks = this.state.tasks.filter((t) => t.id !== taskToDelete.id);
    return `🗑️ Deleted: "${taskToDelete.title}"`;
  }

  private async generateLLMResponse(message: string): Promise<string> {
    try {
      // Build context from conversation history and state
      const systemPrompt = this.buildSystemPrompt();
      const conversationContext = this.buildConversationContext();

      const messages: ConversationMessage[] = [
        { role: "system", content: systemPrompt },
        ...conversationContext,
        { role: "user", content: message },
      ];

      const response = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          messages,
          max_tokens: 512,
          temperature: 0.7,
        }
      );

      return response.response || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error("LLM Error:", error);
      return "I'm having trouble processing that right now. Please try again.";
    }
  }

  private buildSystemPrompt(): string {
    const taskCount = this.state.tasks.filter((t) => !t.completed).length;
    const completedCount = this.state.tasks.filter((t) => t.completed).length;

    return `You are a helpful AI task assistant. You help users manage their tasks and remember information.

Current state:
- Active tasks: ${taskCount}
- Completed tasks: ${completedCount}

Capabilities:
- Add tasks: "add task: description"
- List tasks: "show tasks" or "what tasks do I have"
- Complete tasks: "complete task 1"
- Delete tasks: "delete task 1"
- General conversation and questions

Keep responses concise, friendly, and helpful. Remember context from previous messages.`;
  }

  private buildConversationContext(): ConversationMessage[] {
    // Include last 4 messages for context (excluding the current one)
    return this.state.conversationHistory.slice(-4);
  }
}
//