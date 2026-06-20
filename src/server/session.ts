import fs from "fs";
import path from "path";
import os from "os";
import { type ConversationMessage } from "./agent.js";

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  history: ConversationMessage[];
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private filePath: string;

  constructor(storageDir?: string) {
    const defaultDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
    this.filePath = path.join(storageDir || defaultDir, ".sessions.json");
    this.loadFromDisk();
  }

  public createSession(id?: string, title?: string): Session {
    const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sessionTitle = title || "New Session";
    const now = new Date().toISOString();

    const newSession: Session = {
      id: sessionId,
      title: sessionTitle,
      createdAt: now,
      updatedAt: now,
      history: [],
    };

    this.sessions.set(sessionId, newSession);
    this.saveToDisk();
    return newSession;
  }

  public getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  public deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }

  public listSessions(): SessionSummary[] {
    return Array.from(this.sessions.values())
      .map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getSessionHistory(id: string): ConversationMessage[] {
    const session = this.sessions.get(id);
    return session ? session.history : [];
  }

  public updateSessionHistory(id: string, history: ConversationMessage[]): void {
    const session = this.sessions.get(id);
    if (session) {
      session.history = history;
      session.updatedAt = new Date().toISOString();

      // If the title is "New Session" and we have a user message, update the title
      if (session.title === "New Session" || session.title === "New Chat") {
        const userMsg = history.find(m => m.role === "user");
        if (userMsg && userMsg.content) {
          // Take first 30 characters of user message as title
          const cleanContent = userMsg.content.trim().replace(/\n/g, " ");
          session.title = cleanContent.length > 30 
            ? cleanContent.substring(0, 27) + "..." 
            : cleanContent;
        }
      }

      this.saveToDisk();
    }
  }

  public clearSession(id: string, systemPrompt: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.history = [{ role: "system", content: systemPrompt }];
      session.updatedAt = new Date().toISOString();
      this.saveToDisk();
    }
  }

  private saveToDisk(): void {
    try {
      const data = JSON.stringify(Array.from(this.sessions.values()), null, 2);
      fs.writeFileSync(this.filePath, data, "utf8");
    } catch (err) {
      console.error("Failed to save sessions to disk:", err);
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(fileContent) as Session[];
        this.sessions.clear();
        for (const session of parsed) {
          this.sessions.set(session.id, session);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions from disk, starting empty:", err);
    }
  }
}
