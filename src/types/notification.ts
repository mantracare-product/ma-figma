export type NotificationType = "task" | "chat" | "process" | "billing" | "system" | "reminder";

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  module?: string;
  meta?: {
    taskId?: string;
    conversationId?: string;
    clientId?: string;
    invoiceId?: string;
    reminderId?: string;
    targetUserId?: string;
    targetUserName?: string;
    createdByName?: string;
    dueDate?: string;
    senderName?: string;
    module?: string;
  };
}
