export class InputComponent {
    private input: HTMLInputElement;
    private sendBtn: HTMLElement;
    private onSend: (message: string) => Promise<void>;

    constructor(inputId: string, sendBtnId: string, onSend: (message: string) => Promise<void>) {
        this.input = document.getElementById(inputId) as HTMLInputElement;
        this.sendBtn = document.getElementById(sendBtnId) as HTMLElement;
        this.onSend = onSend;

        this.init();
    }

    private init(): void {
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        this.input.focus();
    }

    private async handleSend(): Promise<void> {
        const message = this.input.value.trim();
        if (!message) return;
        this.input.value = '';
        await this.onSend(message);
    }

    public focus(): void {
        this.input.focus();
    }
}
