import React from "react";
import { X } from "lucide-react";

export interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  width?: string; // e.g. "max-w-2xl" | "max-w-3xl"
  zIndex?: number; // e.g. 600, 650, 700
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  isGenerating?: boolean;
  children: React.ReactNode;
}

export default function DrawerShell({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  width = "max-w-[70vw]",
  zIndex = 600,
  headerRight,
  footer,
  isGenerating = false,
  children,
}: DrawerShellProps) {
  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isGenerating) {
      if (window.confirm("PDF generation in progress — cancel?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex justify-end overflow-hidden"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={handleAttemptClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full ${width} bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-200`}
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2
                className="text-base font-bold text-gray-900 truncate"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  className="text-xs text-gray-500 truncate mt-0.5"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerRight}
            <button
              type="button"
              onClick={handleAttemptClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 min-h-0">
          {children}
        </div>

        {/* Drawer Sticky Footer */}
        {footer && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
