import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  zIndex?: number;
}

export function BottomDrawer({ isOpen, onClose, title, subtitle, children, zIndex }: BottomDrawerProps) {
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

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: zIndex ?? 99999 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={onClose}
      />

      {/* Bottom Drawer */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 pointer-events-auto rounded-t-2xl ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "60vh" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{title}</h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-sm text-[#6B7280] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
