export interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emailContent?: string; // For assistant messages that contain updated email
}

export interface ChatSession {
  id: string;
  jobTitle: string;
  companyName: string;
  messages: ChatMessage[];
  currentEmail: string;
}