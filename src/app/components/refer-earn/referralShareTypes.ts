import { ShareChannel, ShareClient, ShareLiteralRecipient } from "../webform/shareTypes";

export type PlanTier = "Starter" | "Growth" | "Scale" | "Enterprise";

export interface ReferralShareTarget {
  plan: PlanTier;
  link: string;      // currentLink
  code: string;      // currentCode
  rate: string;       // currentRate, e.g. "14%"
}

export interface ReferralShareDrawerProps {
  target: ReferralShareTarget | null;
  onClose: () => void;
  onSend?: (payload: {
    plan: PlanTier;
    channel: ShareChannel;
    clients: ShareClient[];
    literals: ShareLiteralRecipient[];
    connectedAccount?: string;
  }) => void;
}
