import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "md-plus" | "lg" | "xl" | "2xl" | "voice-lib" | "custom-field";
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "md" }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    "md-plus": "max-w-[500px]",
    "custom-field": "max-w-[560px]",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
    "voice-lib": "w-[min(720px,90vw)]",
  };

  // Voice Library modal uses fixed positioning with internal scroll
  if (maxWidth === "voice-lib") {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col"
          style={{ width: "min(720px, 90vw)", height: "min(85vh, 800px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed, no bottom padding */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0 flex-shrink-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard modal behavior for other sizes
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-8 px-4 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-card rounded-xl shadow-lg ${maxWidthClasses[maxWidth]} w-full mb-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
