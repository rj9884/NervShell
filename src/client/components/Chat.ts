import { MessageType } from '../types';

export class ChatComponent {
    private container: HTMLElement;

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) as HTMLElement;
    }

    public showWelcome(): void {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center welcome-container h-[55vh]">
                <div class="text-center welcome-message">
                    <h1 class="text-8xl font-black tracking-tighter mb-4 italic opacity-0 animate-[fade-in_1s_ease-out_forwards]">
                        <span class="text-accent glow-red">Nerv</span>Shell</h1>
                    <p class="mx-auto text-xl font-medium tracking-tight max-w-lg text-white/30 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards] uppercase tracking-[0.2em] text-sm font-bold">
                        The AI that gets things done.
                    </p>
                </div>
            </div>
        `;
    }

    public clear(): void {
        this.container.innerHTML = '';
    }

    public addMessage(type: MessageType, content: string): void {
        console.log('[Chat] addMessage called:', { type, contentSnippet: content.substring(0, 30) });
        const welcome = this.container.querySelector('.welcome-container');
        if (welcome) {
            console.log('[Chat] Removing welcome container');
            welcome.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex flex-col gap-4 opacity-0 animate-[fade-in_0.5s_ease-out_forwards] max-w-[90%] ${type === 'user' ? 'self-end' : 'self-start'}`;

        const isAI = type === 'ai';
        const isUser = type === 'user';
        const isError = type === 'error';
        const isTool = type === 'tool';

        const colorClass = isUser ? 'text-accent border-accent/20' : (isAI ? 'text-secondary border-secondary/20' : 'text-white/40 border-white/10');
        const glowClass = isUser ? 'shadow-glow-red' : (isAI ? 'shadow-glow-teal' : '');

        messageDiv.innerHTML = `
            <div class="flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}">
                <div class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-[10px] tracking-tighter transition-premium ${isUser ? 'accent-gradient text-white ' + glowClass : (isAI ? 'teal-gradient text-white ' + glowClass : 'bg-white/5 text-white/20')}">
                    ${isUser ? 'YOU' : (isAI ? 'NS' : (isTool ? 'TL' : '!!'))}
                </div>
                <div class="flex flex-col gap-2 ${isUser ? 'items-end' : ''}">
                    <div class="glass-panel px-8 py-5 rounded-2xl text-[15px] leading-relaxed transition-premium border-white/10 ${isUser ? 'hover:border-accent/40 bg-white/[0.02]' : (isAI ? 'hover:border-secondary/40' : '')} ${isError ? 'border-accent/30 text-accent/80' : 'text-white/90'}">
                        ${content.replace(/\n/g, '<br>')}
                    </div>
                    <div class="flex items-center gap-3 px-2">
                        <span class="text-[9px] font-black tracking-[0.2em] uppercase text-white/20">
                            ${type}
                        </span>
                        <span class="w-1 h-1 rounded-full bg-white/10"></span>
                        <span class="text-[9px] font-bold text-white/20 italic">
                            ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        `;

        console.log('[Chat] Appending message to container');
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
        loadingDiv.className = 'flex items-center gap-4 animate-pulse px-4';
        loadingDiv.innerHTML = `
            <div class="w-12 h-12 rounded-xl glass-panel flex items-center justify-center border-accent/20">
                <div class="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span class="text-[10px] font-black tracking-[0.3em] text-accent uppercase">Accessing Vision Network...</span>
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
