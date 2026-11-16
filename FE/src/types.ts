export interface Source {
  title: string;
  url: string | null;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
}

export interface ChatExchange {
  sessionId: string;
  userMessage: Message;
  assistantMessage: Message;
  sources: Source[];
}

export type Language = 'th' | 'en';

export interface Portfolio {
  group?: {
    name?: string | null;
    concept?: string | null;
    highlights?: string[];
    sharedWorks?: string[];
    contact?: Record<string, string | null>;
  };
  members?: {
    name?: string | null;
    role?: string | null;
    skills?: string[];
    works?: string[];
    contact?: string | null;
  }[];
}
