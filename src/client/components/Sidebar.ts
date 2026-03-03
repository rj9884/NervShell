export class SidebarComponent {
    private newChatBtn: HTMLElement;
    private clearBtn: HTMLElement;
    private modelNameEl: HTMLElement;
    private onNewChat: () => Promise<void>;
    private onClear: () => Promise<void>;

    private featureListEl: HTMLElement;

    constructor(
        newChatBtnId: string,
        clearBtnId: string,
        modelNameId: string,
        featureListId: string,
        onNewChat: () => Promise<void>,
        onClear: () => Promise<void>
    ) {
        this.newChatBtn = document.getElementById(newChatBtnId) as HTMLElement;
        this.clearBtn = document.getElementById(clearBtnId) as HTMLElement;
        this.modelNameEl = document.getElementById(modelNameId) as HTMLElement;
        this.featureListEl = document.getElementById(featureListId) as HTMLElement;
        this.onNewChat = onNewChat;
        this.onClear = onClear;

        this.init();
    }

    private init(): void {
        this.newChatBtn.addEventListener('click', () => this.onNewChat());
        this.clearBtn.addEventListener('click', () => this.onClear());
        this.renderFeatures();
    }

    private renderFeatures(): void {
        const features = [
            { icon: '⌘', label: 'Shell Intelligence' },
            { icon: '📁', label: 'Context Awareness' },
            { icon: '🛡️', label: 'Safe Execution' },
            { icon: '⚡', label: 'Real-time Stream' }
        ];

        this.featureListEl.innerHTML = features.map(f => `
            <div class="flex items-center gap-3 px-4 py-2 text-xs font-medium text-white/50 transition-premium hover:text-white hover:bg-white/5 rounded-lg group cursor-default">
                <span class="text-sm grayscale group-hover:grayscale-0 transition-premium">${f.icon}</span>
                <span>${f.label}</span>
            </div>
        `).join('');
    }

    public setModelName(name: string): void {
        this.modelNameEl.textContent = name;
    }
}

