import { SessionSummary } from "../types";

export class SidebarComponent {
  private newChatBtn: HTMLElement;
  private clearBtn: HTMLElement;
  private sessionListEl: HTMLElement;
  private safeModeToggle: HTMLInputElement;
  private modelSelect: HTMLSelectElement;
  private systemConnectToggle: HTMLInputElement;

  private onNewChat: () => Promise<void>;
  private onClear: () => Promise<void>;
  private onSelectSession: (id: string) => void;
  private onDeleteSession: (id: string) => Promise<void>;
  private onModelChange: (model: string) => Promise<void>;
  private onSafeModeChange: (enabled: boolean) => void;
  private onSystemConnectChange: (enabled: boolean) => Promise<void>;

  private activeSessionId: string | null = null;

  constructor(
    newChatBtnId: string,
    clearBtnId: string,
    sessionListId: string,
    safeModeToggleId: string,
    modelSelectId: string,
    systemConnectToggleId: string,
    callbacks: {
      onNewChat: () => Promise<void>;
      onClear: () => Promise<void>;
      onSelectSession: (id: string) => void;
      onDeleteSession: (id: string) => Promise<void>;
      onModelChange: (model: string) => Promise<void>;
      onSafeModeChange: (enabled: boolean) => void;
      onSystemConnectChange: (enabled: boolean) => Promise<void>;
    }
  ) {
    this.newChatBtn = document.getElementById(newChatBtnId) as HTMLElement;
    this.clearBtn = document.getElementById(clearBtnId) as HTMLElement;
    this.sessionListEl = document.getElementById(sessionListId) as HTMLElement;
    this.safeModeToggle = document.getElementById(safeModeToggleId) as HTMLInputElement;
    this.modelSelect = document.getElementById(modelSelectId) as HTMLSelectElement;
    this.systemConnectToggle = document.getElementById(systemConnectToggleId) as HTMLInputElement;

    this.onNewChat = callbacks.onNewChat;
    this.onClear = callbacks.onClear;
    this.onSelectSession = callbacks.onSelectSession;
    this.onDeleteSession = callbacks.onDeleteSession;
    this.onModelChange = callbacks.onModelChange;
    this.onSafeModeChange = callbacks.onSafeModeChange;
    this.onSystemConnectChange = callbacks.onSystemConnectChange;

    this.init();
  }

  private init(): void {
    this.newChatBtn.addEventListener("click", () => this.onNewChat());
    this.clearBtn.addEventListener("click", () => this.onClear());

    this.safeModeToggle.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.onSafeModeChange(target.checked);
    });

    this.modelSelect.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      this.onModelChange(target.value);
    });

    this.systemConnectToggle.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.onSystemConnectChange(target.checked);
    });
  }

  public renderSessions(sessions: SessionSummary[], activeId: string | null): void {
    this.activeSessionId = activeId;

    if (sessions.length === 0) {
      this.sessionListEl.innerHTML = `
        <div class="text-[11px] text-text-secondary px-2 italic py-4">
          No history logs.
        </div>
      `;
      return;
    }

    this.sessionListEl.innerHTML = sessions
      .map((session) => {
        const isActive = session.id === this.activeSessionId;
        const activeClass = isActive
          ? "bg-slate-100 text-text-primary border-l-2 border-accent-blue font-semibold"
          : "hover:bg-slate-50 text-text-secondary hover:text-text-primary";

        return `
        <div data-id="${session.id}" class="group flex items-center justify-between p-2 rounded-md transition text-xs cursor-pointer ${activeClass}">
          <span class="truncate flex-1 font-mono">${session.title}</span>
          <button class="delete-session-btn opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition duration-150 cursor-pointer ml-1" title="Delete session">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      })
      .join("");

    // Attach dynamic click events
    const items = this.sessionListEl.querySelectorAll("[data-id]");
    items.forEach((item) => {
      const id = item.getAttribute("data-id")!;
      
      // Delete session click handler
      const delBtn = item.querySelector(".delete-session-btn")!;
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Stop parent click event
        if (confirm("Delete this conversation logs?")) {
          await this.onDeleteSession(id);
        }
      });

      // Switch session click handler
      item.addEventListener("click", () => {
        if (id !== this.activeSessionId) {
          this.onSelectSession(id);
        }
      });
    });
  }

  public getSafeModeEnabled(): boolean {
    return this.safeModeToggle.checked;
  }

  public getSelectedModel(): string {
    return this.modelSelect.value;
  }

  public setSelectedModel(model: string): void {
    this.modelSelect.value = model;
  }

  public setSystemConnected(connected: boolean): void {
    this.systemConnectToggle.checked = connected;
  }
}
