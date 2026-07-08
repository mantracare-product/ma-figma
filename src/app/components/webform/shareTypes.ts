

export type ShareChannel = "sms" | "whatsapp" | "email";
export type ShareTargetKind = "form" | "flow";

export interface ShareTarget {
  id: number;
  name: string;
  kind: ShareTargetKind;
  status?: "live" | "draft";
}

export interface ShareFormDrawerProps {
  target: ShareTarget | null;
  onClose: () => void;
  onSend?: (payload: {
    formId: number;
    clients: ShareClient[];
    channel: ShareChannel;
    kind: ShareTargetKind;
  }) => void;
}

// ─── Recipient / Client types ─────────────────────────────────────────────────

export interface ShareClient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// ─── Condition types ──────────────────────────────────────────────────────────

export type ConditionOperator = "" | "Equal To" | "Not Equal To" | "Includes" | "Is Empty" | "Is Not Empty";

export interface ShareCondition {
  id: string;
  fieldSource: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}
