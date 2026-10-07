import React, { useState } from "react";
import {
  X,
  Search,
  Sparkles,
  GitBranch,
  Phone,
  MessageSquare,
  FileText,
  Database,
  Webhook,
  Zap,
  PhoneOff,
  PhoneCall,
  MessageCircle,
  Mail,
  Edit,
  UserCheck,
  Globe,
  CreditCard,
  Calendar,
  Clock,
  LayoutGrid,
  Volume2,
} from "lucide-react";

export interface StepItem {
  key: string;
  name: string;
  desc: string;
  iconKey: string;
  cats: string[];
  popular?: boolean;
}

export const ALL_WORKFLOW_STEPS: StepItem[] = [
  { key: "processmovement", name: "Move to Process / Stage", desc: "Move the record to a specific process and stage.", iconKey: "gitbranch", cats: ["all", "workflow"], popular: true },
  { key: "endworkflow", name: "End Workflow", desc: "Terminate the workflow after this step runs and mark the record as done.", iconKey: "x", cats: ["all", "workflow"], popular: false },
  { key: "scheduleappointment", name: "Schedule Appointment", desc: "Book or schedule an appointment for this client/contact.", iconKey: "calendar", cats: ["all", "records", "workflow"], popular: true },
  { key: "generate_invoice", name: "Generate Invoice", desc: "Generate invoice in Draft for appointment or record (strictly idempotent).", iconKey: "filetext", cats: ["all", "records"], popular: true },
  { key: "send_payment", name: "Send Payment", desc: "Send payment link or invoice checkout request via client's preferred channel.", iconKey: "creditcard", cats: ["all", "records", "communication"], popular: false },
  { key: "whatsapp", name: "WhatsApp", desc: "Send WhatsApp messages to contacts using pre-configured templates.", iconKey: "messagecircle", cats: ["all", "communication"], popular: true },
  { key: "sms", name: "SMS", desc: "Send SMS text messages to contacts using pre-configured templates.", iconKey: "messagesquare", cats: ["all", "communication"], popular: false },
  { key: "email", name: "Email", desc: "Send email notifications to contacts using pre-configured templates.", iconKey: "mail", cats: ["all", "communication"], popular: false },
  { key: "send-invoice", name: "Send Invoice", desc: "Send the generated invoice to the client via WhatsApp, SMS, or Email.", iconKey: "filetext", cats: ["all", "communication"], popular: false },
  { key: "fieldupdate", name: "Field Update", desc: "Update a specific field value for the contact or record.", iconKey: "edit", cats: ["all", "data"], popular: false },
  { key: "assignhuman", name: "Assign to a Human", desc: "Assign a human team member to review or handle this record.", iconKey: "usercheck", cats: ["all", "data"], popular: false },
  { key: "wh_trigger", name: "API Automation", desc: "Trigger actions in external systems using your connected API integrations.", iconKey: "globe", cats: ["all", "webhook"], popular: false },
  { key: "webhook_trigger", name: "Webhook Automation", desc: "Send an event payload to a connected webhook when this step runs.", iconKey: "webhook", cats: ["all", "webhook"], popular: false },
  { key: "callaction", name: "Transfer Call", desc: "Transfer the active AI call to a human agent or another AI agent.", iconKey: "phonecall", cats: ["all", "callerengagement"], popular: false },
  { key: "idlemessages", name: "Idle Messages", desc: "Configure messages the AI speaks when the caller has not responded.", iconKey: "messagesquare", cats: ["all", "callerengagement"], popular: false },
  { key: "callhangup", name: "Auto Hangup", desc: "Automatically end the call after the AI completes its interaction.", iconKey: "phoneoff", cats: ["all", "callerengagement"], popular: false },
];

export const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  clock: <Clock className="w-4 h-4 text-white" />,
  x: <X className="w-4 h-4 text-white" />,
  zap: <Zap className="w-4 h-4 text-white" />,
  edit: <Edit className="w-4 h-4 text-white" />,
  usercheck: <UserCheck className="w-4 h-4 text-white" />,
  phonecall: <PhoneCall className="w-4 h-4 text-white" />,
  messagecircle: <MessageCircle className="w-4 h-4 text-white" />,
  messagesquare: <MessageSquare className="w-4 h-4 text-white" />,
  mail: <Mail className="w-4 h-4 text-white" />,
  filetext: <FileText className="w-4 h-4 text-white" />,
  globe: <Globe className="w-4 h-4 text-white" />,
  calendar: <Calendar className="w-4 h-4 text-white" />,
  layoutgrid: <LayoutGrid className="w-4 h-4 text-white" />,
  gitbranch: <GitBranch className="w-4 h-4 text-white" />,
  volume2: <Volume2 className="w-4 h-4 text-white" />,
  webhook: <Webhook className="w-4 h-4 text-white" />,
  phoneoff: <PhoneOff className="w-4 h-4 text-white" />,
  creditcard: <CreditCard className="w-4 h-4 text-white" />,
};

interface StepCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStep: (step: StepItem) => void;
  title?: string;
  subtitle?: string;
}

export default function StepCatalogDrawer({
  isOpen,
  onClose,
  onSelectStep,
  title = "Add Action Step",
  subtitle = "Choose an action to add to this automation flow",
}: StepCatalogDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const categories = [
    { key: "all", icon: <Sparkles className="w-4 h-4" />, name: "All" },
    { key: "workflow", icon: <GitBranch className="w-4 h-4" />, name: "Workflow Logic" },
    { key: "records", icon: <FileText className="w-4 h-4" />, name: "Records" },
    { key: "communication", icon: <MessageSquare className="w-4 h-4" />, name: "Communication" },
    { key: "data", icon: <Database className="w-4 h-4" />, name: "Data & Assignment" },
    { key: "webhook", icon: <Webhook className="w-4 h-4" />, name: "Webhook / API" },
    { key: "callerengagement", icon: <Phone className="w-4 h-4" />, name: "Caller Engagement" },
  ];

  const filteredSteps = ALL_WORKFLOW_STEPS.filter((s) => {
    const matchesCategory = selectedCategory === "all" || s.cats.includes(selectedCategory);
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Drawer */}
      <div
        className="fixed top-0 right-0 h-screen z-50 flex flex-col bg-white border-l border-border shadow-2xl transition-transform"
        style={{ width: "55vw", minWidth: "600px", maxWidth: "900px" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-950" style={{ fontFamily: "Outfit, sans-serif" }}>
                {title}
              </h2>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action steps (e.g. invoice, appointment, whatsapp)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 bg-gray-50/50 text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
        </div>

        {/* Content Body: Sidebar + List */}
        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-56 shrink-0 border-r border-border overflow-y-auto py-2 bg-gray-50/30">
            {categories.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-3 ${
                    active
                      ? "border-blue-600 bg-blue-50/80 text-blue-700 font-semibold"
                      : "border-transparent text-gray-600 hover:bg-gray-100/60 font-medium"
                  }`}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <span className={active ? "text-blue-600" : "text-gray-400"}>{cat.icon}</span>
                  <span className="text-xs">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredSteps.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No action steps match "{searchQuery}"
              </div>
            ) : (
              filteredSteps.map((step) => (
                <button
                  key={step.key}
                  onClick={() => onSelectStep(step)}
                  className="w-full flex items-start gap-4 p-4 text-left rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    {STEP_ICON_MAP[step.iconKey] || <Zap className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {step.name}
                      </span>
                      {step.popular && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {step.desc}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
