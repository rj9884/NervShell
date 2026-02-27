import OpenAI from "openai";
import { z } from "zod";
import { toolDefinitions, runTool, type ToolResult } from "./tools.js";

const SYSTEM_PROMPT = `You are a machine control agent with full system access. You can execute shell commands on the host machine to help the user accomplish tasks.

Available tools:
- executeCommand: Run any shell command on the host (e.g., ls, cat, mkdir, curl, docker, git, etc.)

Guidelines:
- Always explain what you are about to do before executing a command.
- If a command fails, analyze the error and attempt to self-correct.
- Be cautious with destructive operations (rm, format, etc.) and confirm intent when appropriate.
- Provide clear summaries of command output.
- You can chain multiple commands to accomplish complex tasks.`;

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

type AgentResponse = z.infer<typeof AgentResponseSchema>;

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
  private history: ConversationMessage[];

  constructor(apiKey: string, model = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  async handleMessage(userMessage: string): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    const responses: string[] = [];
    let maxIterations = 10;

    while (maxIterations-- > 0) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: this.history as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: toolDefinitions,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Add assistant message to history
      this.history.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      // If the model wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fnToolCall = toolCall as FunctionToolCall;
          const fnName = fnToolCall.function.name;
          const fnArgs = JSON.parse(fnToolCall.function.arguments);

          // Validate with Zod schema
          const parsed = AgentResponseSchema.safeParse({
            type: "tool_call",
            toolCall: { name: fnName, arguments: fnArgs },
          });

          if (!parsed.success) {
            const errorMsg = `Schema validation failed: ${parsed.error.message}`;
            this.history.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: errorMsg,
            });
            responses.push(`[Validation Error] ${errorMsg}`);
            continue;
          }

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
          this.history.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolContent,
          });

          responses.push(
            `[Tool: ${fnName}] ${result.success ? "OK" : "FAILED"}\n${result.output}`
          );
        }

        // Continue loop so the model can process tool results
        continue;
      }

      // No tool calls -- the model produced a text response
      if (message.content) {
        // Validate text response against schema
        AgentResponseSchema.safeParse({ type: "text", text: message.content });
        responses.push(message.content);
      }

      break;
    }

    return responses.join("\n\n");
  }

  getHistory(): ConversationMessage[] {
    return this.history;
  }

  clearHistory(): void {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
  }
}
