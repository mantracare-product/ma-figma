export type NotificationType = "task" | "chat" | "process" | "billing" | "system";

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  meta?: {
    taskId?: string;
    conversationId?: string;
    clientId?: string;
    invoiceId?: string;
    senderName?: string;
  };
}

