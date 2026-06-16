import { createContext, useContext, useState, ReactNode } from "react";

interface HowItWorksContextType {
  shouldShowModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  seeLater: () => void;
  dontShowAgain: () => void;
  triggerAutoOpen: () => void;
}

const HowItWorksContext = createContext<HowItWorksContextType | undefined>(undefined);

const SESSION_DISMISSED_KEY = "howItWorks_dismissedThisSession";
const PERMANENT_PREFERENCE_KEY = "howItWorks_dontShowAgain";

export function HowItWorksProvider({ children }: { children: ReactNode }) {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  const isDismissedThisSession = () => {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
  };

  const isPermanentlyDismissed = () => {
    return localStorage.getItem(PERMANENT_PREFERENCE_KEY) === "true";
  };

  const openModal = () => {
    setShouldShowModal(true);
  };

  const closeModal = () => {
    // Close icon behaves like "See later" - dismiss for this session
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    setShouldShowModal(false);
  };

  const seeLater = () => {
    // Dismiss for this session only
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    setShouldShowModal(false);
  };

  const dontShowAgain = () => {
    // Permanently dismiss the modal
    localStorage.setItem(PERMANENT_PREFERENCE_KEY, "true");
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    setShouldShowModal(false);
  };

  const triggerAutoOpen = () => {
    // Only auto-open if:
    // 1. Not permanently dismissed
    // 2. Not dismissed in this session
    if (!isPermanentlyDismissed() && !isDismissedThisSession()) {
      setShouldShowModal(true);
    }
  };

  return (
    <HowItWorksContext.Provider
      value={{
        shouldShowModal,
        openModal,
        closeModal,
        seeLater,
        dontShowAgain,
        triggerAutoOpen,
      }}
    >
      {children}
    </HowItWorksContext.Provider>
  );
}

export function useHowItWorks() {
  const context = useContext(HowItWorksContext);
  if (context === undefined) {
    throw new Error("useHowItWorks must be used within a HowItWorksProvider");
  }
  return context;
}
