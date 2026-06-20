import OpenAI from "openai";
import { z } from "zod";
import { toolDefinitions, runTool, type ToolResult } from "./tools.js";
import { SessionManager } from "./session.js";

const SYSTEM_PROMPT = `You are NervShell, a professional workspace personal assistant.
Your goal is to execute tasks with surgical precision, maintain files, fetch system telemetry, and summarize actions.

Guidelines:
1. NO internal monologue or narration. Do not say "I will now check...", "Let me look at...", or "I am analyzing...".
2. You have access to clean file management and system info tools. Prefer using specific tools over executing raw shell commands (e.g. listFiles instead of ls, readFile instead of cat) as they are safer and faster.
3. Your final response should be a clean, objective summary of results.
4. Use markdown tables, lists, or clean blocks for structured output.
5. Maintain a professional, helpful developer persona.`;

const AgentResponseSchema = z.object({
  type: z.union([z.literal("text"), z.literal("tool_call")]),
  text: z.string().optional(),
  toolCall: z
    .object({
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
    })
    .optional(),
});

type FunctionToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;

export interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

export class Agent {
  private client: OpenAI;
  private model: string;
  private sessionManager: SessionManager;

  constructor(apiKey: string, model = "google/gemini-2.0-flash-exp:free") {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
    this.model = model;
    this.sessionManager = new SessionManager();
  }

  public setModel(model: string): void {
    this.model = model;
  }

  public getModel(): string {
    return this.model;
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  async handleMessage(userMessage: string, sessionId: string): Promise<string> {
    let session = this.sessionManager.getSession(sessionId);
    if (!session) {
      session = this.sessionManager.createSession(sessionId);
    }

    // Initialize history with system prompt if empty
    if (session.history.length === 0) {
      session.history.push({ role: "system", content: SYSTEM_PROMPT });
    }

    session.history.push({ role: "user", content: userMessage });
    this.sessionManager.updateSessionHistory(sessionId, session.history);

    const responses: string[] = [];
    let maxIterations = 10;

    while (maxIterations-- > 0) {
      const currentHistory = this.sessionManager.getSessionHistory(sessionId);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: currentHistory as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: toolDefinitions,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const message = choice.message;

      const updatedHistory = [...currentHistory];
      updatedHistory.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });
      this.sessionManager.updateSessionHistory(sessionId, updatedHistory);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fnToolCall = toolCall as FunctionToolCall;
          const fnName = fnToolCall.function.name;
          const fnArgs = JSON.parse(fnToolCall.function.arguments);

          let result: ToolResult;
          try {
            result = await runTool(fnName, fnArgs);
          } catch (err) {
            result = {
              tool: fnName,
              success: false,
              output: `Execution error: ${err instanceof Error ? err.message : String(err)}`,
            };
          }

          const toolContent = JSON.stringify(result);
          
          // Fetch latest history to prevent race conditions
          const latestHistory = this.sessionManager.getSessionHistory(sessionId);
          latestHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolContent,
          });
          this.sessionManager.updateSessionHistory(sessionId, latestHistory);

          responses.push(
            `[Tool: ${fnName}] ${result.success ? "OK" : "FAILED"}\n${result.output}`
          );
        }
        continue;
      }

      if (message.content) {
        responses.push(message.content);
      }
      break; // Exit the loop if no tool calls were generated
    }

    return responses.filter((r) => r.trim()).join("\n\n");
  }

  getHistory(sessionId: string): ConversationMessage[] {
    const session = this.sessionManager.getSession(sessionId);
    return session ? session.history : [];
  }

  clearHistory(sessionId: string): void {
    this.sessionManager.clearSession(sessionId, SYSTEM_PROMPT);
  }
}
