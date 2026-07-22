import { useState, useEffect } from "react";
import { Bot, SEED_BOTS, sanitizeBot } from "../app/components/chats/ChatbotTab";

export const CHATBOT_BOTS_EVENT = "chatbotBots_updated";

export function getStoredBots(): Bot[] {
  try {
    const raw = localStorage.getItem("chatbotBots");
    let rawBots: Bot[] = raw ? JSON.parse(raw) : SEED_BOTS;
    if (!Array.isArray(rawBots) || rawBots.length === 0) {
      rawBots = SEED_BOTS;
    }
    return rawBots.map(sanitizeBot);
  } catch {
    return SEED_BOTS.map(sanitizeBot);
  }
}

export function saveStoredBots(bots: Bot[]) {
  const sanitized = bots.map(sanitizeBot);
  localStorage.setItem("chatbotBots", JSON.stringify(sanitized));
  window.dispatchEvent(new Event(CHATBOT_BOTS_EVENT));
}

export function useChatbotBots() {
  const [bots, setBotsState] = useState<Bot[]>(getStoredBots);

  useEffect(() => {
    const handleUpdate = () => setBotsState(getStoredBots());
    window.addEventListener(CHATBOT_BOTS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CHATBOT_BOTS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setBots = (action: Bot[] | ((prev: Bot[]) => Bot[])) => {
    const current = getStoredBots();
    const next = typeof action === "function" ? action(current) : action;
    saveStoredBots(next);
    setBotsState(next);
  };

  return [bots, setBots] as const;
}
