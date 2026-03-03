import { ChatComponent } from './components/Chat';
import { InputComponent } from './components/Input';
import { SidebarComponent } from './components/Sidebar';

class App {
  private chat: ChatComponent;
  private input: InputComponent;
  private sidebar: SidebarComponent;

  constructor() {
    this.chat = new ChatComponent('output');
    this.input = new InputComponent('input', 'send-btn', (msg) => this.handleSendMessage(msg));
    this.sidebar = new SidebarComponent(
      'new-chat-btn',
      'clear-btn',
      'model-name',
      'feature-list',
      () => this.handleNewChat(),
      () => this.handleClearHistory()
    );

    this.init();
  }

  private init(): void {
    this.chat.showWelcome();
  }

  private async handleSendMessage(message: string): Promise<void> {
    this.chat.addMessage('user', message);
    const loadingId = this.chat.showLoading();

    try {
      const response = await fetch('/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      this.chat.removeLoading(loadingId);

      if (!response.ok) {
        const error = await response.json();
        this.chat.addMessage('error', `${error.error || 'Unknown error'}${error.details ? '\n' + error.details : ''}`);
        return;
      }

      const data = await response.json();
      this.chat.displayResponse(data.response);
    } catch (err: any) {
      this.chat.removeLoading(loadingId);
      this.chat.addMessage('error', `Network error: ${err.message}`);
    }
  }

  private async handleNewChat(): Promise<void> {
    try {
      await fetch('/clear', { method: 'POST' });
      this.chat.clear();
      this.chat.showWelcome();
      this.input.focus();
    } catch (err: any) {
      this.chat.addMessage('error', `Failed to clear history: ${err.message}`);
    }
  }

  private async handleClearHistory(): Promise<void> {
    try {
      await fetch('/clear', { method: 'POST' });
      this.chat.clear();
      this.chat.showWelcome();
    } catch (err: any) {
      this.chat.addMessage('error', `Failed to clear history: ${err.message}`);
    }
  }
}

// Initialize the app
new App();
