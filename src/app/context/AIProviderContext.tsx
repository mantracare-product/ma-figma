import { createContext, useContext, useState, ReactNode } from "react";

export interface AIProvider {
  id: string;
  name: string;
  active: boolean;
  selectedModel: string;
  availableModels: string[];
  apiKey: string;
}

interface AIProviderContextType {
  aiProviders: AIProvider[];
  setAIProviders: (providers: AIProvider[]) => void;
  getActiveProviders: () => AIProvider[];
  toggleProvider: (providerId: string) => void;
  updateProvider: (provider: AIProvider) => void;
  addProvider: (provider: AIProvider) => void;
  deleteProvider: (providerId: string) => void;
}

const AIProviderContext = createContext<AIProviderContextType | undefined>(undefined);

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([
    {
      id: "openai",
      name: "OpenAI",
      active: true,
      selectedModel: "GPT-4o",
      availableModels: ["GPT-4o", "GPT-4", "GPT-3.5 Turbo"],
      apiKey: "",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      active: false,
      selectedModel: "Gemini 1.5 Pro",
      availableModels: ["Gemini 1.5 Pro", "Gemini 1.5 Flash", "Gemini Pro"],
      apiKey: "",
    },
    {
      id: "claude",
      name: "Claude",
      active: true,
      selectedModel: "Claude 3.5 Sonnet",
      availableModels: ["Claude 3.5 Sonnet", "Claude 3 Opus", "Claude 3 Haiku"],
      apiKey: "",
    },
  ]);

  const getActiveProviders = () => {
    return aiProviders.filter((provider) => provider.active);
  };

  const toggleProvider = (providerId: string) => {
    setAIProviders(
      aiProviders.map((provider) =>
        provider.id === providerId ? { ...provider, active: !provider.active } : provider
      )
    );
  };

  const updateProvider = (updatedProvider: AIProvider) => {
    setAIProviders(
      aiProviders.map((provider) =>
        provider.id === updatedProvider.id ? updatedProvider : provider
      )
    );
  };

  const addProvider = (newProvider: AIProvider) => {
    setAIProviders([...aiProviders, newProvider]);
  };

  const deleteProvider = (providerId: string) => {
    setAIProviders(aiProviders.filter((provider) => provider.id !== providerId));
  };

  return (
    <AIProviderContext.Provider
      value={{
        aiProviders,
        setAIProviders,
        getActiveProviders,
        toggleProvider,
        updateProvider,
        addProvider,
        deleteProvider,
      }}
    >
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProviders() {
  const context = useContext(AIProviderContext);
  if (context === undefined) {
    throw new Error("useAIProviders must be used within an AIProviderProvider");
  }
  return context;
}
