import { ChatComponent } from "./components/Chat";
import { InputComponent } from "./components/Input";
import { SidebarComponent } from "./components/Sidebar";
import { WorkspaceComponent } from "./components/Workspace";
import { Message, SessionSummary } from "./types";

class App {
  private chat!: ChatComponent;
  private input!: InputComponent;
  private sidebar!: SidebarComponent;
  private workspace!: WorkspaceComponent;

  // View state selectors
  private landingPageEl = document.getElementById("landing-page") as HTMLElement;
  private dashboardEl = document.getElementById("app-dashboard") as HTMLElement;
  
  // Header details
  private sessionTitleEl = document.getElementById("active-session-title") as HTMLElement;
  private modelTagEl = document.getElementById("current-model-tag") as HTMLElement;

  // App State
  private sessions: SessionSummary[] = [];
  private activeSessionId: string | null = null;
  private safeModeEnabled = true;
  private currentModel = "google/gemini-2.0-flash-exp:free";

  constructor() {
    console.log("[App] Initializing Personal AI Assistant Application");
    this.setupViewNavigation();
    this.initComponents();
    this.loadInitialData();
  }

  private setupViewNavigation(): void {
    const launchBtn = document.getElementById("btn-launch")!;
    const heroLaunchBtn = document.getElementById("hero-btn-launch")!;
    const backBtn = document.getElementById("btn-back-landing")!;
    const logoBtn = document.getElementById("dashboard-logo")!;

    const enterDashboard = () => {
      this.landingPageEl.classList.add("view-hidden");
      this.dashboardEl.classList.remove("view-hidden");
      this.input.focus();
      // Refresh tree and telemetry upon entering
      this.workspace.refreshWorkspace();
      this.workspace.refreshTelemetry();
    };

    const exitDashboard = () => {
      this.dashboardEl.classList.add("view-hidden");
      this.landingPageEl.classList.remove("view-hidden");
    };

    launchBtn.addEventListener("click", enterDashboard);
    heroLaunchBtn.addEventListener("click", enterDashboard);
    backBtn.addEventListener("click", exitDashboard);
    logoBtn.addEventListener("click", exitDashboard);
  }

  private initComponents(): void {
    // 1. Chat Console Component
    this.chat = new ChatComponent("output", (toolCallId, approved, command) =>
      this.handleToolApproval(toolCallId, approved, command)
    );

    // 2. Input Component
    this.input = new InputComponent("chat-form", "input", (msg) => this.handleSendMessage(msg));

    // 3. Sidebar Component
    this.sidebar = new SidebarComponent(
      "new-chat-btn",
      "clear-btn",
      "session-list",
      "safe-mode-toggle",
      "model-select",
      "system-connect-toggle",
      {
        onNewChat: () => this.handleNewChat(),
        onClear: () => this.handleClearHistory(),
        onSelectSession: (id) => this.handleSelectSession(id),
        onDeleteSession: (id) => this.handleDeleteSession(id),
        onModelChange: (model) => this.handleModelChange(model),
        onSafeModeChange: (enabled) => {
          this.safeModeEnabled = enabled;
        },
        onSystemConnectChange: (enabled) => this.handleSystemConnectChange(enabled),
      }
    );

    // 4. Workspace & Diagnostics Component
    this.workspace = new WorkspaceComponent("workspace-tree", {
      cpu: "telemetry-cpu",
      cpuBar: "telemetry-cpu-bar",
      cores: "telemetry-cores",
      ram: "telemetry-ram",
      ramBar: "telemetry-ram-bar",
      ramDetail: "telemetry-ram-label",
      platform: "telemetry-platform",
      uptime: "telemetry-uptime",
    });
  }

  private async handleSystemConnectChange(enabled: boolean): Promise<void> {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemConnected: enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        this.chat.addMessage(
          "system",
          enabled 
            ? "CONNECTED TO HOST OS: System directory scans enabled (scanned from home folder)." 
            : "DISCONNECTED FROM HOST OS: System directory scans disabled (locked to workspace folder)."
        );
        // Refresh workspace explorer tree
        await this.workspace.refreshWorkspace();
      }
    } catch (err: any) {
      this.chat.addMessage("error", `Failed to toggle system mode: ${err.message}`);
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      // 1. Sync Settings (Active Model & System connection status)
      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        this.currentModel = data.settings.model;
        this.sidebar.setSelectedModel(this.currentModel);
        this.updateModelHeaderTag(this.currentModel);
        
        // Sync system connect toggle check
        this.sidebar.setSystemConnected(!!data.settings.systemConnected);
      }

      // 2. Sync sessions list
      await this.refreshSessionsList();

      // 3. If there are existing sessions, load the first one. Otherwise create a default session.
      if (this.sessions.length > 0) {
        await this.handleSelectSession(this.sessions[0].id);
      } else {
        await this.handleNewChat();
      }
    } catch (err) {
      console.error("[App] Failed to load startup context:", err);
      this.chat.addMessage("error", "Failed to sync connection with assistant server.");
    }
  }

  private async refreshSessionsList(): Promise<void> {
    const res = await fetch("/api/sessions");
    if (!res.ok) throw new Error("Failed to load sessions");
    const data = await res.json();
    this.sessions = data.sessions;
    this.sidebar.renderSessions(this.sessions, this.activeSessionId);
  }

  private async handleSendMessage(message: string): Promise<void> {
    if (!this.activeSessionId) return;

    this.chat.addMessage("user", message);
    const loadingId = this.chat.showLoading();

    try {
      const response = await fetch("/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: this.activeSessionId,
          safeMode: this.safeModeEnabled,
        }),
      });

      this.chat.removeLoading(loadingId);

      if (!response.ok) {
        const error = await response.json();
        this.chat.addMessage(
          "error",
          `${error.error || "Unknown error"}${error.details ? "\n" + error.details : ""}`
        );
        return;
      }

      const data = await response.json();
      this.chat.displayResponse(data.response);

      // Refresh metadata files & history listing
      await this.refreshSessionsList();
      await this.workspace.refreshWorkspace();
    } catch (err: any) {
      this.chat.removeLoading(loadingId);
      this.chat.addMessage("error", `Network error: ${err.message}`);
    }
  }

  private async handleToolApproval(toolCallId: string, approved: boolean, command: string): Promise<void> {
    if (!this.activeSessionId) return;

    try {
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.activeSessionId,
          toolCallId,
          approved,
          command,
          safeMode: this.safeModeEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.chat.addMessage("error", `Failed to transmit tool choice: ${error.error}`);
        return;
      }

      const data = await response.json();
      this.chat.displayResponse(data.response);

      // Refresh directory listings & sessions summaries
      await this.refreshSessionsList();
      await this.workspace.refreshWorkspace();
    } catch (err: any) {
      this.chat.addMessage("error", `Approval Network Failure: ${err.message}`);
    }
  }

  private async handleNewChat(): Promise<void> {
    try {
      const id = `session_${Date.now()}`;
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title: "New Chat" }),
      });

      if (!res.ok) throw new Error();
      const session = await res.json();

      this.activeSessionId = session.id;
      this.sessionTitleEl.textContent = "New Chat";
      this.chat.clear();
      this.chat.showWelcome();

      await this.refreshSessionsList();
      this.input.focus();
    } catch (err: any) {
      this.chat.addMessage("error", `Failed to spin up session: ${err.message}`);
    }
  }

  private async handleSelectSession(id: string): Promise<void> {
    this.activeSessionId = id;
    
    // Find title
    const session = this.sessions.find((s) => s.id === id);
    this.sessionTitleEl.textContent = session ? session.title : "Active Console";

    const loadingId = this.chat.showLoading();
    try {
      const res = await fetch(`/history?sessionId=${encodeURIComponent(id)}`);
      this.chat.removeLoading(loadingId);

      if (!res.ok) throw new Error();
      const data = await res.json();
      const history: Message[] = data.history;

      this.chat.clear();
      
      // Filter out system messages for display
      const displayHistory = history.filter((m) => m.role !== "system");

      if (displayHistory.length === 0) {
        this.chat.showWelcome();
      } else {
        displayHistory.forEach((msg) => {
          if (msg.role === "assistant" && msg.content) {
            this.chat.displayResponse(msg.content);
          } else if (msg.role === "user") {
            this.chat.addMessage("user", msg.content);
          } else if (msg.role === "tool") {
            this.chat.addMessage("tool", msg.content);
          }
        });
      }

      this.sidebar.renderSessions(this.sessions, this.activeSessionId);
      this.input.focus();
    } catch (err: any) {
      this.chat.removeLoading(loadingId);
      this.chat.addMessage("error", `Failed to fetch session history: ${err.message}`);
    }
  }

  private async handleDeleteSession(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      // If active session was deleted, switch active target
      if (this.activeSessionId === id) {
        this.activeSessionId = null;
      }

      await this.refreshSessionsList();

      if (!this.activeSessionId) {
        if (this.sessions.length > 0) {
          await this.handleSelectSession(this.sessions[0].id);
        } else {
          await this.handleNewChat();
        }
      }
    } catch (err: any) {
      this.chat.addMessage("error", `Failed to delete session: ${err.message}`);
    }
  }

  private async handleClearHistory(): Promise<void> {
    if (!this.activeSessionId) return;

    try {
      const res = await fetch("/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.activeSessionId }),
      });
      if (!res.ok) throw new Error();

      this.chat.clear();
      this.chat.showWelcome();
      await this.refreshSessionsList();
    } catch (err: any) {
      this.chat.addMessage("error", `Failed to clear logs: ${err.message}`);
    }
  }

  private async handleModelChange(model: string): Promise<void> {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        const data = await res.json();
        this.currentModel = data.settings.model;
        this.updateModelHeaderTag(this.currentModel);
        this.chat.addMessage("system", `System engine switched to: ${this.currentModel}`);
      }
    } catch (err: any) {
      this.chat.addMessage("error", `Failed to switch system engine model: ${err.message}`);
    }
  }

  private updateModelHeaderTag(model: string): void {
    if (model.includes("gemini")) {
      this.modelTagEl.textContent = "Gemini 2.0";
    } else if (model.includes("deepseek")) {
      this.modelTagEl.textContent = "DeepSeek Chat";
    } else if (model.includes("llama")) {
      this.modelTagEl.textContent = "Llama 3.3";
    } else {
      this.modelTagEl.textContent = "Custom Model";
    }
  }
}

new App();
