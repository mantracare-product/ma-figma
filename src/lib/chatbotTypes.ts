// Shared types for Chatbot settings, dynamic responses, button actions, and handoff configurations

export interface DynamicResponse {
  type: "text" | "question" | "template";
  text?: string;                 // used when type === "text", or as the question prompt when type === "question"
  questionType?: "open" | "buttons" | "list";
  buttons?: ButtonAction[];
  listItems?: string[];
  saveResponseField?: string;
  templateId?: string;           // used when type === "template"
}

export interface HandoffNoResponse {
  type: "message" | "template" | "triggerChatbot";
  text?: string;
  templateId?: string;
  targetBotId?: string;
}

export interface ButtonAction {
  id: string;
  label: string;
  actionType: "quick_reply" | "call" | "url" | "email";
  value?: string; // phone number for "call", URL for "url", email address for "email" — unused for "quick_reply"
}
