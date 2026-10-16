export type ChannelType = "whatsapp" | "sms" | "website";

export const CHANNEL_CLASSES: Record<ChannelType, string> = {
  whatsapp: "bg-[#ecfdf5] border border-emerald-200/60 text-[#047857]",
  sms: "bg-blue-50 border border-blue-200/60 text-[#1456f0]",
  website: "bg-slate-100 border border-slate-200/80 text-slate-700",
};

export const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  website: "Website",
};
