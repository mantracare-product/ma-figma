/**
 * AdminAIVoicesModels.tsx
 * Path: src/app/pages/admin/AdminAIVoicesModels.tsx
 *
 * Dedicated Admin Console for AI Voices & Models.
 * Admins configure which AI Models and Voices are active/available across client organizations.
 * Whatever voices and models are activated here are seen by clients in the Client AI Voice & Models sections.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Play,
  Square,
  Sparkles,
  Bot,
  Volume2,
  Mic,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Check,
  RotateCcw,
  Sliders,
  Radio,
  Globe,
  Info,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import {
  getStoredVoices,
  saveStoredVoices,
  toggleStoredVoiceStatus,
  VoiceConfigItem,
  VOICE_STORE_EVENT,
  DEFAULT_VOICE_TABLE_DATA,
} from "../../../lib/useVoiceStore";
import {
  getStoredAIModels,
  saveStoredAIModels,
  toggleAIModelActive,
  AI_MODELS_STORE_EVENT,
  AIModelConfig,
  DEFAULT_AI_MODELS,
} from "../../../lib/aiModelsStore";

const VOICE_ROLES: Record<string, string> = {
  Nova: "Receptionist & Front Desk",
  Atlas: "Billing Specialist",
  Luna: "Appointment Scheduler",
  Alloy: "Patient Coordinator",
  Shimmer: "Insurance Verifier",
  Echo: "Triage & Intake",
  Fable: "General Inquiries",
  Onyx: "Executive Support",
  Bella: "Spanish Bilingual Desk",
  Charlie: "Follow-up Specialist",
  Daniel: "Senior Care Coordinator",
  Mateo: "Spanish Consultations",
  Emily: "Pediatric Concierge",
  Finn: "Post-Op Outreach",
  Grace: "Dental Coordinator",
  Camille: "French Patient Services",
  Asteria: "Emergency Hotline",
  Hans: "German Care Coordinator",
  Priya: "Hindi & Multilingual Desk",
  Stella: "Patient Care Lead",
  Athena: "Clinical Specialist",
  Sakura: "Japanese Language Support",
  Diego: "Latino Outreach Lead",
  Lucas: "Portuguese Patient Desk",
};

export default function AdminAIVoicesModels() {
  // Mode selection: "models" | "voices"
  const [activeMode, setActiveMode] = useState<"models" | "voices">("models");

  // Stores state
  const [aiModels, setAiModels] = useState<AIModelConfig[]>(getStoredAIModels);
  const [voices, setVoices] = useState<VoiceConfigItem[]>(getStoredVoices);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [modelProviderFilter, setModelProviderFilter] = useState("All Providers");
  const [modelStatusFilter, setModelStatusFilter] = useState("All Status");

  // Voice Filters: Provider, Language, Gender, Accent
  const [voiceFilters, setVoiceFilters] = useState({
    provider: "All Providers",
    language: "All Languages",
    gender: "All Genders",
    accent: "All Accents",
  });

  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);

  // Sync with store events
  useEffect(() => {
    const handleVoiceUpdate = () => setVoices(getStoredVoices());
    const handleModelUpdate = () => setAiModels(getStoredAIModels());

    window.addEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
    window.addEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
    window.addEventListener("storage", handleVoiceUpdate);
    window.addEventListener("storage", handleModelUpdate);

    return () => {
      window.removeEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
      window.removeEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
      window.removeEventListener("storage", handleVoiceUpdate);
      window.removeEventListener("storage", handleModelUpdate);
    };
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filtered AI Models
  const filteredModels = useMemo(() => {
    return aiModels.filter((model) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        model.description.toLowerCase().includes(q);

      const matchesProvider =
        modelProviderFilter === "All Providers" ||
        model.provider.toLowerCase() === modelProviderFilter.toLowerCase();

      const matchesStatus =
        modelStatusFilter === "All Status" ||
        (modelStatusFilter === "Active" ? model.isActive : !model.isActive);

      return matchesSearch && matchesProvider && matchesStatus;
    });
  }, [aiModels, searchQuery, modelProviderFilter, modelStatusFilter]);

  // Filtered Voices
  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const q = searchQuery.trim().toLowerCase();
      const role = VOICE_ROLES[voice.name] || "";
      const matchesSearch =
        !q ||
        voice.name.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        (voice.provider && voice.provider.toLowerCase().includes(q)) ||
        voice.language.toLowerCase().includes(q) ||
        voice.accent.toLowerCase().includes(q) ||
        voice.country.toLowerCase().includes(q) ||
        voice.gender.toLowerCase().includes(q);

      const matchesProvider =
        voiceFilters.provider === "All Providers" ||
        (voice.provider && voice.provider.toLowerCase() === voiceFilters.provider.toLowerCase());

      const matchesLanguage =
        voiceFilters.language === "All Languages" ||
        voice.language.toLowerCase() === voiceFilters.language.toLowerCase();

      const matchesGender =
        voiceFilters.gender === "All Genders" ||
        voice.gender.toLowerCase() === voiceFilters.gender.toLowerCase();

      const matchesAccent =
        voiceFilters.accent === "All Accents" ||
        voice.accent.toLowerCase() === voiceFilters.accent.toLowerCase() ||
        voice.country.toLowerCase() === voiceFilters.accent.toLowerCase();

      return matchesSearch && matchesProvider && matchesLanguage && matchesGender && matchesAccent;
    });
  }, [voices, searchQuery, voiceFilters]);

  // Derived options for filters
  const providerOptions = useMemo(() => {
    const set = new Set(voices.map((v) => v.provider).filter(Boolean));
    return ["All Providers", ...Array.from(set)];
  }, [voices]);

  const languageOptions = useMemo(() => {
    const set = new Set(voices.map((v) => v.language).filter(Boolean));
    return ["All Languages", ...Array.from(set)];
  }, [voices]);

  const accentOptions = useMemo(() => {
    const set = new Set(voices.map((v) => v.accent).filter(Boolean));
    return ["All Accents", ...Array.from(set)];
  }, [voices]);

  // Toggle handlers
  const handleToggleModel = (id: string, name: string) => {
    const updated = toggleAIModelActive(id);
    setAiModels(updated);
    const target = updated.find((m) => m.id === id);
    if (target?.isActive) {
      toast.success(`"${name}" activated — now available to client organizations`);
    } else {
      toast.info(`"${name}" deactivated — hidden from client organizations`);
    }
  };

  const handleToggleVoice = (voiceId: number, voiceName: string) => {
    const updated = toggleStoredVoiceStatus(voiceId);
    setVoices(updated);
    const target = updated.find((v) => v.id === voiceId);
    if (target?.status) {
      toast.success(`"${voiceName}" voice activated — now visible to clients`);
    } else {
      toast.info(`"${voiceName}" voice deactivated — hidden from clients`);
    }
  };

  // Bulk active/inactive
  const handleSetAllModels = (activate: boolean) => {
    const updated = aiModels.map((m) => ({ ...m, isActive: activate }));
    saveStoredAIModels(updated);
    setAiModels(updated);
    toast.success(activate ? "All AI Models activated" : "All AI Models deactivated");
  };

  const handleSetAllVoices = (activate: boolean) => {
    const updated = voices.map((v) => ({ ...v, status: activate }));
    saveStoredVoices(updated);
    setVoices(updated);
    toast.success(activate ? "All AI Voices activated" : "All AI Voices deactivated");
  };

  // Play audio sample
  const handlePlayVoice = (voice: VoiceConfigItem) => {
    if (playingVoiceId === voice.id) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingVoiceId(null);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const phrases: Record<string, string> = {
        English: `Hello! I'm ${voice.name}. I'm ready to assist your callers with scheduling, follow-ups, and inquiries.`,
        Spanish: `¡Hola! Soy ${voice.name}. Estoy listo para atender a sus pacientes con citas y consultas médicas.`,
        French: `Bonjour! Je m'appelle ${voice.name}, votre assistante virtuelle pour la gestion de vos rendez-vous.`,
        German: `Guten Tag! Ich bin ${voice.name}, Ihre digitale Praxisassistentin für Terminvereinbarungen.`,
        Japanese: `こんにちは、${voice.name}です。患者様のご予約やお問合せをリアルタイムでお手伝いいたします。`,
        Hindi: `नमस्ते, मैं ${voice.name} हूँ। आपके क्लिनिक के अपॉइंटमेंट्स और कॉल्स के लिए हमेशा तैयार।`,
        Portuguese: `Olá! Sou ${voice.name}, pronta para ajudar seus pacientes no agendamento e dúvidas.`,
      };
      const text = phrases[voice.language] || phrases.English;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = voice.gender === "Female" ? 1.15 : 0.88;
      utterance.rate = 1.0;
      utterance.onend = () => setPlayingVoiceId(null);
      utterance.onerror = () => setPlayingVoiceId(null);
      setPlayingVoiceId(voice.id);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Audio synthesis not supported in this browser");
    }
  };

  // Provider logo renderer (matching Client Settings high-fidelity logos)
  const renderProviderLogo = (provider: string) => {
    switch (provider) {
      case "Google":
        return (
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>
        );
      case "OpenAI":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.7948.7948 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0748a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4598a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z" />
            </svg>
          </div>
        );
      case "Anthropic":
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#cc785c] border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 4.25h-3.414L21.6 20.25h3.414L17.472 4.25zm-10.944 0L0 20.25h3.486l1.378-3.232h6.586l1.378 3.232h3.486L9.77 4.25H6.528zm-.33 9.773L8.148 9.17l1.95 4.853H6.198z" />
            </svg>
          </div>
        );
      case "DeepSeek":
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" fill="#1D4ED8" />
              <path d="M7 14.5C8.5 12 11 11 13 11C15 11 16.5 12 17.5 13.5C18 12.5 18 11.5 17.5 10.5C16.5 8.5 14 7.5 11.5 8C9 8.5 7.5 10.5 7 12.5V14.5Z" fill="white" />
              <circle cx="10" cy="11.5" r="1" fill="#1D4ED8" />
            </svg>
          </div>
        );
      case "Meta":
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M16.924 3.013c-2.483 0-4.664 1.472-5.717 3.633-1.054-2.161-3.234-3.633-5.717-3.633C2.457 3.013 0 5.485 0 8.528c0 3.327 2.051 6.574 5.378 9.387 2.071 1.752 4.417 3.072 5.829 3.072.167 0 .333-.018.494-.055.67-.156 1.401-.527 2.166-1.077 1.258-.905 2.502-2.115 3.524-3.488 2.302-3.097 3.609-6.31 3.609-7.839 0-3.043-2.457-5.515-5.076-5.515zm-11.434 2c1.968 0 3.692 1.344 4.195 3.267-.798 1.109-1.688 2.336-2.607 3.593-1.636 2.235-3.153 3.967-4.148 4.793C1.656 15.602 1 14.17 1 12.515c0-2.49 2.001-4.502 4.49-4.502zm11.434 11.974c-1.353 0-3.236-1.503-5.093-3.665.918-1.257 1.808-2.484 2.607-3.593.8-1.11 1.639-2.039 2.486-2.716 1.968 0 3.566 1.598 3.566 3.566 0 1.968-1.598 3.566-3.566 3.566z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs font-bold text-sm">
            {provider.charAt(0)}
          </div>
        );
    }
  };

  const activeModelCount = aiModels.filter((m) => m.isActive).length;
  const activeVoiceCount = voices.filter((v) => v.status).length;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-6 animate-in fade-in duration-200">
        {/* Page Header */}
        <PageHeader
          title="AI Voices & Models"
          subtitle="Configure global AI foundation models and voice catalog. Active items are instantly available in client organizations."
        />

        {/* Unified TopBar with Mode Switcher & Filter Controls */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeMode === "models" ? "Search AI models, providers..." : "Search voices, languages, accents..."
          }
          modes={[
            {
              id: "models",
              label: `AI Models (${activeModelCount}/${aiModels.length})`,
            },
            {
              id: "voices",
              label: `AI Voices (${activeVoiceCount}/${voices.length})`,
            },
          ]}
          activeMode={activeMode}
          onModeChange={(mode) => {
            setActiveMode(mode as "models" | "voices");
            setSearchQuery("");
          }}
          secondaryActions={
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {activeMode === "voices" ? (
                <>
                  {/* Provider Filter (Admin Only) */}
                  <div className="relative">
                    <select
                      value={voiceFilters.provider}
                      onChange={(e) => setVoiceFilters((prev) => ({ ...prev, provider: e.target.value }))}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {providerOptions.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov === "All Providers" ? "Provider: All" : prov}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Gender Filter */}
                  <div className="relative">
                    <select
                      value={voiceFilters.gender}
                      onChange={(e) => setVoiceFilters((prev) => ({ ...prev, gender: e.target.value }))}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All Genders">Gender: All</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Accent Filter */}
                  <div className="relative">
                    <select
                      value={voiceFilters.accent}
                      onChange={(e) => setVoiceFilters((prev) => ({ ...prev, accent: e.target.value }))}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {accentOptions.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc === "All Accents" ? "Accent: All" : acc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Language Filter */}
                  <div className="relative">
                    <select
                      value={voiceFilters.language}
                      onChange={(e) => setVoiceFilters((prev) => ({ ...prev, language: e.target.value }))}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {languageOptions.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang === "All Languages" ? "Language: All" : lang}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              ) : (
                <>
                  {/* Model Provider Filter */}
                  <div className="relative">
                    <select
                      value={modelProviderFilter}
                      onChange={(e) => setModelProviderFilter(e.target.value)}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All Providers">Provider: All</option>
                      <option value="Google">Google</option>
                      <option value="OpenAI">OpenAI</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="DeepSeek">DeepSeek</option>
                      <option value="Meta">Meta</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Model Status Filter */}
                  <div className="relative">
                    <select
                      value={modelStatusFilter}
                      onChange={(e) => setModelStatusFilter(e.target.value)}
                      className="h-[36px] pl-3 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer shadow-2xs transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="All Status">Status: All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </>
              )}

              {/* Reset Filters button if any filter is active */}
              {((activeMode === "voices" && (voiceFilters.provider !== "All Providers" || voiceFilters.gender !== "All Genders" || voiceFilters.accent !== "All Accents" || voiceFilters.language !== "All Languages" || searchQuery)) ||
                (activeMode === "models" && (modelProviderFilter !== "All Providers" || modelStatusFilter !== "All Status" || searchQuery))) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setModelProviderFilter("All Providers");
                    setModelStatusFilter("All Status");
                    setVoiceFilters({
                      provider: "All Providers",
                      language: "All Languages",
                      gender: "All Genders",
                      accent: "All Accents",
                    });
                  }}
                  className="h-[36px] px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Reset all filters"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          }
          filterFields={
            activeMode === "models"
              ? [
                  {
                    id: "provider",
                    label: "Provider",
                    type: "select" as const,
                    value: modelProviderFilter,
                    onChange: (val: any) => setModelProviderFilter(val || "All Providers"),
                    options: [
                      { label: "All Providers", value: "All Providers" },
                      { label: "Google", value: "Google" },
                      { label: "OpenAI", value: "OpenAI" },
                      { label: "Anthropic", value: "Anthropic" },
                      { label: "DeepSeek", value: "DeepSeek" },
                      { label: "Meta", value: "Meta" },
                    ],
                  },
                  {
                    id: "status",
                    label: "Status",
                    type: "select" as const,
                    value: modelStatusFilter,
                    onChange: (val: any) => setModelStatusFilter(val || "All Status"),
                    options: [
                      { label: "All Status", value: "All Status" },
                      { label: "Active", value: "Active" },
                      { label: "Inactive", value: "Inactive" },
                    ],
                  },
                ]
              : [
                  {
                    id: "provider",
                    label: "Provider",
                    type: "select" as const,
                    value: voiceFilters.provider,
                    onChange: (val: any) =>
                      setVoiceFilters((prev) => ({ ...prev, provider: val || "All Providers" })),
                    options: providerOptions.map((prov) => ({ label: prov, value: prov })),
                  },
                  {
                    id: "gender",
                    label: "Gender",
                    type: "select" as const,
                    value: voiceFilters.gender,
                    onChange: (val: any) =>
                      setVoiceFilters((prev) => ({ ...prev, gender: val || "All Genders" })),
                    options: [
                      { label: "All Genders", value: "All Genders" },
                      { label: "Female", value: "Female" },
                      { label: "Male", value: "Male" },
                    ],
                  },
                  {
                    id: "accent",
                    label: "Accent",
                    type: "select" as const,
                    value: voiceFilters.accent,
                    onChange: (val: any) =>
                      setVoiceFilters((prev) => ({ ...prev, accent: val || "All Accents" })),
                    options: accentOptions.map((acc) => ({ label: acc, value: acc })),
                  },
                  {
                    id: "language",
                    label: "Language",
                    type: "select" as const,
                    value: voiceFilters.language,
                    onChange: (val: any) =>
                      setVoiceFilters((prev) => ({ ...prev, language: val || "All Languages" })),
                    options: languageOptions.map((lang) => ({ label: lang, value: lang })),
                  },
                ]
          }
          onClearAllFilters={() => {
            setSearchQuery("");
            setModelProviderFilter("All Providers");
            setModelStatusFilter("All Status");
            setVoiceFilters({
              provider: "All Providers",
              language: "All Languages",
              gender: "All Genders",
              accent: "All Accents",
            });
          }}
        />

        {/* ── SECTION 1: AI MODELS ── */}
        {activeMode === "models" && (
          <div>
            {filteredModels.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                No AI models found matching your search and provider criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex items-center justify-between gap-3 shadow-2xs ${
                      model.isActive
                        ? "border-[#E2E8F0] hover:border-slate-300 hover:shadow-xs"
                        : "border-gray-200/70 opacity-60 bg-slate-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {renderProviderLogo(model.provider)}

                      <div className="min-w-0">
                        <h4
                          className="text-sm font-bold text-gray-900 truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {model.name}
                        </h4>
                        <p
                          className="text-xs text-gray-500 font-medium truncate mt-0.5"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {model.provider} · {model.contextWindow}
                        </p>
                      </div>
                    </div>

                    {/* Admin Toggle Switch */}
                    <div className="flex items-center shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={model.isActive}
                          onChange={() => handleToggleModel(model.id, model.name)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 2: AI VOICES ── */}
        {activeMode === "voices" && (
          <div>
            {filteredVoices.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                No AI voices found matching your selected language, gender, or accent.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredVoices.map((voice) => {
                  const isPlaying = playingVoiceId === voice.id;
                  return (
                    <div
                      key={voice.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 p-3.5 sm:p-4 flex items-center justify-between gap-3 group shadow-2xs ${
                        isPlaying
                          ? "border-blue-500 shadow-xs ring-2 ring-blue-100"
                          : voice.status
                          ? "border-[#E2E8F0] hover:border-slate-300 hover:shadow-xs"
                          : "border-gray-200/70 opacity-60 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Play/Stop Button */}
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(voice)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs ${
                            isPlaying
                              ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-105"
                              : "bg-slate-900 hover:bg-slate-800 text-white group-hover:scale-105"
                          }`}
                          title={isPlaying ? "Stop audio" : "Play preview"}
                        >
                          {isPlaying ? (
                            <Square className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4
                              className="text-sm font-bold text-gray-900 truncate"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {voice.name} - {VOICE_ROLES[voice.name] || `${voice.tone} Assistant`}
                            </h4>
                            {isPlaying && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                Playing
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs text-gray-500 font-medium truncate mt-0.5"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            <span className="font-semibold text-slate-700">{voice.provider || "ElevenLabs"}</span> · {voice.language || "English"} · {voice.accent || voice.country} · {voice.gender} · {voice.tone}
                          </p>
                        </div>
                      </div>

                      {/* Active Toggle Switch */}
                      <div className="flex items-center shrink-0 pl-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={voice.status}
                            onChange={() => handleToggleVoice(voice.id, voice.name)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
