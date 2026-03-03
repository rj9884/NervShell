export type MessageType = 'user' | 'ai' | 'tool' | 'error';

export interface Message {
    type: MessageType;
    content: string;
}

export interface ConversationHistory {
    history: any[]; // Matches backend's detail if needed, but for UI we mostly care about display
}

export interface AgentResponse {
    response: string;
}
