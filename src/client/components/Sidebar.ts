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
            { icon: '⌘', label: 'Shell Intelligence', desc: 'Natural language to terminal code.' },
            { icon: '📁', label: 'Context Awareness', desc: 'Remembers project states.' },
            { icon: '🛡️', label: 'Vision Safety', desc: 'Secure command execution.' },
            { icon: '⚡', label: 'Real-time Link', desc: 'Live neural streaming.' }
        ];

        this.featureListEl.innerHTML = features.map(f => `
            <div class="feature-card group cursor-default">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-accent font-bold opacity-0 group-hover:opacity-100 transition-premium text-[8px]">></span>
                    <span class="text-[10px] font-black tracking-widest uppercase text-white/50 group-hover:text-accent transition-premium">${f.label}</span>
                </div>
                <p class="text-[9px] text-white/20 leading-tight group-hover:text-white/40 transition-premium">${f.desc}</p>
            </div>
        `).join('');
    }


    public setModelName(name: string): void {
        this.modelNameEl.textContent = name;
    }
}

