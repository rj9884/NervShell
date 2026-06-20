import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { Agent } from "./agent.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-exp:free";

if (!OPENROUTER_API_KEY) {
  console.error("Error: OPENROUTER_API_KEY environment variable is required.");
  console.error("Get a free API key at https://openrouter.ai/keys");
  console.error("Create a .env file with OPENROUTER_API_KEY=sk-or-...");
  process.exit(1);
}

const agent = new Agent(OPENROUTER_API_KEY, MODEL);
const app = express();

app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.post("/message", async (req: Request, res: Response) => {
  const { message, sessionId, safeMode } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string field is required in the request body." });
    return;
  }

  const activeSessionId = sessionId || "default_session";
  const safeModeEnabled = safeMode !== false; // default to true

  try {
    const response = await agent.handleMessage(message, activeSessionId, safeModeEnabled);
    res.json({ response });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Agent error:", errorMessage);
    res.status(500).json({ error: "Agent encountered an error.", details: errorMessage });
  }
});

app.post("/api/approve", async (req: Request, res: Response) => {
  const { sessionId, toolCallId, approved, command, safeMode } = req.body;

  if (!sessionId || !toolCallId || !command) {
    res.status(400).json({ error: "Missing required parameters: sessionId, toolCallId, or command." });
    return;
  }

  const safeModeEnabled = safeMode !== false; // default to true

  try {
    const response = await agent.handleToolApproval(
      sessionId,
      toolCallId,
      approved,
      command,
      safeModeEnabled
    );
    res.json({ response });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Approval process error:", errorMessage);
    res.status(500).json({ error: "Agent approval process failed.", details: errorMessage });
  }
});

app.get("/history", (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || "default_session";
  res.json({ history: agent.getHistory(sessionId) });
});

app.post("/clear", (req: Request, res: Response) => {
  const sessionId = (req.body.sessionId as string) || "default_session";
  agent.clearHistory(sessionId);
  res.json({ message: "Conversation history cleared." });
});

app.get("/api/sessions", (_req: Request, res: Response) => {
  res.json({ sessions: agent.getSessionManager().listSessions() });
});

app.post("/api/sessions", (req: Request, res: Response) => {
  const { id, title } = req.body;
  const newSession = agent.getSessionManager().createSession(id, title);
  res.json(newSession);
});

app.delete("/api/sessions/:id", (req: Request, res: Response) => {
  const success = agent.getSessionManager().deleteSession(req.params.id as string);
  res.json({ success });
});

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

function buildFileTree(dirPath: string, relativeRoot = "", depth = 0): FileNode[] {
  if (depth > 3) return [];
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const file of files) {
      if (
        file.name === "node_modules" ||
        file.name === ".git" ||
        file.name === "dist" ||
        file.name.startsWith(".")
      ) {
        continue;
      }
      const fullPath = path.join(dirPath, file.name);
      const relPath = path.join(relativeRoot, file.name);
      const isDir = file.isDirectory();

      const node: FileNode = {
        name: file.name,
        path: relPath,
        isDirectory: isDir,
      };

      if (isDir) {
        node.children = buildFileTree(fullPath, relPath, depth + 1);
      } else {
        try {
          node.size = fs.statSync(fullPath).size;
        } catch (_) {}
      }

      nodes.push(node);
    }
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error("Failed to read dir:", dirPath, err);
    return [];
  }
}

app.get("/api/workspace", (_req: Request, res: Response) => {
  const workspaceRoot = process.cwd();
  const tree = buildFileTree(workspaceRoot);
  res.json({ workspaceRoot, tree });
});

app.get("/api/system", (_req: Request, res: Response) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    res.json({
      cpu: {
        cores: os.cpus().length,
        load1Min: loadAvg[0],
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: Math.round((usedMem / totalMem) * 100),
      },
      uptime: os.uptime(),
      platform: os.platform(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read system diagnostics", details: err.message });
  }
});

app.post("/api/settings", (req: Request, res: Response) => {
  const { model } = req.body;
  if (model && typeof model === "string") {
    agent.setModel(model);
    console.log(`Model updated to: ${model}`);
  }
  res.json({
    status: "success",
    settings: {
      model: agent.getModel(),
    },
  });
});

app.listen(PORT, () => {
  console.log(`AI Assistant server running on http://localhost:${PORT}`);
  console.log(`Model: ${agent.getModel()}`);
});
