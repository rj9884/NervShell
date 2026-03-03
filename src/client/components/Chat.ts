import { MessageType } from '../types';

export class ChatComponent {
    private container: HTMLElement;

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) as HTMLElement;
    }

    public showWelcome(): void {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center welcome-container h-[50vh]">
                <div class="text-center welcome-message">
                    <h1 class="text-7xl font-bold tracking-tighter mb-6 bg-accent-gradient bg-clip-text text-transparent opacity-0 animate-[fade-in_1s_ease-out_forwards]">
                        NervShell</h1>
                    <p class="mx-auto text-xl font-medium tracking-tight max-w-lg text-white/40 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
                        Autonomous intelligence for your terminal environment.
                    </p>
                </div>
            </div>
        `;
    }

    public clear(): void {
        this.container.innerHTML = '';
    }

    public addMessage(type: MessageType, content: string): void {
        const welcome = this.container.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500`;

        const isAI = type === 'ai';
        const isUser = type === 'user';
        const isError = type === 'error';
        const isTool = type === 'tool';

        messageDiv.innerHTML = `
            <div class="flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${isUser ? 'bg-white/5 text-white/40 border border-white/5' : 'bg-accent-gradient text-white shadow-glow'}">
                    ${isUser ? 'U' : (isTool ? 'T' : (isError ? '!' : 'NS'))}
                </div>
                <div class="flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : ''}">
                    <div class="glass-panel px-6 py-4 rounded-2xl text-[15px] leading-relaxed ${isUser ? 'bg-white/5' : ''} ${isError ? 'border-red-500/20 text-red-200' : (isTool ? 'font-mono text-sm bg-accent/5' : 'text-white/90')}">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
                    <span class="text-[10px] font-bold tracking-widest uppercase text-white/20 px-1">
                        ${type} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        `;

        this.container.appendChild(messageDiv);
        this.scrollToBottom();
    }

    public displayResponse(response: string): void {
        if (response.includes('[Tool:')) {
            const parts = response.split(/(\[Tool: [^\]]+\] [A-Z]+)/);
            let currentText = '';

            for (const part of parts) {
                if (part.startsWith('[Tool:')) {
                    if (currentText.trim()) {
                        this.addMessage('ai', currentText.trim());
                        currentText = '';
                    }
                    const toolMatch = part.match(/\[Tool: ([^\]]+)\] ([A-Z]+)/);
                    if (toolMatch) {
                        this.addMessage('tool', `${toolMatch[1]} ${toolMatch[2]}`);
                    }
                } else {
                    currentText += part;
                }
            }

            if (currentText.trim()) {
                this.addMessage('ai', currentText.trim());
            }
        } else {
            this.addMessage('ai', response);
        }
    }


    public showLoading(): string {
        const id = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = id;
        loadingDiv.className = 'flex items-center gap-4 animate-pulse px-2';
        loadingDiv.innerHTML = `
            <div class="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span class="text-xs font-bold tracking-widest text-white/20 uppercase">Processing neural link...</span>
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
}
