export class InputComponent {
    private input: HTMLInputElement;
    private form: HTMLFormElement;
    private onSend: (message: string) => Promise<void>;

    constructor(formId: string, inputId: string, onSend: (message: string) => Promise<void>) {
        console.log('[Input] Initializing with IDs:', { formId, inputId });
        this.form = document.getElementById(formId) as HTMLFormElement;
        this.input = document.getElementById(inputId) as HTMLInputElement;
        this.onSend = onSend;

        if (!this.form || !this.input) {
            console.error('[Input] Failed to find elements:', { form: !!this.form, input: !!this.input });
        }

        this.init();
    }

    private init(): void {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            console.log('[Input] Form submitted');
            e.preventDefault();
            this.handleSend();
        });

        this.input.focus();
        console.log('[Input] Event listeners attached');
    }

    private async handleSend(): Promise<void> {
        const message = this.input.value.trim();
        console.log('[Input] handleSend called with message:', message);

        if (!message) {
            console.log('[Input] Empty message, ignoring');
            return;
        }

        this.input.value = '';
        try {
            console.log('[Input] Calling onSend callback...');
            await this.onSend(message);
            console.log('[Input] onSend completed successfully');
        } catch (err) {
            console.error('[Input] Error in onSend callback:', err);
        }
    }

    public focus(): void {
        this.input.focus();
    }
}
