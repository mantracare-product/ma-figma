/**
 * PermissionSelect.tsx
 * Path: src/app/components/settings/PermissionSelect.tsx
 *
 * Premium multi-select dropdown for module permissions (Read, Write, Delete, Import, Export).
 * Implements strict access rules:
 * - Read-only users cannot select Write and Delete, but CAN select Import and Export.
 * - When Write is enabled, all core access (Read, Write, Delete) is automatically granted.
 * - Rendered with portaled popover so it is never clipped by table overflow or drawer boundaries.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Lock, X } from "lucide-react";
import { toast } from "sonner";

export type PermissionAction = "read" | "write" | "delete" | "import" | "export";

export interface PermissionActionMeta {
  id: PermissionAction;
  label: string;
  badge: string;
  hint: string;
}

export const PERMISSION_ACTIONS: PermissionActionMeta[] = [
  { id: "read", label: "Read", badge: "View", hint: "View records & details" },
  { id: "write", label: "Write", badge: "All Access", hint: "Full access (Read, Write & Delete)" },
  { id: "delete", label: "Delete", badge: "Remove", hint: "Delete records (Requires Write)" },
  { id: "import", label: "Import", badge: "Upload", hint: "Import data (Allowed in Read-only)" },
  { id: "export", label: "Export", badge: "Download", hint: "Export data (Allowed in Read-only)" },
];

export interface PermissionSelectProps {
  value?: PermissionAction[];
  onChange: (actions: PermissionAction[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowInherit?: boolean;
  isInherit?: boolean;
  onToggleInherit?: (inherit: boolean) => void;
}

export default function PermissionSelect({
  value = [],
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  allowInherit = false,
  isInherit = false,
  onToggleInherit,
}: PermissionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    showAbove: boolean;
  } | null>(null);

  const hasWrite = value.includes("write");

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 250;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const width = Math.max(rect.width, 270);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    if (showAbove) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left,
        width,
        showAbove: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
        width,
        showAbove: false,
      });
    }
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const toggleAction = (actionId: PermissionAction) => {
    if (allowInherit && isInherit) {
      onToggleInherit?.(false);
    }
    const isChecked = value.includes(actionId);
    let updated: PermissionAction[];

    if (actionId === "write") {
      if (isChecked) {
        // Unchecking write removes write AND delete (switches to Read-only mode)
        updated = value.filter((a) => a !== "write" && a !== "delete");
        if (!updated.includes("read")) {
          updated.push("read");
        }
      } else {
        // "if write then all access is there":
        // Selecting write automatically includes Read, Write, and Delete
        const set = new Set<PermissionAction>([...value, "read", "write", "delete"]);
        updated = Array.from(set);
      }
    } else if (actionId === "delete") {
      // If user is read-only (write is off), cannot select delete
      if (!hasWrite) {
        toast.info("Write access is required to enable Delete.");
        return;
      }
      if (isChecked) {
        updated = value.filter((a) => a !== "delete");
      } else {
        updated = [...value, "delete"];
      }
    } else if (actionId === "read") {
      if (isChecked) {
        // Unchecking read clears core access (read, write, delete)
        updated = value.filter((a) => a !== "read" && a !== "write" && a !== "delete");
      } else {
        updated = [...value, "read"];
      }
    } else {
      // "import" and "export" can be freely toggled in both read-only and write mode
      if (isChecked) {
        updated = value.filter((a) => a !== actionId);
      } else {
        const next = [...value, actionId];
        if (!next.includes("read")) {
          next.push("read");
        }
        updated = next;
      }
    }
    onChange(updated);
  };

  const selectAll = () => {
    if (allowInherit && isInherit) {
      onToggleInherit?.(false);
    }
    onChange(["read", "write", "delete", "import", "export"]);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Format trigger label
  const renderTriggerContent = () => {
    if (allowInherit && isInherit) {
      return (
        <span className="text-xs font-semibold text-gray-800">
          Inherit
        </span>
      );
    }

    if (value.length === 0) {
      return (
        <span className="text-gray-400 italic text-xs font-normal">
          {placeholder}
        </span>
      );
    }

    if (value.length === 5) {
      return (
        <span className="text-xs font-semibold text-gray-800 truncate" title="All Permissions (Read, Write, Delete, Import, Export)">
          All (Read, Write, Delete, Import, Export)
        </span>
      );
    }

    if (hasWrite && value.includes("delete") && value.includes("read") && value.length === 3) {
      return (
        <span className="text-xs font-semibold text-blue-700 truncate" title="Full Access (Read, Write, Delete)">
          All Access (Read, Write, Delete)
        </span>
      );
    }

    if (!hasWrite && value.includes("read")) {
      const extra = value.filter((a) => a !== "read").map((a) => a.charAt(0).toUpperCase() + a.slice(1));
      if (extra.length === 0) {
        return (
          <span className="text-xs font-medium text-emerald-700 truncate" title="Read Only">
            Read Only
          </span>
        );
      }
      return (
        <span className="text-xs font-medium text-gray-800 truncate" title={`Read Only (${extra.join(", ")})`}>
          Read Only ({extra.join(", ")})
        </span>
      );
    }

    // Active action names capitalized in canonical order
    const orderedLabels = PERMISSION_ACTIONS.filter((a) => value.includes(a.id)).map(
      (a) => a.label
    );

    return (
      <span className="text-xs font-medium text-gray-800 truncate" title={orderedLabels.join(", ")}>
        {orderedLabels.join(", ")}
      </span>
    );
  };

  return (
    <div className="relative w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`w-full h-9 px-3 pr-8 bg-white border rounded-xl text-left flex items-center justify-between transition-all outline-none shadow-2xs cursor-pointer ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10"
            : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`}
      >
        <div className="min-w-0 flex-1 truncate">{renderTriggerContent()}</div>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {value.length > 0 && value.length < 5 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 border border-blue-200/50">
              {value.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.showAbove ? "auto" : `${coords.top}px`,
              bottom: coords.showAbove ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
              fontFamily: "Outfit, sans-serif",
            }}
            className="bg-white border border-gray-200/90 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header with Quick Presets */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50/90 border-b border-gray-100 text-[11px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Permissions ({value.length}/5)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                >
                  Select All
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Checkbox Options List */}
            <div className="p-1.5 space-y-0.5">
              {allowInherit && (
                <div
                  onClick={() => {
                    onToggleInherit?.(true);
                    onChange([]);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs mb-1 border-b border-gray-100 pb-2 ${
                    isInherit
                      ? "bg-blue-50/70 text-blue-950 font-bold"
                      : "hover:bg-slate-50 text-gray-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                        isInherit
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isInherit && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs">Inherit</span>
                  </div>
                  <span className={`text-[10px] shrink-0 ml-2 ${isInherit ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
                    Inherit from parent module
                  </span>
                </div>
              )}

              {PERMISSION_ACTIONS.map((action) => {
                const isChecked = value.includes(action.id);
                const isDeleteLocked = action.id === "delete" && !hasWrite;

                return (
                  <div
                    key={action.id}
                    onClick={() => toggleAction(action.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-xs ${
                      isDeleteLocked
                        ? "opacity-45 cursor-not-allowed bg-slate-50/60"
                        : "cursor-pointer"
                    } ${
                      isChecked
                        ? "bg-blue-50/70 text-blue-950 font-semibold"
                        : "hover:bg-slate-50 text-gray-700 font-medium"
                    }`}
                    title={
                      isDeleteLocked
                        ? "Write access is required to enable Delete"
                        : action.hint
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : isDeleteLocked
                            ? "border-gray-200 bg-gray-100 text-gray-400"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        {isDeleteLocked && !isChecked && <Lock className="w-2.5 h-2.5 text-gray-400" />}
                      </div>
                      <span className="text-xs truncate">{action.label}</span>
                    </div>

                    <span
                      className={`text-[10px] shrink-0 ml-2 ${
                        isDeleteLocked
                          ? "text-slate-400 italic"
                          : isChecked
                          ? "text-blue-600 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {isDeleteLocked ? "Requires Write" : action.hint}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
