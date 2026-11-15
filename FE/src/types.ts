
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatExchange {
  userMessage: Message;
  assistantMessage: Message;
}
