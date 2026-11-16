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

export interface Work {
  title?: string | null;
  type?: string | null;
  status?: string | null;
  detail?: string | null;
  tools?: string | null;
  link?: string | null;
}

export interface Member {
  name?: string | null;
  nickname?: string | null;
  englishName?: string | null;
  role?: string | null;
  education?: string | null;
  interestedPosition?: string | null;
  intro?: string | null;
  skills?: string[];
  coreStrength?: string | null;
  softSkills?: string[];
  works?: (Work | string)[];
  careerGoal?: string | null;
  hobbies?: string[];
  contact?: string | null;
}

export interface Portfolio {
  group?: {
    name?: string | null;
    concept?: string | null;
    highlights?: string[];
    sharedWorks?: string[];
    contact?: Record<string, string | null>;
  };
  members?: Member[];
}
