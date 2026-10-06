// ============================================================================
// AI Models Store & Configuration
// Manages LLM models available across processes and AI agent settings.
// ============================================================================

import { useEffect, useState } from "react";

export interface AIModelConfig {
  id: string;
  name: string;
  provider: "Google" | "OpenAI" | "Anthropic" | "DeepSeek" | "Meta";
  badge?: string;
  contextWindow: string;
  latency: string;
  description: string;
  isActive: boolean;
}

export const DEFAULT_AI_MODELS: AIModelConfig[] = [
  {
    id: "gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    badge: "Recommended",
    contextWindow: "1M tokens",
    latency: "~240ms",
    description: "Ultra-fast multimodal reasoning engine optimized for real-time voice latency.",
    isActive: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: "Flagship",
    contextWindow: "128k tokens",
    latency: "~310ms",
    description: "High-intelligence flagship omni model with advanced natural conversational capabilities.",
    isActive: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    badge: "Fast & Efficient",
    contextWindow: "128k tokens",
    latency: "~220ms",
    description: "Lightweight, ultra-low latency model engineered for cost-effective high-volume calls.",
    isActive: true,
  },
  {
    id: "deepseek-v4-flash",
    name: "Deepseek V4 Flash",
    provider: "DeepSeek",
    badge: "Ultra-Fast",
    contextWindow: "128k tokens",
    latency: "~190ms",
    description: "High-throughput, ultra-fast latency optimized specifically for real-time turn-taking.",
    isActive: true,
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    badge: "High Reasoning",
    contextWindow: "200k tokens",
    latency: "~380ms",
    description: "Industry-leading nuance, emotional intelligence, and complex workflow adherence.",
    isActive: true,
  },
  {
    id: "gemini-1-5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    badge: "Deep Context",
    contextWindow: "2M tokens",
    latency: "~450ms",
    description: "Massive context window ideal for comprehensive EHR, documents, and complex policies.",
    isActive: false,
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    badge: "Open Weights",
    contextWindow: "128k tokens",
    latency: "~340ms",
    description: "State-of-the-art open-weights model fine-tuned for structured data extraction.",
    isActive: false,
  },
];

export const AI_MODELS_STORE_KEY = "mantra_ai_models_config";
export const AI_MODELS_STORE_EVENT = "mantra_ai_models_updated";

export function getStoredAIModels(): AIModelConfig[] {
  try {
    const raw = localStorage.getItem(AI_MODELS_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure all fields and any newly added models are present
        const merged = DEFAULT_AI_MODELS.map((defaultModel) => {
          const existing = parsed.find((p: any) => p.id === defaultModel.id || p.name === defaultModel.name);
          return existing ? { ...defaultModel, ...existing } : defaultModel;
        });
        return merged;
      }
    }
  } catch (e) {
    console.error("Error reading AI models from localStorage:", e);
  }
  return DEFAULT_AI_MODELS;
}

export function saveStoredAIModels(models: AIModelConfig[]): void {
  try {
    localStorage.setItem(AI_MODELS_STORE_KEY, JSON.stringify(models));
    window.dispatchEvent(new CustomEvent(AI_MODELS_STORE_EVENT, { detail: models }));
  } catch (e) {
    console.error("Error saving AI models to localStorage:", e);
  }
}

export function toggleAIModelActive(id: string): AIModelConfig[] {
  const current = getStoredAIModels();
  const updated = current.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m));
  saveStoredAIModels(updated);
  return updated;
}

export function getActiveAIModels(): AIModelConfig[] {
  const all = getStoredAIModels();
  const active = all.filter((m) => m.isActive);
  // Ensure at least one active model is returned so the agent always has an engine
  if (active.length === 0 && all.length > 0) {
    return [all[0]];
  }
  return active;
}

export function useAIModels() {
  const [models, setModels] = useState<AIModelConfig[]>(getStoredAIModels);

  useEffect(() => {
    const handleUpdate = () => {
      setModels(getStoredAIModels());
    };
    window.addEventListener(AI_MODELS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(AI_MODELS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const toggleModel = (id: string) => {
    const next = toggleAIModelActive(id);
    setModels(next);
  };

  const activeModels = models.filter((m) => m.isActive);

  return {
    models,
    activeModels: activeModels.length > 0 ? activeModels : [models[0]],
    toggleModel,
    setModels,
  };
}
