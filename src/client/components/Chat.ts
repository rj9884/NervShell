import { MessageType } from "../types";
import { renderMarkdown } from "../utils/markdown";

export class ChatComponent {
  private container: HTMLElement;
  private onToolApprove: (toolCallId: string, approved: boolean, command: string) => Promise<void>;

  constructor(
    containerId: string,
    onToolApprove: (toolCallId: string, approved: boolean, command: string) => Promise<void>
  ) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.onToolApprove = onToolApprove;
  }

  public showWelcome(): void {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-[50vh] text-center max-w-lg mx-auto space-y-4 animate-fade-in">
        <img src="/favicon.svg" alt="NervShell Logo" class="w-12 h-12">
        <h2 class="text-xl font-display font-bold text-text-primary">NervShell Control Session</h2>
        <p class="text-xs text-text-secondary leading-relaxed">
          This workspace is isolated. The AI assistant can list files, read directories, scan telemetry, and write documentation. Terminal executions will halt for approval under Safe Mode.
        </p>
        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <button onclick="document.getElementById('input').value='Show system metrics'; document.getElementById('chat-form').dispatchEvent(new Event('submit'))" class="p-3 bg-white hover:bg-slate-50 border border-border-solid rounded-lg text-left text-[11px] font-mono hover:border-accent-blue text-text-secondary hover:text-text-primary transition cursor-pointer">
            &gt; Show system metrics
          </button>
          <button onclick="document.getElementById('input').value='Scan directory files'; document.getElementById('chat-form').dispatchEvent(new Event('submit'))" class="p-3 bg-white hover:bg-slate-50 border border-border-solid rounded-lg text-left text-[11px] font-mono hover:border-accent-blue text-text-secondary hover:text-text-primary transition cursor-pointer">
            &gt; Scan directory files
          </button>
        </div>
      </div>
    `;
  }

  public clear(): void {
    this.container.innerHTML = "";
  }

  public addMessage(role: "user" | "assistant" | "tool" | "system" | "error", content: string): void {
    const welcome = this.container.querySelector(".welcome-container") || this.container.children.length === 0;
    if (welcome && this.container.querySelector("h2")) {
      this.clear();
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = `flex flex-col max-w-[85%] animate-fade-in ${role === "user" ? "self-end" : "self-start"}`;

    const isUser = role === "user";
    const isError = role === "error" || role === "system";

    const bubbleBg = isUser ? "bg-accent-blue text-white" : (isError ? "bg-red-50 border border-red-100" : "bg-slate-100 text-text-primary");
    const roundedClass = isUser ? "rounded-l-lg rounded-tr-lg" : "rounded-r-lg rounded-tl-lg";

    // Handle content parsing
    let innerHTML = "";
    if (isUser) {
      innerHTML = `<div class="px-4 py-3 rounded-lg text-[13px] font-medium ${bubbleBg} ${roundedClass}">${content.replace(/\n/g, "<br>")}</div>`;
    } else {
      // If it's a tool output indicator, format it nicely
      if (content.startsWith("[Tool:")) {
        const titleMatch = content.match(/^\[Tool: ([^\]]+)\] (OK|FAILED)/);
        if (titleMatch) {
          const toolName = titleMatch[1];
          const status = titleMatch[2];
          const cleanOutput = content.substring(titleMatch[0].length).trim();
          const borderClass = status === "OK" ? "border-slate-200" : "border-red-200";
          const headerBg = status === "OK" ? "bg-slate-900" : "bg-red-950";
          
          innerHTML = `
            <div class="terminal-box my-2 border ${borderClass} w-full max-w-2xl">
              <div class="terminal-header ${headerBg}">
                <span>CMD EXEC: ${toolName}</span>
                <span class="${status === "OK" ? "text-green-400" : "text-red-400"}">${status}</span>
              </div>
              <pre class="terminal-content"><code>${this.escapeHTML(cleanOutput)}</code></pre>
            </div>
          `;
        } else {
          innerHTML = `<div class="px-5 py-4 rounded-lg text-[13px] bg-slate-100 border border-border-solid rounded-lg font-mono">${renderMarkdown(content)}</div>`;
        }
      } else {
        innerHTML = `<div class="px-5 py-4 text-[13px] bg-white border border-border-solid rounded-lg text-text-primary leading-relaxed">${renderMarkdown(content)}</div>`;
      }
    }

    messageDiv.innerHTML = `
      <div class="flex items-start gap-3 my-2 ${isUser ? "flex-row-reverse" : ""}">
        <div class="w-8 h-8 rounded-full font-bold flex items-center justify-center text-[10px] select-none ${isUser ? "bg-accent-blue text-white" : "bg-slate-200 text-text-secondary"}">
          ${isUser ? "USER" : "AI"}
        </div>
        <div class="flex flex-col space-y-1">
          ${innerHTML}
          <div class="text-[9px] text-text-secondary px-1 italic">
            ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(messageDiv);
    this.scrollToBottom();
  }

  public displayResponse(response: string): void {
    // Check if response is a JSON payload
    try {
      const parsed = JSON.parse(response);
      if (parsed && parsed.status === "awaiting_approval") {
        if (parsed.preliminaryResponses && parsed.preliminaryResponses.trim()) {
          this.displayResponse(parsed.preliminaryResponses);
        }
        
        // Show Decider Approval Warning Panel
        this.showApprovalPanel(parsed.toolCall.id, parsed.toolCall.command);
        return;
      }
      
      // Skip rendering raw tool JSON output responses
      if (parsed && (parsed.tool || parsed.success !== undefined)) {
        return;
      }
    } catch (_) {}

    // Filter out parts of response that start with [Tool:
    const blocks = response.split("\n\n");
    const cleanBlocks = blocks.filter(block => !block.trim().startsWith("[Tool:"));
    
    if (cleanBlocks.length > 0) {
      const cleanResponse = cleanBlocks.join("\n\n");
      if (cleanResponse.trim()) {
        this.addMessage("assistant", cleanResponse.trim());
      }
    }
  }

  private showApprovalPanel(toolCallId: string, command: string): void {
    const deciderDiv = document.createElement("div");
    deciderDiv.className = "warning-panel max-w-2xl border border-amber-200 rounded-lg p-5 my-4 bg-amber-50 animate-fade-in";
    deciderDiv.innerHTML = `
      <div class="flex flex-col gap-3 font-sans">
        <div class="flex items-center justify-between text-xs text-accent-amber font-bold">
          <span>⚠️ SAFE MODE: CONFIRM CLI EXECUTION</span>
          <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px]">PENDING</span>
        </div>
        <p class="text-xs text-amber-800 font-medium">
          The assistant is requesting permission to run this terminal command in your workspace:
        </p>
        <pre class="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto select-all border border-slate-800">${command}</pre>
        <div class="flex gap-2.5 pt-2">
          <button id="btn-approve-${toolCallId}" class="bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold px-4 py-2 rounded-md transition cursor-pointer active:scale-95 shadow-sm">
            Approve Execution
          </button>
          <button id="btn-reject-${toolCallId}" class="bg-white hover:bg-slate-100 text-text-primary border border-border-solid text-xs font-semibold px-4 py-2 rounded-md transition cursor-pointer active:scale-95">
            Reject
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(deciderDiv);
    this.scrollToBottom();

    // Event Listeners
    const approveBtn = document.getElementById(`btn-approve-${toolCallId}`)!;
    const rejectBtn = document.getElementById(`btn-reject-${toolCallId}`)!;

    const handleDecision = async (approved: boolean) => {
      // Disable buttons
      approveBtn.setAttribute("disabled", "true");
      rejectBtn.setAttribute("disabled", "true");
      
      // Update warning panel appearance
      deciderDiv.className = approved 
        ? "bg-slate-50 border border-slate-200 p-4 rounded-lg my-4 opacity-70"
        : "bg-red-50 border border-red-200 p-4 rounded-lg my-4 opacity-70";
      
      deciderDiv.innerHTML = `
        <div class="text-[11px] font-semibold ${approved ? "text-slate-500" : "text-accent-red"} font-mono">
          ${approved ? `&check; Approved & Executed: ${command}` : `&cross; Rejected Execution: ${command}`}
        </div>
      `;

      const loaderId = this.showLoading();
      try {
        await this.onToolApprove(toolCallId, approved, command);
      } catch (err: any) {
        this.addMessage("error", `Failed to complete approval: ${err.message}`);
      } finally {
        this.removeLoading(loaderId);
      }
    };

    approveBtn.addEventListener("click", () => handleDecision(true));
    rejectBtn.addEventListener("click", () => handleDecision(false));
  }

  public showLoading(): string {
    const id = "loading-" + Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.id = id;
    loadingDiv.className = "flex items-center gap-3 animate-pulse px-4 py-2 border border-slate-100 rounded-md bg-slate-50 self-start text-[11px] font-semibold text-accent-blue font-mono";
    loadingDiv.innerHTML = `
      <div class="w-3.5 h-3.5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
      <span>ACCESSING TERMINAL CORE...</span>
    `;
    this.container.appendChild(loadingDiv);
    this.scrollToBottom();
    return id;
  }

  public removeLoading(id: string): void {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
