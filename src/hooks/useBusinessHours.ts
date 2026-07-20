import { useState, useEffect } from "react";

export interface BusinessHoursConfig {
  configured: boolean;
  summary: string; // e.g. "Mon–Sat, 9 AM – 7 PM"
}

const STORAGE_KEY = "businessHoursConfig";

// TODO(backend): replace this localStorage read with the real business-hours
// settings source once one exists. Every consumer of this hook should keep
// working unchanged when that swap happens — only this file's internals change.
export function useBusinessHours(): BusinessHoursConfig {
  const [config, setConfig] = useState<BusinessHoursConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { configured: false, summary: "" };
  });

  useEffect(() => {
    const onStorage = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      setConfig(stored ? JSON.parse(stored) : { configured: false, summary: "" });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return config;
}
