"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}

const widthStyles = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "lg",
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Frosted Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`
          relative z-50 w-full ${widthStyles[width]} h-full flex flex-col justify-between
          bg-white/95 backdrop-blur-2xl border-l border-white/80
          shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)]
          transition-transform duration-300 ease-out
          animate-in slide-in-from-right duration-300
        `}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200/60 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-[#222222]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[#222222] hover:bg-slate-100/80 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div className="p-5 border-t border-slate-200/60 bg-white/50 backdrop-blur-md flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
