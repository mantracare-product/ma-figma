export type ChannelType = "whatsapp" | "sms" | "website";

export const CHANNEL_CLASSES: Record<ChannelType, string> = {
  whatsapp: "bg-green-50 border border-green-200 text-green-700",
  sms: "bg-blue-50 border border-blue-200 text-blue-700",
  website: "bg-purple-50 border border-purple-200 text-purple-700",
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  website: "Website",
};
