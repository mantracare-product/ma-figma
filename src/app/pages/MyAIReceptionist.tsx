import { useState } from "react";
import { Plus, Edit, Trash2, Search, Video, Settings, FileText, ChevronRight, MessageSquare, Volume2, MessageCircle, ClipboardList, Play, ChevronDown, Info, Globe, PhoneCall, RefreshCw, Code, Sliders, Calendar, Lightbulb } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import PageHeader from "../components/layout/PageHeader";
import { toast } from "sonner";

export default function MyAIReceptionist() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState("basic-settings");
  const [expandedBasicSetting, setExpandedBasicSetting] = useState<string | null>(null);
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [greetingPhrase, setGreetingPhrase] = useState("Hi, this is Alex from Mantra Care Health, who do I have the pleasure of speaking with today?");
  const [customCommandsTab, setCustomCommandsTab] = useState<"voice" | "text">("voice");
  const [isEditingCustomCommands, setIsEditingCustomCommands] = useState(false);
  const [customCommandsPrompt, setCustomCommandsPrompt] = useState("You are an AI receptionist for Mantra Care Health Private Limited, a healthcare provider. Your role is to answer general inquiries, schedule appointments, and direct callers to the appropriate department. Be empathetic, professional, and clear. You cannot provide medical advice or diagnoses. If a caller needs urgent medical attention, advise them to contact emergency services immediately. Always confirm details before ending a call.");
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [newTextContent, setNewTextContent] = useState("");
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [showUrlSelection, setShowUrlSelection] = useState(false);
  const [foundUrls, setFoundUrls] = useState<Array<{ url: string; isMain: boolean; selected: boolean }>>([]);
  const [autoUpdateFrequency, setAutoUpdateFrequency] = useState("Weekly");
  const [transformInstructions, setTransformInstructions] = useState("");
  const [showUploadDocumentModal, setShowUploadDocumentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileTransformInstructions, setFileTransformInstructions] = useState("");
  const [showBookingRequestModal, setShowBookingRequestModal] = useState(false);
  const [bookingScenarios, setBookingScenarios] = useState([
    {
      id: 1,
      description: "Collect caller availability when they want to schedule an appointment",
      questions: [
        "What days of the week work best for you?",
        "What time of day do you prefer (morning, afternoon, evening)?",
        "Do you have any specific dates in mind?",
        "What is the reason for your appointment?"
      ],
      aiAction: "Thank the caller for providing their availability information and let them know someone will contact them within 24 hours to confirm the appointment details."
    }
  ]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  const [showEditQuestionsModal, setShowEditQuestionsModal] = useState(false);
  const [commonQuestions, setCommonQuestions] = useState("");
  const [newQuestions, setNewQuestions] = useState("");
  const [showEditLanguagesModal, setShowEditLanguagesModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [selectedVoice, setSelectedVoice] = useState({ name: "Dakota H", provider: "Eleven", badge: null });
  const [showVoiceLibraryModal, setShowVoiceLibraryModal] = useState(false);
  const [voiceLibraryTab, setVoiceLibraryTab] = useState<"voice-library" | "clone-voice">("voice-library");
  const [cloneVoiceName, setCloneVoiceName] = useState("");
  const [cloneVoiceDescription, setCloneVoiceDescription] = useState("");
  const [cloneVoiceProvider, setCloneVoiceProvider] = useState("Elevenlabs");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showTransferCallModal, setShowTransferCallModal] = useState(false);
  const [transferScenarios, setTransferScenarios] = useState([
    { id: 1, description: "", phoneNumber: "", extension: "", voiceResponse: "Please hold while I transfer your call" }
  ]);
  const [savedTransferScenarios, setSavedTransferScenarios] = useState<Array<{
    id: number;
    description: string;
    phoneNumber: string;
    extension: string;
    voiceResponse: string;
    enabled: boolean;
  }>>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [weekSchedule, setWeekSchedule] = useState([
    { day: "Monday", enabled: true, startTime: "09:00", endTime: "17:00" },
    { day: "Tuesday", enabled: true, startTime: "09:00", endTime: "17:00" },
    { day: "Wednesday", enabled: true, startTime: "09:00", endTime: "17:00" },
    { day: "Thursday", enabled: true, startTime: "09:00", endTime: "17:00" },
    { day: "Friday", enabled: true, startTime: "09:00", endTime: "17:00" },
    { day: "Saturday", enabled: false, startTime: "09:00", endTime: "17:00" },
    { day: "Sunday", enabled: false, startTime: "09:00", endTime: "17:00" }
  ]);
  const [inactiveHoursPrompt, setInactiveHoursPrompt] = useState("");
  const [showTextMessageModal, setShowTextMessageModal] = useState(false);
  const [textMessageScenarios, setTextMessageScenarios] = useState([
    { id: 1, enableShortUrls: false, description: "", textMessage: "", nextAction: "", askBeforeSending: false, attachedImage: null as File | null }
  ]);
  const [savedTextMessageScenarios, setSavedTextMessageScenarios] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    description: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
    attachedImage: File | null;
    enabled: boolean;
  }>>([]);
  const [showCollectInfoModal, setShowCollectInfoModal] = useState(false);
  const [collectInfoScenarios, setCollectInfoScenarios] = useState([
    { id: 1, triggerType: "Custom Scenario", triggerDescription: "", textMessage: "" }
  ]);
  const [savedCollectInfoScenarios, setSavedCollectInfoScenarios] = useState<Array<{
    id: number;
    triggerType: string;
    triggerDescription: string;
    textMessage: string;
    enabled: boolean;
  }>>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingEnableShortUrls, setBookingEnableShortUrls] = useState(true);
  const [bookingScenarioDescription, setBookingScenarioDescription] = useState("");
  const [bookingTextMessage, setBookingTextMessage] = useState("");
  const [bookingNextAction, setBookingNextAction] = useState("");
  const [bookingAskBeforeSending, setBookingAskBeforeSending] = useState(true);
  const [savedBookingWorkflows, setSavedBookingWorkflows] = useState<Array<{
    id: number;
    enableShortUrls: boolean;
    scenarioDescription: string;
    textMessage: string;
    nextAction: string;
    askBeforeSending: boolean;
  }>>([]);
  const [businessInfoEntries, setBusinessInfoEntries] = useState([
    {
      id: 1,
      type: "text",
      active: true,
      tokens: 165,
      content: "# About Mantra Care Health Private Limited\nMantra Care Health Private Limited is a leading healthcare provider dedicated to offering comprehensive and compassionate medical services. We strive to del...",
      processing: false
    },
    {
      id: 2,
      type: "text",
      active: true,
      tokens: 212,
      content: "# Services Offered Mantra Care Health Private Limited offers a wide range of medical services to meet the diverse needs of our patients. # # Specialties Include: * **General Medicine:** Diagnosis ...",
      processing: false
    },
    {
      id: 3,
      type: "text",
      active: true,
      tokens: 229,
      content: "# Our Process We aim to make your healthcare experience as smooth and efficient as possible. * **Appointment Scheduling:** You can schedule an appointment by calling our reception or through our o...",
      processing: false
    },
    {
      id: 4,
      type: "text",
      active: true,
      tokens: 231,
      content: "# Frequently Asked Questions (FAQs) **Q1: What are your operating hours?** A: Our clinics are typically open from Monday to Saturday, 9:00 AM to 6:00 PM. Please call to confirm specific department h...",
      processing: false
    },
    {
      id: 5,
      type: "text",
      active: true,
      tokens: 491,
      content: "# Business Information **Business Name:** Mantra Care Health Private Limited **Phone:** 918700086169 **Address:** - Address 1: **Business Hours:** - Monday: 9:00 AM - 6:00 PM | Open: true - Tuesd...",
      processing: false
    }
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <PageHeader title="My AI Receptionist" />

      <div className="py-6 px-[150px]">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary">
              New Campaign
            </Button>
            <Button variant="primary">
              Train Agent
            </Button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="bg-white rounded-xl border border-border overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white shadow-lg flex items-center justify-center">
              <Video className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
              AI Receptionist Preview
            </h3>
            <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              Your AI receptionist video will appear here
            </p>
          </div>
        </div>

        {/* Commands & Business Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6">
          {/* Commands Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Commands</h3>
            </div>
            <p className="text-sm leading-relaxed flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              You are an AI receptionist for Mantra Care Health Private Limited, a healthcare provider. Your role is to answer general inquiries, schedule appointments, and direct callers to the appropriate de...
            </p>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Business Info Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Business Info</h3>
            </div>
            <p className="text-sm leading-relaxed flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              # About Mantra Care Health Private Limited
              Mantra Care Health Private Limited is a leading...
              <br /><br />
              # Services Offered Mantra Care Health Private Limited offers a wide range of medical services t...
            </p>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Greeting Phrase Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Greeting Phrase</h3>
            </div>
            <p className="text-sm leading-relaxed flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              Hi, this is Alex from Mantra Care Health, who do I have the pleasure of speaking with today?
            </p>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Voice</h3>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Dakota H</p>
                <button className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <Play className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                <span className="px-2 py-1 bg-blue-50 rounded text-blue-600">Female</span>
                <span className="px-2 py-1 bg-blue-50 rounded text-blue-600">English US as</span>
                <span className="px-2 py-1 bg-blue-50 rounded text-blue-600">English</span>
              </div>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Send Text Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Send Text</h3>
            </div>
            <div className="text-sm leading-relaxed flex-1 space-y-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              <p>When the customer asks to book an appointment.</p>
              <p>When the customer asks about accepted insurance plans.</p>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Intake Questions Card */}
          <div className="bg-white rounded-xl p-6 border border-border flex flex-col h-[280px]">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Intake Questions</h3>
            </div>
            <div className="text-sm leading-relaxed flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
              <p className="mb-2">When customer asks to schedule an appointment.</p>
              <ul className="list-disc list-inside space-y-1">
                <li>What is your full name?</li>
                <li>What is the reason for your visit or whi...</li>
              </ul>
            </div>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              EDIT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabbed Settings Section */}
        <div className="mt-8 space-y-2">
          {/* Basic Settings */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "basic-settings" ? "" : "basic-settings")}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Basic Settings</h3>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedSection === "basic-settings" ? "rotate-180" : ""}`} style={{ color: '#64748B' }} />
            </button>
            {expandedSection === "basic-settings" && (
              <div className="px-6 pb-6 space-y-2">
                {/* Greeting Phrase */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "greeting-phrase" ? null : "greeting-phrase")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Greeting Phrase</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "greeting-phrase" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "greeting-phrase" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          This is the opening line your receptionist will use when answering the phone.
                        </p>
                      </div>

                      {/* Greeting Phrases Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Greeting Phrases</h3>
                          {!isEditingGreeting && (
                            <button
                              onClick={() => setIsEditingGreeting(true)}
                              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>English</p>
                          {isEditingGreeting ? (
                            <div className="space-y-3">
                              <textarea
                                value={greetingPhrase}
                                onChange={(e) => setGreetingPhrase(e.target.value)}
                                className="w-full p-4 bg-white rounded-lg border border-border resize-none h-24"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="primary"
                                  onClick={() => {
                                    setIsEditingGreeting(false);
                                    toast.success("Greeting phrase saved successfully");
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setGreetingPhrase("Hi, this is Alex from Mantra Care Health, who do I have the pleasure of speaking with today?");
                                    setIsEditingGreeting(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                {greetingPhrase}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Commands */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "custom-commands" ? null : "custom-commands")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Custom Commands</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "custom-commands" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "custom-commands" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Customize prompts for your AI Receptionist – separate prompts for voice calls and Text conversations.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Side - Tabs and Content */}
                        <div>
                          {/* Voice/Text Tabs */}
                          <div className="border-b border-border mb-4">
                            <div className="flex gap-6">
                              <button
                                onClick={() => setCustomCommandsTab("voice")}
                                className={`pb-3 px-1 border-b-2 transition-colors ${
                                  customCommandsTab === "voice"
                                    ? "border-primary text-primary font-medium"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                Voice
                              </button>
                              <button
                                onClick={() => setCustomCommandsTab("text")}
                                className={`pb-3 px-1 border-b-2 transition-colors ${
                                  customCommandsTab === "text"
                                    ? "border-primary text-primary font-medium"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                Text
                              </button>
                            </div>
                          </div>

                          {/* Content Area */}
                          <div>
                            {!isEditingCustomCommands && (
                              <div className="flex justify-end mb-3">
                                <button
                                  onClick={() => setIsEditingCustomCommands(true)}
                                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                              </div>
                            )}

                            {isEditingCustomCommands ? (
                              <div className="space-y-3">
                                <textarea
                                  value={customCommandsPrompt}
                                  onChange={(e) => setCustomCommandsPrompt(e.target.value)}
                                  className="w-full p-4 bg-white rounded-lg border border-border resize-none h-48"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="primary"
                                    onClick={() => {
                                      setIsEditingCustomCommands(false);
                                      toast.success("Custom commands saved successfully");
                                    }}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setCustomCommandsPrompt("You are an AI receptionist for Mantra Care Health Private Limited, a healthcare provider. Your role is to answer general inquiries, schedule appointments, and direct callers to the appropriate department. Be empathetic, professional, and clear. You cannot provide medical advice or diagnoses. If a caller needs urgent medical attention, advise them to contact emergency services immediately. Always confirm details before ending a call.");
                                      setIsEditingCustomCommands(false);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                {customCommandsTab === "text" ? (
                                  <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    Using the default prompt. Click Edit to customize the text prompt.
                                  </p>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    {customCommandsPrompt}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Demo Video */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Custom Commands Demo</span>
                          </div>
                          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl aspect-video flex items-center justify-center">
                            <div className="text-center text-white">
                              <Play className="w-16 h-16 mx-auto mb-2 opacity-70" />
                              <p className="text-sm opacity-70" style={{ fontFamily: 'Outfit, sans-serif' }}>Demo video placeholder</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Business Information */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "business-information" ? null : "business-information")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Business Information</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "business-information" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "business-information" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Provide necessary information to AI using simple text, website URL or documents.
                        </p>
                      </div>

                      {/* Description and Actions */}
                      <div className="mb-4">
                        <p className="text-sm mb-4" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Provide your business information through text, website URLs, or documents. Your AI can automatically refresh data from website links periodically.
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => setShowAddTextModal(true)}>
                              <Plus className="w-4 h-4" />
                              Add Text
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAddWebsiteModal(true)}>
                              <Globe className="w-4 h-4" />
                              Add Website URL
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                              <FileText className="w-4 h-4" />
                              Upload Document
                            </Button>
                            <input
                              id="file-upload"
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedFile(file);
                                  setShowUploadDocumentModal(true);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>1k / 52k tokens</span>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="w-4 h-4" />
                              Refresh
                            </Button>
                          </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search knowledge base entries..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>

                      {/* Business Info Entries Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {businessInfoEntries.map((entry) => (
                          <div key={entry.id} className="p-4 bg-white rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  {entry.type === "link" ? "Link" : entry.type === "file" ? "File" : "Text"}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={entry.active}
                                    onChange={() => {
                                      setBusinessInfoEntries(businessInfoEntries.map(e =>
                                        e.id === entry.id ? { ...e, active: !e.active } : e
                                      ));
                                    }}
                                  />
                                  <div className="w-9 h-5 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <span className="text-xs font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>Active</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEntryToDelete(entry.id);
                                  setShowDeleteConfirmModal(true);
                                }}
                                className="text-destructive hover:text-destructive/80 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {!entry.processing && (
                              <div className="mb-2">
                                <span className="px-2 py-1 text-xs rounded bg-green-50 text-green-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  Tokens consumed: {entry.tokens}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Content:</p>
                              {entry.processing ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>Processing</span>
                                  <Tooltip text="The AI is working on generating relevant data from your given resource. This can take 3-5 minutes depending on the amount of data. You'll be able to see it here once done. Click on the status button to check the status." placement="top">
                                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                  </Tooltip>
                                </div>
                              ) : (
                                <p className="text-xs line-clamp-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                  {entry.content}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Common Questions */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "common-questions" ? null : "common-questions")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Common Questions</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "common-questions" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "common-questions" && (
                    <div className="p-6 border-t border-border">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div>
                          {/* Info Message */}
                          <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Frequently asked questions that your AI Receptionist can reference.
                            </p>
                          </div>

                          {/* Display Saved Questions */}
                          {commonQuestions && (
                            <div className="space-y-4">
                              {commonQuestions.split('\n\n').filter(block => block.trim()).map((block, index) => {
                                const lines = block.split('\n').filter(line => line.trim());
                                const questionLine = lines.find(line => line.toLowerCase().startsWith('question:'));
                                const answerLine = lines.find(line => line.toLowerCase().startsWith('answer:'));

                                if (questionLine && answerLine) {
                                  return (
                                    <div key={index} className="text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      <p style={{ color: '#020817' }}>
                                        <span className="font-semibold">Question:</span> {questionLine.replace(/^question:\s*/i, '')}
                                      </p>
                                      <p style={{ color: '#020817' }}>
                                        <span className="font-semibold">Answer:</span> {answerLine.replace(/^answer:\s*/i, '')}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div>
                          {/* Common Questions Demo */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <h3 className="font-semibold text-sm" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                Common Questions Demo
                              </h3>
                            </div>
                            <div className="bg-white rounded-xl border border-border overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white shadow-lg flex items-center justify-center">
                                  <Play className="w-8 h-8 text-primary ml-1" />
                                </div>
                                <p className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                  Common Questions Demo Video
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Edit Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => setShowEditQuestionsModal(true)}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-blue-50 rounded-lg transition-colors"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "languages" ? null : "languages")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Languages</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "languages" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "languages" && (
                    <div className="p-6 border-t border-border">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div>
                          {/* Info Message */}
                          <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Turn your AI Receptionist into a multi-lingual superstar.
                            </p>
                          </div>

                          {/* Selected Languages Display */}
                          {selectedLanguages.length > 0 && (
                            <div>
                              <h3 className="font-semibold text-sm mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                Selected Languages
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedLanguages.map((language) => (
                                  <span
                                    key={language}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    {language}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div>
                          {/* Languages Demo */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <h3 className="font-semibold text-sm" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                Languages Demo
                              </h3>
                            </div>
                            <div className="bg-white rounded-xl border border-border overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white shadow-lg flex items-center justify-center">
                                  <Play className="w-8 h-8 text-primary ml-1" />
                                </div>
                                <p className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                  Languages Demo Video
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Edit Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => setShowEditLanguagesModal(true)}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-blue-50 rounded-lg transition-colors"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Choose Voice */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "choose-voice" ? null : "choose-voice")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Choose Voice</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "choose-voice" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "choose-voice" && (
                    <div className="p-6 border-t border-border">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div>
                          {/* Info Message */}
                          <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Choose the voice your AI Receptionist will use when answering the phone.
                            </p>
                          </div>

                          {/* Selected Voice */}
                          <div className="mb-6">
                            <h3 className="font-semibold text-sm mb-3" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                              Selected English Voice
                            </h3>
                            <div className="p-4 bg-white rounded-lg border border-border">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                  {selectedVoice.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                      {selectedVoice.name}
                                    </p>
                                    {selectedVoice.badge && (
                                      <span className="px-2 py-0.5 text-xs font-bold rounded" style={{
                                        backgroundColor: selectedVoice.badge === 'LIT' ? '#FF6B6B' : '#9D4EDD',
                                        color: 'white',
                                        fontFamily: 'Outfit, sans-serif'
                                      }}>
                                        {selectedVoice.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                    {selectedVoice.provider}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg flex items-center justify-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Selected
                                </button>
                                <button className="px-4 py-2 text-sm font-medium text-primary bg-white border border-border rounded-lg flex items-center gap-2 hover:bg-muted/30 transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                  <Play className="w-4 h-4" />
                                  Preview
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div>
                          {/* Voice Library Demo */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Volume2 className="w-4 h-4 text-muted-foreground" />
                              <h3 className="font-semibold text-sm" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                Voice Library Demo
                              </h3>
                            </div>
                            <div className="bg-white rounded-xl border border-border overflow-hidden aspect-video flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white shadow-lg flex items-center justify-center">
                                  <Play className="w-8 h-8 text-primary ml-1" />
                                </div>
                                <p className="text-sm font-medium" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                  Voice Library Demo Video
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Featured Voices - Full Width */}
                      <div className="mt-6">
                        <h3 className="font-semibold text-sm mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                          Featured Voices
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          {[
                            { name: "Cassidy-English", badge: "STS", recommended: true, active: true },
                            { name: "Dakota Flash V2", badge: "STS", recommended: true, active: false },
                            { name: "Luna", badge: null, recommended: false, active: false },
                            { name: "Astra", badge: null, recommended: false, active: false },
                            { name: "Mark", badge: "STS", recommended: true, active: false },
                            { name: "Jessica", badge: "STS", recommended: true, active: false }
                          ].map((voice) => {
                            const isSelected = selectedVoice.name === voice.name;
                            return (
                              <div key={voice.name} className="p-4 bg-white rounded-lg border border-border">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    {voice.name.split(/[\s-]/)[0].substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-sm" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                        {voice.name}
                                      </p>
                                      {voice.badge && (
                                        <span className="px-2 py-0.5 text-xs font-bold rounded" style={{
                                          backgroundColor: '#9D4EDD',
                                          color: 'white',
                                          fontFamily: 'Outfit, sans-serif'
                                        }}>
                                          {voice.badge}
                                        </span>
                                      )}
                                      {isSelected && (
                                        <svg className="w-5 h-5 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                    {voice.recommended && (
                                      <p className="text-xs text-green-600 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Recommended
                                      </p>
                                    )}
                                    {voice.active && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <p className="text-xs text-green-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                          Active
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected ? (
                                    <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg flex items-center justify-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Selected
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedVoice({ name: voice.name, provider: "Eleven", badge: voice.badge })}
                                      className="flex-1 px-4 py-2 text-sm font-medium text-primary bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                                      </svg>
                                      Select
                                    </button>
                                  )}
                                  <button className="px-4 py-2 text-sm font-medium text-primary bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    <Play className="w-4 h-4" />
                                    Preview
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => setShowVoiceLibraryModal(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            Explore All Voices
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* In-Call Actions */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "in-call-actions" ? "" : "in-call-actions")}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>In-Call Actions</h3>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSection === "in-call-actions" ? "rotate-180" : ""}`} />
            </button>
            {expandedSection === "in-call-actions" && (
              <div className="px-6 pb-6 space-y-2">
                {/* Transfer Call */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "transfer-call" ? null : "transfer-call")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PhoneCall className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Transfer Call</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "transfer-call" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "transfer-call" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Teach your AI Receptionist how to intelligently transfer the call.
                        </p>
                      </div>

                      {/* Audio Player */}
                      <div className="mb-6">
                        <p className="text-sm mb-3 text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Listen to how our AI transfers calls professionally
                        </p>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
                          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors">
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div className="h-full w-0 bg-primary rounded-full"></div>
                          </div>
                          <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>0:00</span>
                        </div>
                      </div>

                      {/* Saved Scenarios or No Data State */}
                      {savedTransferScenarios.length > 0 ? (
                        <div className="space-y-4">
                          {savedTransferScenarios.map((scenario, index) => (
                            <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Scenario {index + 1}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={scenario.enabled}
                                      onChange={() => {
                                        const newScenarios = [...savedTransferScenarios];
                                        newScenarios[index].enabled = !newScenarios[index].enabled;
                                        setSavedTransferScenarios(newScenarios);
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                  <span className="text-xs font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.enabled ? 'On' : 'Off'}
                                  </span>
                                  <button className="p-2 text-destructive hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTransferScenarios(savedTransferScenarios.map((s, i) => ({
                                        ...s,
                                        id: i + 1
                                      })));
                                      setShowTransferCallModal(true);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Edit className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowAvailabilityModal(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Settings className="w-3 h-3" />
                                    Availability
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {/* Scenario Description */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Scenario Description
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.description}
                                  </p>
                                </div>

                                {/* Phone Number */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Phone Number
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    +1 {scenario.phoneNumber}
                                  </p>
                                </div>

                                {/* Voice Response */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Voice Response
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.voiceResponse}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Button */}
                          <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                              onClick={() => setShowTransferCallModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm mb-6" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>No data</p>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setShowTransferCallModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Send Text Message */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "send-text-message" ? null : "send-text-message")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Send Text Message</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "send-text-message" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "send-text-message" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Teach your AI Receptionist how to intelligently send text messages.
                        </p>
                      </div>

                      {/* Audio Player */}
                      <div className="mb-6">
                        <p className="text-sm mb-3 text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Listen to how our AI sends text messages professionally
                        </p>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
                          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors">
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div className="h-full w-0 bg-primary rounded-full"></div>
                          </div>
                          <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>0:00</span>
                        </div>
                      </div>

                      {/* Saved Scenarios or No Data State */}
                      {savedTextMessageScenarios.length > 0 ? (
                        <div className="space-y-4">
                          {savedTextMessageScenarios.map((scenario, index) => (
                            <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Scenario {index + 1}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={scenario.enabled}
                                      onChange={() => {
                                        const newScenarios = [...savedTextMessageScenarios];
                                        newScenarios[index].enabled = !newScenarios[index].enabled;
                                        setSavedTextMessageScenarios(newScenarios);
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                  <span className="text-xs font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.enabled ? 'On' : 'Off'}
                                  </span>
                                  <button className="p-2 text-destructive hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTextMessageScenarios(savedTextMessageScenarios.map((s, i) => ({
                                        ...s,
                                        id: i + 1
                                      })));
                                      setShowTextMessageModal(true);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Edit className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowAvailabilityModal(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Settings className="w-3 h-3" />
                                    Availability
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {/* Enable Short URLs */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Enable Short URLs
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.enableShortUrls ? 'Enabled' : 'Disabled'}
                                  </p>
                                </div>

                                {/* Scenario Description */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Scenario Description
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.description}
                                  </p>
                                </div>

                                {/* Text Message */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Text Message
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.textMessage}
                                  </p>
                                </div>

                                {/* What should AI do next */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      What should AI do next?
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.nextAction}
                                  </p>
                                </div>

                                {/* Ask before sending Text SMS */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Ask before sending Text SMS
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.askBeforeSending ? 'Yes' : 'No'}
                                  </p>
                                </div>

                                {/* Attached Image */}
                                {scenario.attachedImage && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Attached Image
                                      </p>
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      {scenario.attachedImage.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Add Button */}
                          <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                              onClick={() => setShowTextMessageModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm mb-6" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>No data</p>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setShowTextMessageModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Collect Information */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "collect-information" ? null : "collect-information")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Collect Information (Intake Form)</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "collect-information" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "collect-information" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Teach your AI Receptionist how to intelligently collect information.
                        </p>
                      </div>

                      {/* Audio Player */}
                      <div className="mb-6">
                        <p className="text-sm mb-3 text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Listen to how our AI collects information professionally
                        </p>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
                          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors">
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                          <div className="flex-1 h-1 bg-gray-200 rounded-full">
                            <div className="h-full w-0 bg-primary rounded-full"></div>
                          </div>
                          <span className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>0:00</span>
                        </div>
                      </div>

                      {/* Saved Scenarios or No Data State */}
                      {savedCollectInfoScenarios.length > 0 ? (
                        <div className="space-y-4">
                          {savedCollectInfoScenarios.map((scenario, index) => (
                            <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                  Scenario {index + 1}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={scenario.enabled}
                                      onChange={() => {
                                        const newScenarios = [...savedCollectInfoScenarios];
                                        newScenarios[index].enabled = !newScenarios[index].enabled;
                                        setSavedCollectInfoScenarios(newScenarios);
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-muted peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  </label>
                                  <span className="text-xs font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.enabled ? 'On' : 'Off'}
                                  </span>
                                  <button className="p-2 text-destructive hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCollectInfoScenarios(savedCollectInfoScenarios.map((s, i) => ({
                                        ...s,
                                        id: i + 1
                                      })));
                                      setShowCollectInfoModal(true);
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Edit className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowAvailabilityModal(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Settings className="w-3 h-3" />
                                    Availability
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {/* Trigger Type */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Trigger Type
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.triggerType}
                                  </p>
                                </div>

                                {/* Trigger Description */}
                                {scenario.triggerType === "Custom Scenario" && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Trigger Description
                                      </p>
                                      <Info className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      {scenario.triggerDescription}
                                    </p>
                                  </div>
                                )}

                                {/* Text Message */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                      Text Message
                                    </p>
                                    <Info className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    {scenario.textMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Button */}
                          <div className="flex items-center justify-center gap-4 pt-4">
                            <button
                              onClick={() => setShowCollectInfoModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm mb-6" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>No data</p>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setShowCollectInfoModal(true)}
                              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                            <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              <ChevronRight className="w-4 h-4" />
                              Learn More
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Schedule an Appointment */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedBasicSetting(expandedBasicSetting === "schedule-appointment" ? null : "schedule-appointment")}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>Schedule an Appointment</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Recommended</span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedBasicSetting === "schedule-appointment" ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expandedBasicSetting === "schedule-appointment" && (
                    <div className="p-6 border-t border-border">
                      {/* Info Message */}
                      <div className="flex items-start gap-2 mb-6">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full border border-gray-400"></div>
                        </div>
                        <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Integrate with Calendar for real-time appointment scheduling.
                        </p>
                      </div>

                      {/* Heading */}
                      <h3 className="text-lg font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Choose your Appointment Booking Method
                      </h3>
                      <p className="text-sm mb-6" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Select how you'd like to handle appointment scheduling with your callers
                      </p>

                      {/* Booking Method Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Text Booking Link */}
                        <div className="border border-border rounded-lg p-6 flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <MessageCircle className="w-6 h-6 text-blue-600" />
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              recommended
                            </span>
                          </div>
                          <h4 className="font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Text Booking Link
                          </h4>
                          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            Automatically send your calendar booking link via text message to callers who want to schedule appointments
                          </p>
                          <button
                            onClick={() => setShowBookingModal(true)}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            Setup
                          </button>
                        </div>

                        {/* Collect Booking Request */}
                        <div className="border border-border rounded-lg p-6 flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <ClipboardList className="w-6 h-6 text-blue-600" />
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              recommended
                            </span>
                          </div>
                          <h4 className="font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Collect Booking Request
                          </h4>
                          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            AI collects caller availability and preferences, then creates a booking request that a human can review and manually schedule later
                          </p>
                          <button
                            onClick={() => setShowBookingRequestModal(true)}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            Setup
                          </button>
                        </div>

                        {/* Schedule Over Phone */}
                        <div className="border border-border rounded-lg p-6 flex flex-col">
                          <div className="flex items-start justify-between mb-3">
                            <Calendar className="w-6 h-6 text-blue-600" />
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              beta
                            </span>
                          </div>
                          <h4 className="font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                            Schedule Over Phone
                          </h4>
                          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                            AI assistant books appointments directly during the call using your connected calendar system
                          </p>
                          <button className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Setup
                          </button>
                        </div>
                      </div>

                      {/* Book Appointments Section */}
                      {savedBookingWorkflows.length > 0 && (
                        <div className="mt-8">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                Book Appointments
                              </h3>
                              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                Manage how your AI handles appointment scheduling
                              </p>
                            </div>
                            <button
                              onClick={() => setShowBookingModal(true)}
                              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <Plus className="w-4 h-4" />
                              Add New Workflow
                            </button>
                          </div>

                          {/* Workflows */}
                          <div className="space-y-4 mt-4">
                            {savedBookingWorkflows.map((workflow, index) => (
                              <div key={workflow.id} className="border border-border rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                    Workflow {index + 1}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <button className="px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-blue-50 transition-colors">
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSavedBookingWorkflows(savedBookingWorkflows.filter(w => w.id !== workflow.id));
                                        toast.success("Workflow deleted successfully");
                                      }}
                                      className="px-3 py-1.5 text-sm font-medium text-destructive border border-destructive rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {/* Enable Short URLs */}
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    Enable Short URLs
                                  </p>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={workflow.enableShortUrls}
                                      readOnly
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary pointer-events-none"></div>
                                  </label>
                                </div>

                                {/* Scenario Description */}
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    Scenario Description
                                  </p>
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      {workflow.scenarioDescription}
                                    </p>
                                  </div>
                                </div>

                                {/* Text Message */}
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    Text Message
                                  </p>
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      {workflow.textMessage}
                                    </p>
                                  </div>
                                </div>

                                {/* What should the AI do next? */}
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    What should the AI do next?
                                  </p>
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                      {workflow.nextAction}
                                    </p>
                                  </div>
                                </div>

                                {/* Ask before sending Text SMS */}
                                <div>
                                  <p className="text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                                    Ask before sending Text SMS
                                  </p>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={workflow.askBeforeSending}
                                      readOnly
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary pointer-events-none"></div>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* After-Call Actions */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "after-call-actions" ? "" : "after-call-actions")}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>After-Call Actions</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Developer Automations */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "developer-automations" ? "" : "developer-automations")}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Code className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Developer Automations</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "advanced-settings" ? "" : "advanced-settings")}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>Advanced Settings</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Add Text Knowledge Base Modal */}
        {showAddTextModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Add Text Knowledge Base
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddTextModal(false);
                    setNewTextContent("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="relative">
                  <textarea
                    value={newTextContent}
                    onChange={(e) => setNewTextContent(e.target.value)}
                    placeholder="Enter your business information"
                    className="w-full p-4 bg-white border border-border rounded-lg resize-none h-80"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                    maxLength={100000}
                  />
                  <div className="absolute bottom-3 right-3 text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    {newTextContent.length} / 100000
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddTextModal(false);
                    setNewTextContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (newTextContent.trim()) {
                      const newEntry = {
                        id: businessInfoEntries.length + 1,
                        type: "text",
                        active: true,
                        tokens: Math.floor(newTextContent.length / 4), // Rough estimate
                        content: newTextContent
                      };
                      setBusinessInfoEntries([...businessInfoEntries, newEntry]);
                      setShowAddTextModal(false);
                      setNewTextContent("");
                      toast.success("Text knowledge base added successfully");
                    } else {
                      toast.error("Please enter some content");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Website URL Modal */}
        {showAddWebsiteModal && !showUrlSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    {isCrawling ? "Crawling Website URL" : "Crawl Website URL"}
                  </h2>
                </div>
                {!isCrawling && (
                  <button
                    onClick={() => {
                      setShowAddWebsiteModal(false);
                      setWebsiteUrl("");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-45" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {isCrawling ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-sm text-center" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Crawling website, please wait...
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isCrawling && (
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddWebsiteModal(false);
                      setWebsiteUrl("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (websiteUrl.trim()) {
                        setIsCrawling(true);
                        // Simulate crawling
                        setTimeout(() => {
                          setIsCrawling(false);
                          setFoundUrls([
                            { url: `${websiteUrl}/settings`, isMain: true, selected: false },
                            { url: `${websiteUrl}/settings`, isMain: false, selected: false }
                          ]);
                          setShowUrlSelection(true);
                        }, 2000);
                      } else {
                        toast.error("Please enter a website URL");
                      }
                    }}
                  >
                    Crawl
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* URL Selection Modal */}
        {showUrlSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Select URLs to Add
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowUrlSelection(false);
                    setShowAddWebsiteModal(false);
                    setWebsiteUrl("");
                    setFoundUrls([]);
                    setTransformInstructions("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Info Message */}
                <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                      Select URLs to add to Knowledge Base
                    </p>
                    <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Choose which URLs contain the most relevant information for your business. You can select multiple URLs. It is recommended to specify sub-pages of your website instead of the main page. For example,{' '}
                      <a href="#" className="text-primary underline">https://www.bbc.com/sport</a> instead of{' '}
                      <a href="#" className="text-primary underline">https://www.bbc.com</a>.
                    </p>
                  </div>
                </div>

                {/* Found URLs */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                      Found URLs ({foundUrls.length})
                    </h3>
                    <span className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Selected: {foundUrls.filter(u => u.selected).length}/{foundUrls.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {foundUrls.map((urlItem, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={urlItem.selected}
                          onChange={(e) => {
                            setFoundUrls(foundUrls.map((u, i) =>
                              i === index ? { ...u, selected: e.target.checked } : u
                            ));
                          }}
                          className="w-4 h-4 text-primary border-border rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                              {urlItem.url}
                            </span>
                            {urlItem.isMain && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Main URL
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-Update Frequency */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2 text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Auto-Update Frequency
                  </label>
                  <select
                    value={autoUpdateFrequency}
                    onChange={(e) => setAutoUpdateFrequency(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-border rounded-lg"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Never">Never</option>
                  </select>
                </div>

                {/* Transform Instructions */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Transform Instructions
                    </label>
                    <Tooltip
                      text="Specify how the AI should process this content. You can instruct it to extract specific parts, ignore certain sections, or limit the amount of data extracted. Example: 'Ignore everything except pricing' 'Ignore FAQ section'"
                      placement="top"
                    >
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </div>
                  <textarea
                    value={transformInstructions}
                    onChange={(e) => setTransformInstructions(e.target.value)}
                    placeholder="Optional: Provide instructions on how to extract or transform the content."
                    className="w-full p-4 bg-white border border-border rounded-lg resize-none h-24"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUrlSelection(false);
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const selectedUrls = foundUrls.filter(u => u.selected);
                    if (selectedUrls.length > 0) {
                      const newEntries = selectedUrls.map((urlItem, index) => ({
                        id: businessInfoEntries.length + index + 1,
                        type: "link",
                        active: true,
                        tokens: 0,
                        content: urlItem.url,
                        processing: true,
                        autoUpdate: autoUpdateFrequency,
                        transformInstructions: transformInstructions
                      }));
                      setBusinessInfoEntries([...businessInfoEntries, ...newEntries]);
                      setShowUrlSelection(false);
                      setShowAddWebsiteModal(false);
                      setWebsiteUrl("");
                      setFoundUrls([]);
                      setTransformInstructions("");
                      toast.success(`${selectedUrls.length} URL(s) added successfully`);
                    } else {
                      toast.error("Please select at least one URL");
                    }
                  }}
                >
                  Add Selected URLs
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Document Modal */}
        {showUploadDocumentModal && selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Upload Document
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowUploadDocumentModal(false);
                    setSelectedFile(null);
                    setFileTransformInstructions("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Ready to Upload Info */}
                <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                      Ready to Upload
                    </p>
                    <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Selected file: {selectedFile.name}
                    </p>
                  </div>
                </div>

                {/* Transform Instructions */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Transform Instructions
                    </label>
                    <Tooltip
                      text="Specify how the AI should process this content. You can instruct it to extract specific parts, ignore certain sections, or limit the amount of data extracted. Example: 'Ignore everything except pricing' 'Ignore FAQ section'"
                      placement="top"
                    >
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </div>
                  <textarea
                    value={fileTransformInstructions}
                    onChange={(e) => setFileTransformInstructions(e.target.value)}
                    placeholder="Optional: Provide instructions on how to extract or transform the content."
                    className="w-full p-4 bg-white border border-border rounded-lg resize-none h-24"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDocumentModal(false);
                    setSelectedFile(null);
                    setFileTransformInstructions("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const newEntry = {
                      id: businessInfoEntries.length + 1,
                      type: "file",
                      active: true,
                      tokens: 0,
                      content: selectedFile.name,
                      processing: true,
                      transformInstructions: fileTransformInstructions
                    };
                    setBusinessInfoEntries([...businessInfoEntries, newEntry]);
                    setShowUploadDocumentModal(false);
                    setSelectedFile(null);
                    setFileTransformInstructions("");
                    toast.success("Document uploaded successfully");
                  }}
                >
                  Upload
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Booking Request Workflow Modal */}
        {showBookingRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                  Add Booking Request Workflow
                </h2>
                <button
                  onClick={() => setShowBookingRequestModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {bookingScenarios.map((scenario, scenarioIndex) => (
                  <div key={scenario.id} className="mb-6">
                    <h3 className="font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                      Booking Request Scenario {scenarioIndex + 1}
                    </h3>

                    {/* Scenario Description */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Scenario Description
                        </label>
                        <Tooltip text="Describe when this booking scenario should be triggered" placement="top">
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </Tooltip>
                      </div>
                      <textarea
                        value={scenario.description}
                        onChange={(e) => {
                          const updated = [...bookingScenarios];
                          updated[scenarioIndex].description = e.target.value;
                          setBookingScenarios(updated);
                        }}
                        className="w-full p-3 bg-white border border-border rounded-lg resize-none"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                        rows={2}
                      />
                    </div>

                    {/* Questions */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Questions
                        </label>
                        <Tooltip text="Questions the AI will ask to collect booking information" placement="top">
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="space-y-2">
                        {scenario.questions.map((question, questionIndex) => (
                          <div key={questionIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={question}
                              onChange={(e) => {
                                const updated = [...bookingScenarios];
                                updated[scenarioIndex].questions[questionIndex] = e.target.value;
                                setBookingScenarios(updated);
                              }}
                              className="flex-1 px-3 py-2 bg-white border border-border rounded-lg"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                              placeholder="Enter question"
                            />
                            <button
                              onClick={() => {
                                const updated = [...bookingScenarios];
                                updated[scenarioIndex].questions.splice(questionIndex, 1);
                                setBookingScenarios(updated);
                              }}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...bookingScenarios];
                            updated[scenarioIndex].questions.push("");
                            setBookingScenarios(updated);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-primary border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          + Add Question
                        </button>
                      </div>
                    </div>

                    {/* What should the AI do next? */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          What should the AI do next?
                        </label>
                        <Tooltip text="Instructions for what the AI should say after collecting the information" placement="top">
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </Tooltip>
                      </div>
                      <textarea
                        value={scenario.aiAction}
                        onChange={(e) => {
                          const updated = [...bookingScenarios];
                          updated[scenarioIndex].aiAction = e.target.value;
                          setBookingScenarios(updated);
                        }}
                        className="w-full p-3 bg-white border border-border rounded-lg resize-none"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}

                {/* Add Another Booking Scenario */}
                <button
                  onClick={() => {
                    setBookingScenarios([
                      ...bookingScenarios,
                      {
                        id: bookingScenarios.length + 1,
                        description: "",
                        questions: [""],
                        aiAction: ""
                      }
                    ]);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-primary border border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  + Add Another Booking Scenario
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingRequestModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowBookingRequestModal(false);
                    toast.success("Booking request workflow saved successfully");
                  }}
                >
                  Add Booking Request Workflow
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Confirm Delete
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setEntryToDelete(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                  Are you sure you want to delete this from your Business Information?
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setEntryToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (entryToDelete !== null) {
                      setBusinessInfoEntries(businessInfoEntries.filter(e => e.id !== entryToDelete));
                      toast.success("Entry deleted successfully");
                    }
                    setShowDeleteConfirmModal(false);
                    setEntryToDelete(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Common Questions Modal */}
        {showEditQuestionsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Edit Common Questions
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditQuestionsModal(false);
                    setNewQuestions("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Textarea */}
                <textarea
                  value={newQuestions}
                  onChange={(e) => setNewQuestions(e.target.value)}
                  placeholder="Please enter your Q&A"
                  className="w-full p-4 bg-white border border-border rounded-lg resize-none h-64 mb-4"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                />

                {/* Please Note Section */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-sm mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Please Note:
                  </p>
                  <p className="text-sm mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    Please write your questions and answers in separate paragraphs using the following format:
                  </p>
                  <div className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    <div className="mb-4">
                      <p>
                        <span className="font-medium text-blue-600">Question:</span> Where are you located?
                      </p>
                      <p>
                        <span className="font-medium text-blue-600">Answer:</span> We are located at 132 Linkin Park, New York.
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-medium text-blue-600">Question:</span> How many other branches do you have?
                      </p>
                      <p>
                        <span className="font-medium text-blue-600">Answer:</span> We don't have any subsidiary branches.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (newQuestions.trim()) {
                      const updatedQuestions = commonQuestions
                        ? commonQuestions + '\n\n' + newQuestions
                        : newQuestions;
                      setCommonQuestions(updatedQuestions);
                      setNewQuestions("");
                      toast.success("Common questions added successfully");
                    }
                    setShowEditQuestionsModal(false);
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Languages Modal */}
        {showEditLanguagesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Edit Languages
                  </h2>
                </div>
                <button
                  onClick={() => setShowEditLanguagesModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-3">
                  {[
                    "English", "Spanish", "French", "German", "Italian", "Portuguese",
                    "Dutch", "Russian", "Arabic", "Hindi", "Chinese", "Japanese",
                    "Korean", "Vietnamese", "Thai", "Indonesian"
                  ].map((language) => (
                    <label
                      key={language}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLanguages.includes(language)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLanguages([...selectedLanguages, language]);
                          } else {
                            setSelectedLanguages(selectedLanguages.filter(l => l !== language));
                          }
                        }}
                        className="w-4 h-4 text-primary border-border rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                        {language}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowEditLanguagesModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowEditLanguagesModal(false);
                    toast.success("Languages updated successfully");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Voice Library Modal */}
        {showVoiceLibraryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Voice Library
                  </h2>
                  <button
                    onClick={() => setShowVoiceLibraryModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVoiceLibraryTab("voice-library")}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        voiceLibraryTab === "voice-library"
                          ? "bg-gray-100 text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <Volume2 className="w-4 h-4" />
                      Voice Library
                    </button>
                    <button
                      onClick={() => setVoiceLibraryTab("clone-voice")}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        voiceLibraryTab === "clone-voice"
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      Clone Voice
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCreditsModal(true)}
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <Info className="w-4 h-4" />
                      How Credits Work
                    </button>
                    <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      <ChevronRight className="w-4 h-4" />
                      Learn More
                    </button>
                  </div>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                {voiceLibraryTab === "voice-library" ? (
                  <>
                    {/* All Voices Header */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        All Voices
                      </h3>

                  {/* Search and Filters */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search voices..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-sm"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      />
                    </div>
                    <button className="px-4 py-2 text-sm font-medium bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      <Sliders className="w-4 h-4" />
                      Filters
                    </button>
                  </div>

                  {/* Active Filters */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>Active filters:</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Language: English
                      <button className="hover:text-blue-800 transition-colors">
                        <ChevronRight className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voice Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { name: "Sam - Chill, Southern", initials: "SA", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "Southern California male with a chill, soothing voice. Great for conversational speech, when..." },
                    { name: "Mark - Natural Conver...", initials: "MA", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "A casual, young-adult speaking in a natural way." },
                    { name: "Mark - Dynamic, Balan...", initials: "MA", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "A dynamic conversational voice." },
                    { name: "Zoë - Casual millennial...", initials: "ZO", provider: "11labs", language: "English", gender: "Female", credits: "1 credit/min", description: "Young millennial woman with a clear, confident, informative, matter of fact and inviting voice..." },
                    { name: "Lauren B - Friendly & E...", initials: "LA", provider: "11labs", language: "English", gender: "Female", credits: "1 credit/min", description: "A warm, polished voice built to make every customer interaction feel personal and helpful..." },
                    { name: "Ethan", initials: "ET", provider: "flaudio", language: "English", gender: "Male", credits: "1 credit/min", description: "Clear and articulate male voice with a balanced tone and a confident speaking style" },
                    { name: "Grandpa Spuds Oxley", initials: "GR", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "A friendly grandpa who knows how to enthrall his audience" },
                    { name: "Mark - ConvoAI", initials: "MA", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "Male conversational voice" },
                    { name: "Archer - Conversational", initials: "AR", provider: "11labs", language: "English", gender: "Male", credits: "1 credit/min", description: "Fine tuned for conversation and podcasts etc. English, casual, thirties." },
                    { name: "Sage", initials: "SA", provider: "openai-sts", language: "English", gender: "Female", credits: "2 credits/min", badge: "STS", description: "Calm, wise, and reassuring. Has a measured pace and mature tone, making it a good choice..." },
                    { name: "Alloy", initials: "AL", provider: "openai-sts", language: "English", gender: "Female", credits: "2 credits/min", badge: "STS", description: "Warm, rich, and smooth with a professional yet friendly tone. Great for general-purpose use..." },
                    { name: "Echo", initials: "EC", provider: "openai-sts", language: "English", gender: "Male", credits: "2 credits/min", badge: "STS", description: "Balanced and clear with a professional tone" }
                  ].map((voice, index) => {
                    const isSelected = selectedVoice.name === voice.name;
                    return (
                      <div key={index} className="p-4 bg-white rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            {voice.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm truncate" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                                {voice.name}
                              </p>
                              {voice.badge && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded" style={{
                                  backgroundColor: '#9D4EDD',
                                  color: 'white',
                                  fontFamily: 'Outfit, sans-serif'
                                }}>
                                  {voice.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                {voice.provider}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                {voice.language}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                {voice.gender}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                                {voice.credits}
                              </span>
                            </div>
                            <p className="text-xs line-clamp-2 mb-3" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              {voice.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedVoice({ name: voice.name, provider: voice.provider, badge: voice.badge || null });
                              setShowVoiceLibraryModal(false);
                              toast.success(`Voice "${voice.name}" selected`);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-medium text-primary bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                            </svg>
                            Select
                          </button>
                          <button className="px-3 py-2 text-sm font-medium text-primary bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            <Play className="w-4 h-4" />
                            Preview
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  {[1, 2, 3, 4, 5].map((page) => (
                    <button
                      key={page}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        page === 1
                          ? 'border-primary bg-primary text-white'
                          : 'border-border hover:bg-muted/30'
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif', color: page === 1 ? 'white' : '#64748B' }}
                    >
                      {page}
                    </button>
                  ))}
                  <span className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>...</span>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/30 text-sm font-medium"
                    style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}
                  >
                    25
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                  </>
                ) : (
                  /* Clone Voice Tab */
                  <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-xl border border-border p-6">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Create Custom Voice
                      </h3>
                      <p className="text-sm mb-6" style={{ color: '#4F8EF7', fontFamily: 'Outfit, sans-serif' }}>
                        Upload an audio file or record directly to create your own voice clone
                      </p>

                      {/* Voice Name */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                          <span className="text-red-500">* </span>Voice Name
                        </label>
                        <input
                          type="text"
                          value={cloneVoiceName}
                          onChange={(e) => setCloneVoiceName(e.target.value)}
                          placeholder="Enter a name for your custom voice"
                          className="w-full px-4 py-2 bg-white border border-border rounded-lg text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Description */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                          <span className="text-red-500">* </span>Description
                        </label>
                        <textarea
                          value={cloneVoiceDescription}
                          onChange={(e) => setCloneVoiceDescription(e.target.value)}
                          placeholder="Describe your custom voice"
                          className="w-full px-4 py-3 bg-white border border-border rounded-lg text-sm resize-none h-24"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Voice Provider */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                          <span className="text-red-500">* </span>Voice Provider
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setCloneVoiceProvider("Elevenlabs")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              cloneVoiceProvider === "Elevenlabs"
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-foreground hover:bg-gray-200"
                            }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            Elevenlabs
                          </button>
                          <button
                            onClick={() => setCloneVoiceProvider("Cartesia")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              cloneVoiceProvider === "Cartesia"
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-foreground hover:bg-gray-200"
                            }`}
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            Cartesia
                          </button>
                        </div>
                      </div>

                      {/* Audio Source */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-3" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                          Audio Source
                        </label>
                        <div className="flex items-center gap-3 mb-2">
                          <button className="flex-1 px-4 py-2 text-sm font-medium bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            <FileText className="w-4 h-4" />
                            Select File
                          </button>
                          <button className="flex-1 px-4 py-2 text-sm font-medium bg-white border border-border rounded-lg hover:bg-muted/30 transition-colors flex items-center justify-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                              <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            Start Recording
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Maximum file size: 10 MB • Supported formats: WAV, MP3
                        </p>
                      </div>

                      {/* Create Button */}
                      <button
                        onClick={() => {
                          if (!cloneVoiceName || !cloneVoiceDescription) {
                            toast.error("Please fill in all required fields");
                            return;
                          }
                          toast.success("Voice clone created successfully");
                          setCloneVoiceName("");
                          setCloneVoiceDescription("");
                          setShowVoiceLibraryModal(false);
                        }}
                        className="w-full px-4 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        Create Voice Clone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Voice Credits Explained Modal */}
        {showCreditsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-xl w-full mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2"/>
                    <path d="M7 8h10M7 12h10M7 16h6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Voice Credits Explained
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* What are Voice Credits */}
                <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                      What are Voice Credits?
                    </p>
                    <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Voice credits are the currency that powers your AI receptionist's voice capabilities. They're simple to understand and easy to manage.
                    </p>
                  </div>
                </div>

                {/* Credit Details */}
                <div className="space-y-4">
                  {/* Prorated by the Second */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Prorated by the Second
                      </p>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Credits are charged by the second, not by the minute. You'll only pay for the exact duration used, so short or partial minutes won't cost you a full credit.
                      </p>
                    </div>
                  </div>

                  {/* 1 credit = 12¢ */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        1 credit = 12¢
                      </p>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Each credit costs 12 cents, making it easy to understand your costs.
                      </p>
                    </div>
                  </div>

                  {/* Monthly Free Credits */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Monthly Free Credits
                      </p>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Your plan includes free credits that automatically renew each month.
                      </p>
                    </div>
                  </div>

                  {/* Auto-Reload Available */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Auto-Reload Available
                        <button className="text-xs text-primary hover:underline" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Configure
                        </button>
                      </p>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Enable auto-reload to ensure your AI receptionist is always available to take calls.
                      </p>
                    </div>
                  </div>

                  {/* Transferred Call Usage */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Transferred Call Usage
                      </p>
                      <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                        Each transferred call uses 0.25 credits per minute = $0.03 per minute.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <button className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Read our complete pricing guide
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Call Transferring Workflow Modal */}
        {showTransferCallModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Add Call Transferring Workflow
                </h2>
                <button
                  onClick={() => setShowTransferCallModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {transferScenarios.map((scenario, index) => (
                    <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Scenario {index + 1}
                      </h3>

                      {/* Scenario Description */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Scenario Description
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <textarea
                          value={scenario.description}
                          onChange={(e) => {
                            const newScenarios = [...transferScenarios];
                            newScenarios[index].description = e.target.value;
                            setTransferScenarios(newScenarios);
                          }}
                          placeholder="e.g., Transfer the caller to the billing department. Execute whenever caller asks for a refund or receipt."
                          className="w-full p-3 bg-white border border-border rounded-lg resize-none h-20 text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Phone Number
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Number
                            </label>
                            <div className="flex items-center gap-2">
                              <select className="px-3 py-2 bg-white border border-border rounded-lg text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                <option>🇺🇸 +1</option>
                              </select>
                              <input
                                type="tel"
                                value={scenario.phoneNumber}
                                onChange={(e) => {
                                  const newScenarios = [...transferScenarios];
                                  newScenarios[index].phoneNumber = e.target.value;
                                  setTransferScenarios(newScenarios);
                                }}
                                placeholder="+1"
                                className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Extension (Optional)
                              <Info className="w-3 h-3 inline-block ml-1 text-muted-foreground" />
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>#</span>
                              <input
                                type="text"
                                value={scenario.extension}
                                onChange={(e) => {
                                  const newScenarios = [...transferScenarios];
                                  newScenarios[index].extension = e.target.value;
                                  setTransferScenarios(newScenarios);
                                }}
                                placeholder="e.g. 302"
                                className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Voice Response */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Voice Response
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <input
                          type="text"
                          value={scenario.voiceResponse}
                          onChange={(e) => {
                            const newScenarios = [...transferScenarios];
                            newScenarios[index].voiceResponse = e.target.value;
                            setTransferScenarios(newScenarios);
                          }}
                          placeholder="Please hold while I transfer your call"
                          className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Advanced Settings */}
                      <button className="text-sm text-primary hover:underline flex items-center gap-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Advanced Settings
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Call Transferring Workflow Button */}
                <button
                  onClick={() => {
                    setTransferScenarios([
                      ...transferScenarios,
                      {
                        id: transferScenarios.length + 1,
                        description: "",
                        phoneNumber: "",
                        extension: "",
                        voiceResponse: "Please hold while I transfer your call"
                      }
                    ]);
                  }}
                  className="w-full mt-4 px-4 py-3 text-sm font-medium text-primary bg-white border border-dashed border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Call Transferring Workflow
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowTransferCallModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const validScenarios = transferScenarios.filter(s => s.description && s.phoneNumber);
                    if (validScenarios.length === 0) {
                      toast.error("Please fill in at least one scenario");
                      return;
                    }
                    setSavedTransferScenarios(validScenarios.map(s => ({ ...s, enabled: true })));
                    setTransferScenarios([
                      { id: 1, description: "", phoneNumber: "", extension: "", voiceResponse: "Please hold while I transfer your call" }
                    ]);
                    setShowTransferCallModal(false);
                    toast.success("Call transferring workflow added successfully");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Text Message Workflow Modal */}
        {showTextMessageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Add Text Message Workflow
                </h2>
                <button
                  onClick={() => setShowTextMessageModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {textMessageScenarios.map((scenario, index) => (
                    <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Scenario {index + 1}
                      </h3>

                      {/* Enable Short URLs */}
                      <div className="flex items-center gap-3 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={scenario.enableShortUrls}
                            onChange={(e) => {
                              const newScenarios = [...textMessageScenarios];
                              newScenarios[index].enableShortUrls = e.target.checked;
                              setTextMessageScenarios(newScenarios);
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Enable Short URLs
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Scenario Description */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Scenario Description
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <textarea
                          value={scenario.description}
                          onChange={(e) => {
                            const newScenarios = [...textMessageScenarios];
                            newScenarios[index].description = e.target.value;
                            setTextMessageScenarios(newScenarios);
                          }}
                          placeholder="e.g. Send the caller a copy of the menu. Execute whenever caller asks for menu or prices."
                          className="w-full p-3 bg-white border border-border rounded-lg resize-none h-20 text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Text Message */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Text Message
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <textarea
                          value={scenario.textMessage}
                          onChange={(e) => {
                            const newScenarios = [...textMessageScenarios];
                            newScenarios[index].textMessage = e.target.value;
                            setTextMessageScenarios(newScenarios);
                          }}
                          placeholder="e.g. Here is our menu: www.restaurant.com/menu"
                          className="w-full p-3 bg-white border border-border rounded-lg resize-none h-24 text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                        <p className="text-xs mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          * Max 1000 characters allowed
                        </p>
                      </div>

                      {/* What should the AI do next? */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            What should the AI do next?
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <textarea
                          value={scenario.nextAction}
                          onChange={(e) => {
                            const newScenarios = [...textMessageScenarios];
                            newScenarios[index].nextAction = e.target.value;
                            setTextMessageScenarios(newScenarios);
                          }}
                          placeholder="e.g. Tell the caller you've sent them a text message, and then trigger the intake form defined earlier to collect their information."
                          className="w-full p-3 bg-white border border-border rounded-lg resize-none h-20 text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                      </div>

                      {/* Ask before sending Text SMS */}
                      <div className="flex items-center gap-3 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={scenario.askBeforeSending}
                            onChange={(e) => {
                              const newScenarios = [...textMessageScenarios];
                              newScenarios[index].askBeforeSending = e.target.checked;
                              setTextMessageScenarios(newScenarios);
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Ask before sending Text SMS
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Attach Image (Optional) */}
                      <div className="mb-4">
                        <p className="text-xs mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          Image Upload
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Attach Image (Optional)
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`image-upload-${index}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const newScenarios = [...textMessageScenarios];
                                newScenarios[index].attachedImage = file;
                                setTextMessageScenarios(newScenarios);
                              }
                            }}
                          />
                          <label htmlFor={`image-upload-${index}`} className="cursor-pointer">
                            <div className="w-12 h-12 mx-auto mb-3 text-primary">
                              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <p className="text-sm mb-1" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                              {scenario.attachedImage ? scenario.attachedImage.name : 'Click or drag file to this area to upload'}
                            </p>
                            <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                              Must be JPEG/JPG/PNG image (Max: 1 MB)
                            </p>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Text Message Workflow Button */}
                <button
                  onClick={() => {
                    setTextMessageScenarios([
                      ...textMessageScenarios,
                      {
                        id: textMessageScenarios.length + 1,
                        enableShortUrls: false,
                        description: "",
                        textMessage: "",
                        nextAction: "",
                        askBeforeSending: false,
                        attachedImage: null
                      }
                    ]);
                  }}
                  className="w-full mt-4 px-4 py-3 text-sm font-medium text-primary bg-white border border-dashed border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Text Message Workflow
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowTextMessageModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const validScenarios = textMessageScenarios.filter(s => s.description && s.textMessage);
                    if (validScenarios.length === 0) {
                      toast.error("Please fill in at least one scenario");
                      return;
                    }
                    setSavedTextMessageScenarios(validScenarios.map(s => ({ ...s, enabled: true })));
                    setTextMessageScenarios([
                      { id: 1, enableShortUrls: false, description: "", textMessage: "", nextAction: "", askBeforeSending: false, attachedImage: null }
                    ]);
                    setShowTextMessageModal(false);
                    toast.success("Text message workflow added successfully");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Collect Information Workflow Modal */}
        {showCollectInfoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-primary" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Add New Scenario
                </h2>
                <button
                  onClick={() => setShowCollectInfoModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {collectInfoScenarios.map((scenario, index) => (
                    <div key={scenario.id} className="p-6 bg-white rounded-xl border border-border">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                        Scenario {index + 1}
                      </h3>

                      {/* Trigger Type */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Trigger Type
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <select
                          value={scenario.triggerType}
                          onChange={(e) => {
                            const newScenarios = [...collectInfoScenarios];
                            newScenarios[index].triggerType = e.target.value;
                            setCollectInfoScenarios(newScenarios);
                          }}
                          className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                          <option>Custom Scenario</option>
                          <option>After Every Call</option>
                        </select>
                        {scenario.triggerType === "Custom Scenario" && (
                          <textarea
                            value={scenario.triggerDescription}
                            onChange={(e) => {
                              const newScenarios = [...collectInfoScenarios];
                              newScenarios[index].triggerDescription = e.target.value;
                              setCollectInfoScenarios(newScenarios);
                            }}
                            placeholder="Describe your custom scenario (e.g. if caller mentioned calling back)"
                            className="w-full p-3 bg-white border border-border rounded-lg resize-none h-20 text-sm mt-2"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        )}
                      </div>

                      {/* Text Message */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Text Message
                          </label>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <textarea
                          value={scenario.textMessage}
                          onChange={(e) => {
                            const newScenarios = [...collectInfoScenarios];
                            newScenarios[index].textMessage = e.target.value;
                            setCollectInfoScenarios(newScenarios);
                          }}
                          placeholder="Based on your interest in our services, here's some additional information that might be helpful: www.example.com/info"
                          className="w-full p-3 bg-white border border-border rounded-lg resize-none h-24 text-sm"
                          style={{ fontFamily: 'Outfit, sans-serif' }}
                        />
                        <p className="text-xs mt-1 text-right" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                          500 characters left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Another Scenario Button */}
                <button
                  onClick={() => {
                    setCollectInfoScenarios([
                      ...collectInfoScenarios,
                      {
                        id: collectInfoScenarios.length + 1,
                        triggerType: "Custom Scenario",
                        triggerDescription: "",
                        textMessage: ""
                      }
                    ]);
                  }}
                  className="w-full mt-4 px-4 py-3 text-sm font-medium text-primary bg-white border border-dashed border-primary rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Another Scenario
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="primary"
                  onClick={() => {
                    const validScenarios = collectInfoScenarios.filter(s => {
                      if (s.triggerType === "After Every Call") {
                        return s.textMessage;
                      }
                      return s.triggerDescription && s.textMessage;
                    });
                    if (validScenarios.length === 0) {
                      toast.error("Please fill in at least one scenario");
                      return;
                    }
                    setSavedCollectInfoScenarios(validScenarios.map(s => ({ ...s, enabled: true })));
                    setCollectInfoScenarios([
                      { id: 1, triggerType: "Custom Scenario", triggerDescription: "", textMessage: "" }
                    ]);
                    setShowCollectInfoModal(false);
                    toast.success("Collect information workflow added successfully");
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Calendar Booking Workflow Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                  Add Calendar Booking Workflow
                </h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Enable Short URLs */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Enable Short URLs
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={bookingEnableShortUrls}
                      onChange={(e) => setBookingEnableShortUrls(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Scenario Description */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Scenario Description
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={bookingScenarioDescription}
                    onChange={(e) => setBookingScenarioDescription(e.target.value)}
                    placeholder="Send a booking link when caller wants to schedule an appointment"
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                {/* Text Message */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Text Message
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <textarea
                    value={bookingTextMessage}
                    onChange={(e) => setBookingTextMessage(e.target.value)}
                    placeholder="Hi! Here's the link to book your appointment: [YOUR_BOOKING_LINK]"
                    className="w-full p-3 bg-white border border-border rounded-lg resize-none h-24 text-sm"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                    * Max 1000 characters allowed. Replace [YOUR_BOOKING_LINK] with your actual booking URL
                  </p>
                </div>

                {/* What should the AI do next? */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      What should the AI do next?
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <textarea
                    value={bookingNextAction}
                    onChange={(e) => setBookingNextAction(e.target.value)}
                    placeholder="Tell the caller you've sent them a booking link via text message and they can use it to schedule their appointment at their convenience."
                    className="w-full p-3 bg-white border border-border rounded-lg resize-none h-24 text-sm"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                {/* Ask before sending Text SMS */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Ask before sending Text SMS
                    </label>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={bookingAskBeforeSending}
                      onChange={(e) => setBookingAskBeforeSending(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!bookingScenarioDescription || !bookingTextMessage) {
                      toast.error("Please fill in all required fields");
                      return;
                    }
                    const newWorkflow = {
                      id: savedBookingWorkflows.length + 1,
                      enableShortUrls: bookingEnableShortUrls,
                      scenarioDescription: bookingScenarioDescription,
                      textMessage: bookingTextMessage,
                      nextAction: bookingNextAction,
                      askBeforeSending: bookingAskBeforeSending
                    };
                    setSavedBookingWorkflows([...savedBookingWorkflows, newWorkflow]);
                    setBookingEnableShortUrls(true);
                    setBookingScenarioDescription("");
                    setBookingTextMessage("");
                    setBookingNextAction("");
                    setBookingAskBeforeSending(true);
                    setShowBookingModal(false);
                    toast.success("Calendar booking workflow added successfully");
                  }}
                >
                  Add Booking Workflow
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Setup Workflow Availability Modal */}
        {showAvailabilityModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
                    Setup WorkFlow Availability
                  </h2>
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                <button
                  onClick={() => setShowAvailabilityModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Description and Toggle */}
                <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
                  <div className="flex-1">
                    <p className="text-sm mb-2" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      If you'd like this workflow to run only on specific days or during certain hours, please configure the schedule here. By default, this workflow will be available 24/7 when disabled.
                    </p>
                    <p className="text-xs" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>
                      Timezone: Asia/Calcutta
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                      Enabled
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={availabilityEnabled}
                        onChange={(e) => setAvailabilityEnabled(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Week Schedule */}
                {availabilityEnabled && (
                  <div className="space-y-3 mb-6">
                    {weekSchedule.map((daySchedule, index) => (
                    <div key={daySchedule.day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      {/* Day Toggle */}
                      <div className="flex items-center gap-3 w-40">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={daySchedule.enabled}
                            onChange={(e) => {
                              const newSchedule = [...weekSchedule];
                              newSchedule[index].enabled = e.target.checked;
                              setWeekSchedule(newSchedule);
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <span className="text-sm font-medium" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                          {daySchedule.day}
                        </span>
                      </div>

                      {/* Time Inputs */}
                      {daySchedule.enabled ? (
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={daySchedule.startTime}
                              onChange={(e) => {
                                const newSchedule = [...weekSchedule];
                                newSchedule[index].startTime = e.target.value;
                                setWeekSchedule(newSchedule);
                              }}
                              className="px-3 py-1.5 bg-white border border-border rounded-lg text-sm"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm" style={{ color: '#64748B', fontFamily: 'Outfit, sans-serif' }}>to</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={daySchedule.endTime}
                              onChange={(e) => {
                                const newSchedule = [...weekSchedule];
                                newSchedule[index].endTime = e.target.value;
                                setWeekSchedule(newSchedule);
                              }}
                              className="px-3 py-1.5 bg-white border border-border rounded-lg text-sm"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm italic flex-1 text-right" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
                          Off for the day
                        </span>
                      )}
                    </div>
                  ))}
                  </div>
                )}

                {/* Prompt for AI during inactive hours */}
                {availabilityEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#020817', fontFamily: 'Outfit, sans-serif' }}>
                      <span className="text-red-500">* </span>Prompt for AI during inactive hours
                    </label>
                    <textarea
                      value={inactiveHoursPrompt}
                      onChange={(e) => setInactiveHoursPrompt(e.target.value)}
                      placeholder="e.g. Tell User that 'We are currently closed. Please call again during working hours'"
                      className="w-full p-3 bg-white border border-border rounded-lg resize-none h-24 text-sm"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowAvailabilityModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowAvailabilityModal(false);
                    toast.success("Availability settings updated successfully");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
