import { FileNode, TelemetryData } from "../types";

export class WorkspaceComponent {
  private treeContainer: HTMLElement;
  
  private cpuLabel: HTMLElement;
  private cpuBar: HTMLElement;
  private coresLabel: HTMLElement;
  
  private ramLabel: HTMLElement;
  private ramBar: HTMLElement;
  private ramDetailLabel: HTMLElement;
  
  private platformLabel: HTMLElement;
  private uptimeLabel: HTMLElement;

  private pollIntervalId: any = null;

  constructor(
    treeContainerId: string,
    telemetryIds: {
      cpu: string;
      cpuBar: string;
      cores: string;
      ram: string;
      ramBar: string;
      ramDetail: string;
      platform: string;
      uptime: string;
    }
  ) {
    this.treeContainer = document.getElementById(treeContainerId) as HTMLElement;
    
    this.cpuLabel = document.getElementById(telemetryIds.cpu) as HTMLElement;
    this.cpuBar = document.getElementById(telemetryIds.cpuBar) as HTMLElement;
    this.coresLabel = document.getElementById(telemetryIds.cores) as HTMLElement;
    
    this.ramLabel = document.getElementById(telemetryIds.ram) as HTMLElement;
    this.ramBar = document.getElementById(telemetryIds.ramBar) as HTMLElement;
    this.ramDetailLabel = document.getElementById(telemetryIds.ramDetail) as HTMLElement;
    
    this.platformLabel = document.getElementById(telemetryIds.platform) as HTMLElement;
    this.uptimeLabel = document.getElementById(telemetryIds.uptime) as HTMLElement;

    this.init();
  }

  private init(): void {
    this.refreshWorkspace();
    this.refreshTelemetry();
    
    // Poll telemetry diagnostics every 5 seconds
    this.pollIntervalId = setInterval(() => {
      this.refreshTelemetry();
    }, 5000);
  }

  public destroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  public async refreshWorkspace(): Promise<void> {
    try {
      const response = await fetch("/api/workspace");
      if (!response.ok) throw new Error("Failed to scan directory");
      const data = await response.json();
      this.renderTree(data.tree);
    } catch (err: any) {
      this.treeContainer.innerHTML = `
        <div class="text-[11px] text-accent-red font-mono p-2">
          Workspace Error: ${err.message}
        </div>
      `;
    }
  }

  private renderTree(nodes: FileNode[]): void {
    if (nodes.length === 0) {
      this.treeContainer.innerHTML = `
        <span class="text-[11px] text-text-secondary font-mono italic">Empty folder.</span>
      `;
      return;
    }

    const generateHTML = (nodeList: FileNode[]): string => {
      return nodeList
        .map((node) => {
          if (node.isDirectory) {
            const hasChildren = node.children && node.children.length > 0;
            const childrenHTML = hasChildren ? generateHTML(node.children!) : "";
            
            return `
              <div class="space-y-1">
                <div class="directory-item group">
                  <span class="text-[10px] text-accent-blue font-bold font-mono">📁</span>
                  <span class="truncate flex-1 font-mono text-[11px]">${node.name}</span>
                </div>
                ${hasChildren ? `<div class="pl-3 border-l border-slate-200 ml-2 space-y-1">${childrenHTML}</div>` : ""}
              </div>
            `;
          } else {
            const formattedSize = this.formatBytes(node.size || 0);
            return `
              <div class="file-item group" title="${node.name} (${formattedSize})">
                <span class="text-[10px] font-mono">📄</span>
                <span class="truncate flex-1 font-mono text-[11px]">${node.name}</span>
                <span class="text-[9px] text-text-secondary opacity-0 group-hover:opacity-100 font-mono">${formattedSize}</span>
              </div>
            `;
          }
        })
        .join("");
    };

    this.treeContainer.innerHTML = generateHTML(nodes);
  }

  public async refreshTelemetry(): Promise<void> {
    try {
      const response = await fetch("/api/system");
      if (!response.ok) throw new Error();
      const data: TelemetryData = await response.json();
      
      // Update CPU
      const cpuLoad = Math.round(data.cpu.load1Min * 100);
      this.cpuLabel.textContent = `${cpuLoad}%`;
      this.cpuBar.style.width = `${Math.min(cpuLoad, 100)}%`;
      this.coresLabel.textContent = `${data.cpu.cores} Cores`;
      
      // Update Memory
      this.ramLabel.textContent = `${data.memory.usagePercent}%`;
      this.ramBar.style.width = `${data.memory.usagePercent}%`;
      const usedGB = (data.memory.used / (1024 * 1024 * 1024)).toFixed(1);
      const totalGB = (data.memory.total / (1024 * 1024 * 1024)).toFixed(1);
      this.ramDetailLabel.textContent = `${usedGB} / ${totalGB} GB`;
      
      // Update Meta
      this.platformLabel.textContent = data.platform;
      this.uptimeLabel.textContent = this.formatUptime(data.uptime);
    } catch (_) {
      // Telemetry error - keep silently showing fallback labels
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  private formatUptime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }
}
