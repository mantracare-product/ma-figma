import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  GripVertical,
  Plus,
  GitBranch,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Mail,
  FileText,
  Clock,
  Zap,
  UserCheck,
  ClipboardList,
  Globe,
  Calendar,
  Volume2,
  Trash2,
  Copy,
  Info,
  Pencil,
  MoreVertical,
} from "lucide-react";
import type { WorkflowStep } from "../../types/workflow";
import { Tooltip } from "../ui/Tooltip";

export interface StageAutomationCardsProps {
  stageId: string;
  stageName: string;
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  onAddAutomation: () => void;
  onEditStep: (step: WorkflowStep) => void;
  onDuplicateStep?: (step: WorkflowStep) => void;
  onDeleteStep?: (stepId: string) => void;
}

const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  phonecall: <PhoneCall className="w-4 h-4" />,
  callaction: <PhoneCall className="w-4 h-4" />,
  callhangup: <PhoneCall className="w-4 h-4" />,
  messagecircle: <MessageCircle className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  messagesquare: <MessageSquare className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  filetext: <FileText className="w-4 h-4" />,
  autoinvoice: <FileText className="w-4 h-4" />,
  clipboardlist: <ClipboardList className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  scheduleappointment: <Calendar className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  usercheck: <UserCheck className="w-4 h-4" />,
  assignhuman: <UserCheck className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  volume2: <Volume2 className="w-4 h-4" />,
};

function getStepIcon(step: WorkflowStep) {
  const key = (step.stepKey || step.iconKey || "").toLowerCase();
  return STEP_ICON_MAP[key] || <Zap className="w-4 h-4" />;
}

function getTriggerBadge(trigger?: string) {
  switch (trigger) {
    case "incall":
      return {
        label: "In call",
        className: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
        tooltip: "Executes mid-conversation when triggered by the AI receptionist.",
      };
    case "postcall":
      return {
        label: "Post call",
        className: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
        tooltip: "Executes automatically immediately after the call concludes.",
      };
    case "inchat":
      return {
        label: "In chat",
        className: "bg-sky-50 text-sky-700 border-sky-200",
        dot: "bg-sky-500",
        tooltip: "Executes during chat conversations across WhatsApp or SMS.",
      };
    case "stage":
    default:
      return {
        label: "On entry",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        tooltip: "Runs automatically when a record transitions into this stage.",
      };
  }
}

function getStepSummaryTooltip(step: WorkflowStep): string {
  const parts: string[] = [];
  if (step.delayValue && step.delayValue > 0) {
    parts.push(`delay of ${step.delayValue} ${step.delayUnit || "min"}`);
  }
  if (step.executionType === "parallel") {
    parts.push("runs in parallel");
  }
  if (step.params?.conditionsEnabled) {
    parts.push("active conditions");
  }
  if (step.params?.actionReason) {
    parts.push(`reason: "${step.params.actionReason}"`);
  }
  if (parts.length === 0) {
    return "Runs automatically on stage transition without delay.";
  }
  return `Configured with ${parts.join(", ")}.`;
}

interface DraggableCardProps {
  step: WorkflowStep;
  index: number;
  stageId: string;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
}

const DraggableAutomationCard: React.FC<DraggableCardProps> = ({
  step,
  index,
  stageId,
  moveCard,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = getTriggerBadge(step.trigger);
  const isEnabled = step.enabled !== false;
  const tooltipText = getStepSummaryTooltip(step);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  const [{ isDragging }, drag] = useDrag({
    type: `AUTOMATION_CARD_${stageId}`,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: `AUTOMATION_CARD_${stageId}`,
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={onEdit}
      className={`group relative flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
        isOver
          ? "border-blue-400 bg-blue-50/30 scale-[1.005]"
          : isEnabled
          ? "border-gray-200/90 hover:border-gray-300"
          : "border-gray-200/60 bg-gray-50/50 opacity-60"
      } ${isDragging ? "opacity-30 scale-95" : ""}`}
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* Left: Drag Handle + Icon + Name + Lane Badge + Tooltip */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5 -ml-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          {getStepIcon(step)}
        </div>

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span
            className={`text-sm font-semibold truncate ${
              isEnabled ? "text-gray-900" : "text-gray-500 line-through"
            }`}
          >
            {step.name}
          </span>

          {/* Lane Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${badge.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </span>

          {/* Parameters & Delay Info Tooltip */}
          <Tooltip text={tooltipText} placement="top">
            <span
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-gray-400 hover:text-gray-600 cursor-help p-0.5"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Right: On/Off Toggle + Overflow Menu */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Micro Toggle Switch */}
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
            isEnabled ? "bg-blue-600" : "bg-gray-300"
          }`}
          title={isEnabled ? "Active (click to pause)" : "Paused (click to activate)"}
          aria-label={isEnabled ? "Disable automation" : "Enable automation"}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              isEnabled ? "right-0.5" : "left-0.5"
            }`}
          />
        </button>

        {/* Overflow Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-500" />
                <span>Edit</span>
              </button>

              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Duplicate</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left border-t border-gray-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function StageAutomationCards({
  stageId,
  stageName,
  steps,
  onStepsChange,
  onAddAutomation,
  onEditStep,
  onDuplicateStep,
  onDeleteStep,
}: StageAutomationCardsProps) {
  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const updated = [...steps];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, removed);
    onStepsChange(updated);
  };

  const toggleStepEnabled = (stepId: string) => {
    const updated = steps.map((s) =>
      s.id === stepId ? { ...s, enabled: s.enabled === false ? true : false } : s
    );
    onStepsChange(updated);
  };

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
        <span className="text-xs font-medium text-gray-500" style={{ fontFamily: "DM Sans, sans-serif" }}>
          No automations yet
        </span>
        <button
          type="button"
          onClick={onAddAutomation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add automation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-150">
      {steps.map((step, idx) => (
        <DraggableAutomationCard
          key={step.id || idx}
          step={step}
          index={idx}
          stageId={stageId}
          moveCard={moveCard}
          onEdit={() => onEditStep(step)}
          onDuplicate={
            onDuplicateStep
              ? () => onDuplicateStep(step)
              : undefined
          }
          onToggleEnabled={(e) => {
            e.stopPropagation();
            toggleStepEnabled(step.id);
          }}
          onDelete={
            onDeleteStep
              ? () => onDeleteStep(step.id)
              : undefined
          }
        />
      ))}
    </div>
  );
}
