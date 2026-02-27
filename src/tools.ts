import { exec } from "child_process";

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
}

export function executeCommand(command: string): Promise<ToolResult> {
  return new Promise((resolve) => {
    exec(command, { timeout: 30_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          tool: "executeCommand",
          success: false,
          output: stderr || error.message,
        });
      } else {
        resolve({
          tool: "executeCommand",
          success: true,
          output: stdout || stderr || "(no output)",
        });
      }
    });
  });
}

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "executeCommand",
      description:
        "Execute a shell command on the host machine. Use this to run any CLI command such as ls, cat, mkdir, curl, docker, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
];

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "executeCommand":
      return executeCommand(args.command as string);
    default:
      return { tool: name, success: false, output: `Unknown tool: ${name}` };
  }
}
