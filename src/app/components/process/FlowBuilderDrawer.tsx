import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FlowBuilderTab from "./FlowBuilderTab";
import type { WorkflowStep } from "../../types/workflow";

export interface FlowBuilderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  processName?: string;
  stageName?: string;
  processes?: any[];
  currentProcessId?: string;
  workflowSteps: WorkflowStep[];
  onWorkflowStepsChange: (steps: WorkflowStep[]) => void;
  stepAllowedTriggers?: Record<string, Array<string>>;
}

export default function FlowBuilderDrawer({
  isOpen,
  onClose,
  processName = "Current Process",
  stageName = "Stage",
  processes = [],
  currentProcessId,
  workflowSteps,
  onWorkflowStepsChange,
  stepAllowedTriggers,
}: FlowBuilderDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Capture snapshot on open to detect unsaved modifications
  useEffect(() => {
    if (isOpen) {
      setInitialSnapshot(JSON.stringify(workflowSteps || []));
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  const handleRequestClose = () => {
    const currentSnapshot = JSON.stringify(workflowSteps || []);
    if (initialSnapshot && currentSnapshot !== initialSnapshot) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Esc closes + Focus Trap inside drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleRequestClose();
        }
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showDiscardConfirm, workflowSteps, initialSnapshot]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Dim Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={handleRequestClose}
            aria-hidden="true"
          />

          {/* Drawer Panel - 75vw with Framer Motion slide ~220ms */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Flow Builder for ${stageName}`}
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-screen bg-white shadow-2xl flex flex-col z-50 border-l border-gray-200 outline-none"
            style={{
              width: "75vw",
              minWidth: "75vw",
              maxWidth: "75vw",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      className="text-sm font-bold text-gray-900 truncate"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Flow Builder · {stageName}
                    </h2>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 truncate">
                      {processName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  title="Close (Esc)"
                  aria-label="Close Flow Builder drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Unsaved Changes Banner Modal */}
            {showDiscardConfirm && (
              <div className="absolute inset-x-0 top-14 z-50 p-4 bg-amber-50 border-b border-amber-200 shadow-md flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div className="text-xs text-amber-900 font-medium">
                  <strong>Unsaved changes:</strong> You modified steps in this stage. Do you want to keep editing or close?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiscardConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  >
                    Close Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Full-canvas Body */}
            <div className="flex-1 relative overflow-hidden bg-gray-50">
              <FlowBuilderTab
                processName={processName}
                stageName={stageName}
                processes={processes}
                currentProcessId={currentProcessId}
                workflowSteps={workflowSteps}
                onWorkflowStepsChange={onWorkflowStepsChange}
                stepAllowedTriggers={stepAllowedTriggers}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
