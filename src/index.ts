import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "path";
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
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string field is required in the request body." });
    return;
  }

  try {
    const response = await agent.handleMessage(message);
    res.json({ response });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Agent error:", errorMessage);
    res.status(500).json({ error: "Agent encountered an error.", details: errorMessage });
  }
});

app.get("/history", (_req: Request, res: Response) => {
  res.json({ history: agent.getHistory() });
});

app.post("/clear", (_req: Request, res: Response) => {
  agent.clearHistory();
  res.json({ message: "Conversation history cleared." });
});

app.listen(PORT, () => {
  console.log(`AI Agent server running on http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Endpoints:`);
  console.log(`  POST /message  - Send a message to the agent`);
  console.log(`  GET  /history  - View conversation history`);
  console.log(`  POST /clear    - Clear conversation history`);
  console.log(`  GET  /health   - Health check`);
});
