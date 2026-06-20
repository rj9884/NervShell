import { exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
}

const WORKSPACE_ROOT = process.cwd();

function safeResolvePath(relativePath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, relativePath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Access denied: path '${relativePath}' resolves outside of the workspace.`);
  }
  return resolved;
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

export function readFile(filePath: string): ToolResult {
  try {
    const target = safeResolvePath(filePath);
    if (!fs.existsSync(target)) {
      return { tool: "readFile", success: false, output: `File not found: ${filePath}` };
    }
    const stat = fs.statSync(target);
    if (!stat.isFile()) {
      return { tool: "readFile", success: false, output: `Path is not a file: ${filePath}` };
    }
    const content = fs.readFileSync(target, "utf8");
    return { tool: "readFile", success: true, output: content };
  } catch (err: any) {
    return { tool: "readFile", success: false, output: err.message };
  }
}

export function writeFile(filePath: string, content: string): ToolResult {
  try {
    const target = safeResolvePath(filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return { tool: "writeFile", success: true, output: `Successfully wrote content to ${filePath}` };
  } catch (err: any) {
    return { tool: "writeFile", success: false, output: err.message };
  }
}

export function listFiles(dirPath = "."): ToolResult {
  try {
    const target = safeResolvePath(dirPath);
    if (!fs.existsSync(target)) {
      return { tool: "listFiles", success: false, output: `Directory not found: ${dirPath}` };
    }
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      return { tool: "listFiles", success: false, output: `Path is not a directory: ${dirPath}` };
    }
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const items = entries.map((entry) => {
      const entryPath = path.join(target, entry.name);
      let size = 0;
      if (entry.isFile()) {
        try {
          size = fs.statSync(entryPath).size;
        } catch (_) {}
      }
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        sizeBytes: size,
      };
    });
    return { tool: "listFiles", success: true, output: JSON.stringify(items, null, 2) };
  } catch (err: any) {
    return { tool: "listFiles", success: false, output: err.message };
  }
}

export function getSystemInfo(): ToolResult {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Unknown";
    const loadAvg = os.loadavg();
    const info = {
      platform: os.platform(),
      release: os.release(),
      uptimeSeconds: os.uptime(),
      nodeVersion: process.version,
      cpu: {
        model: cpuModel,
        cores: cpus.length,
        loadAvg1Min: loadAvg[0],
        loadAvg5Min: loadAvg[1],
        loadAvg15Min: loadAvg[2],
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        usagePercentage: Math.round((usedMem / totalMem) * 100),
      },
    };
    return { tool: "getSystemInfo", success: true, output: JSON.stringify(info, null, 2) };
  } catch (err: any) {
    return { tool: "getSystemInfo", success: false, output: err.message };
  }
}

export async function webSearch(query: string): Promise<ToolResult> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }
    const html = await response.text();
    const resultBlocks = html.split('<div class="result results_links results_links_deep web-result');
    const results: Array<{ title: string; link: string; snippet: string }> = [];

    for (let i = 1; i < resultBlocks.length && results.length < 5; i++) {
      const block = resultBlocks[i];
      const titleRegex = /<a class="result__a"[^>]* href="([^"]+)"[^>]*>([\s\S]+?)<\/a>/;
      const snippetRegex = /<a class="result__snippet"[^>]* href="[^"]+"[^>]*>([\s\S]+?)<\/a>/;

      const titleM = block.match(titleRegex);
      const snippetM = block.match(snippetRegex);

      if (titleM) {
        const rawLink = titleM[1];
        const rawTitle = titleM[2].replace(/<[^>]+>/g, "").trim();
        let snippet = "";
        if (snippetM) {
          snippet = snippetM[1].replace(/<[^>]+>/g, "").trim();
        } else {
          const match2 = block.match(/<a class="result__snippet"[^>]*>([\s\S]+?)<\/a>/);
          if (match2) snippet = match2[1].replace(/<[^>]+>/g, "").trim();
        }

        let cleanLink = rawLink;
        if (rawLink.startsWith("//")) {
          cleanLink = "https:" + rawLink;
        } else if (rawLink.includes("uddg=")) {
          const encoded = rawLink.split("uddg=")[1]?.split("&")[0];
          if (encoded) {
            cleanLink = decodeURIComponent(encoded);
          }
        }

        results.push({
          title: rawTitle,
          link: cleanLink,
          snippet: snippet || "No description available.",
        });
      }
    }

    if (results.length === 0) {
      return {
        tool: "webSearch",
        success: true,
        output: "No results found on DuckDuckGo.",
      };
    }

    return {
      tool: "webSearch",
      success: true,
      output: JSON.stringify(results, null, 2),
    };
  } catch (err: any) {
    return {
      tool: "webSearch",
      success: false,
      output: `Failed to search: ${err.message}`,
    };
  }
}

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "executeCommand",
      description: "Execute a shell command on the host machine. Use this to run any CLI command such as ls, cat, mkdir, curl, docker, etc. Note: Safe mode is enabled by default, prompting the user for approval.",
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
  {
    type: "function" as const,
    function: {
      name: "readFile",
      description: "Read the content of a file within the workspace repository. Use this to inspect file contents.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Relative path of the file to read, e.g. src/index.ts",
          },
        },
        required: ["filePath"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "writeFile",
      description: "Create or overwrite a file with specific content within the workspace repository.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Relative path of the file to write, e.g. notes/todo.txt",
          },
          content: {
            type: "string",
            description: "The string content to write to the file",
          },
        },
        required: ["filePath", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listFiles",
      description: "List files and directories in a specific folder within the workspace repository.",
      parameters: {
        type: "object",
        properties: {
          dirPath: {
            type: "string",
            description: "Relative path of the directory to scan. Leave empty or use '.' to scan workspace root.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSystemInfo",
      description: "Retrieve real-time operating system telemetry, including platform type, CPU load, and RAM usage.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "webSearch",
      description: "Search the web using DuckDuckGo to obtain current, up-to-date information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query, e.g. 'Node.js 20 release notes'",
          },
        },
        required: ["query"],
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
    case "readFile":
      return readFile(args.filePath as string);
    case "writeFile":
      return writeFile(args.filePath as string, args.content as string);
    case "listFiles":
      return listFiles(args.dirPath as string | undefined);
    case "getSystemInfo":
      return getSystemInfo();
    case "webSearch":
      return webSearch(args.query as string);
    default:
      return { tool: name, success: false, output: `Unknown tool: ${name}` };
  }
}
