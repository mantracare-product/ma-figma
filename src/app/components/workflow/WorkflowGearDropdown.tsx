import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import {
  Settings,
  SlidersHorizontal,
  FolderPlus,
  FolderMinus,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { useSidebarMenu } from "../../context/SidebarMenuContext";
import { getSidebarIcon } from "../layout/ConfigureMenuModal";
import { toast } from "sonner";

export const AVAILABLE_SIDEBAR_ICONS = [
  { name: "CheckSquare", label: "Checklist / Tasks" },
  { name: "RefreshCw", label: "Process / Flow" },
  { name: "Calendar", label: "Calendar" },
  { name: "Receipt", label: "Receipt / Invoice" },
  { name: "ShieldCheck", label: "Shield / Claims" },
  { name: "Package", label: "Package / Services" },
  { name: "FileText", label: "Document / Form" },
  { name: "BarChart3", label: "Reports / Metrics" },
  { name: "Users", label: "Contacts / Patients" },
  { name: "Phone", label: "Calls / Logs" },
  { name: "MessageCircle", label: "Chats / Messages" },
  { name: "Stethoscope", label: "Clinical / Scribe" },
  { name: "Zap", label: "Automation" },
  { name: "Folder", label: "Folder" },
  { name: "Bookmark", label: "Bookmark" },
  { name: "Star", label: "Starred" },
  { name: "SlidersHorizontal", label: "Workflows" },
  { name: "Database", label: "Knowledge Base" },
];

export interface WorkflowGearDropdownProps {
  entityType: "process" | "appointment" | "invoice" | "insurance" | "task";
  processId?: string;
  processName?: string;
  className?: string;
  buttonClassName?: string;
  align?: "start" | "end" | "center";
}

export const WorkflowGearDropdown: React.FC<WorkflowGearDropdownProps> = ({
  entityType,
  processId,
  processName,
  className = "",
  buttonClassName,
  align = "end",
}) => {
  const navigate = useNavigate();
  const {
    config,
    isInSidebar,
    addToSidebar,
    removeFromSidebar,
    isInWorkspace,
    removeFromWorkspace,
  } = useSidebarMenu();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedIconName, setSelectedIconName] = useState("");

  // Resolve target details based on entityType
  const getEntityConfig = () => {
    switch (entityType) {
      case "process": {
        const pName = (processName || "").trim();
        const pId = processId || "";
        const isSpecific = Boolean(
          pName &&
          pName.toLowerCase() !== "process" &&
          pName.toLowerCase() !== "all processes"
        );
        const slug = pName
          ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "";

        if (isSpecific) {
          return {
            id: `process-${slug || pId}`,
            label: pName,
            iconName: "RefreshCw",
            path: `/deals?process=${encodeURIComponent(pName)}`,
            workflowPath: pId
              ? `/process?processId=${encodeURIComponent(pId)}&processName=${encodeURIComponent(pName)}`
              : `/process?processName=${encodeURIComponent(pName)}`,
            workflowState: { processId: pId, processName: pName },
          };
        }

        return {
          id: "processes",
          label: "Process",
          iconName: "RefreshCw",
          path: "/deals",
          workflowPath: "/process",
          workflowState: {},
        };
      }
      case "appointment": {
        const pName = (processName || "").trim();
        const pId = processId || "";
        const isSpecific = Boolean(
          pName &&
          pName.toLowerCase() !== "appointments" &&
          pName.toLowerCase() !== "all appointments"
        );
        const slug = pName
          ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "";

        if (isSpecific) {
          const itemPath = pId
            ? `/appointments?processId=${encodeURIComponent(pId)}&process=${encodeURIComponent(pName)}`
            : `/appointments?process=${encodeURIComponent(pName)}`;

          return {
            id: `appointment-${slug || pId}`,
            label: pName,
            iconName: "Calendar",
            path: itemPath,
            workflowPath: `/process?entity=appointment&processId=${encodeURIComponent(pId || "process-appointment-default")}&processName=${encodeURIComponent(pName)}`,
            workflowState: { processId: pId, processName: pName },
          };
        }

        return {
          id: "appointments",
          label: "Appointments",
          iconName: "Calendar",
          path: "/appointments",
          workflowPath: `/process?entity=appointment&processId=${encodeURIComponent(pId || "process-appointment-default")}`,
          workflowState: { processId: pId, processName: pName },
        };
      }
      case "invoice": {
        const pName = (processName || "").trim();
        const pId = processId || "process-invoice-default";
        const isSpecific = Boolean(
          pName &&
          pName.toLowerCase() !== "invoice" &&
          pName.toLowerCase() !== "invoices"
        );
        const slug = pName
          ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "";

        if (isSpecific) {
          return {
            id: `invoice-${slug || pId}`,
            label: pName,
            iconName: "Receipt",
            path: `/invoices?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`,
            workflowPath: `/process?entity=invoice&processId=${encodeURIComponent(pId)}&processName=${encodeURIComponent(pName)}`,
            workflowState: { processId: pId, processName: pName },
          };
        }

        return {
          id: "invoices",
          label: "Invoice",
          iconName: "Receipt",
          path: "/invoices",
          workflowPath: `/process?entity=invoice&processId=${encodeURIComponent(pId)}`,
          workflowState: { processId: pId, processName: pName },
        };
      }
      case "insurance": {
        const pName = (processName || "").trim();
        const pId = processId || "process-insurance-default";
        const isSpecific = Boolean(
          pName &&
          pName.toLowerCase() !== "insurance & claims" &&
          pName.toLowerCase() !== "insurance and claims" &&
          pName.toLowerCase() !== "claims" &&
          pName.toLowerCase() !== "insurance"
        );
        const slug = pName
          ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "";

        if (isSpecific) {
          return {
            id: `insurance-${slug || pId}`,
            label: pName,
            iconName: "ShieldCheck",
            path: `/claims?process=${encodeURIComponent(pName)}&processId=${encodeURIComponent(pId)}`,
            workflowPath: `/process?entity=insurance&processId=${encodeURIComponent(pId)}&processName=${encodeURIComponent(pName)}`,
            workflowState: { processId: pId, processName: pName },
          };
        }

        return {
          id: "insurance-claims",
          label: "Insurance & Claims",
          iconName: "ShieldCheck",
          path: "/claims",
          workflowPath: `/process?entity=insurance&processId=${encodeURIComponent(pId)}`,
          workflowState: { processId: pId, processName: pName },
        };
      }
      case "task": {
        const pName = (processName || "").trim();
        const pId = processId || "";
        const isSpecific = Boolean(
          pName &&
          pName.toLowerCase() !== "task" &&
          pName.toLowerCase() !== "all tasks" &&
          pName.toLowerCase() !== "general tasks"
        );
        const slug = pName
          ? pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "";

        return {
          id: isSpecific ? `task-wf-${slug || pId}` : "tasks",
          label: isSpecific ? pName : "Tasks",
          iconName: "CheckSquare",
          path: isSpecific ? `/tasks?workflow=${encodeURIComponent(pId || pName)}` : "/tasks",
          workflowPath: pId
            ? `/process?entity=task&processId=${encodeURIComponent(pId)}&processName=${encodeURIComponent(pName)}`
            : "/process?entity=task",
          workflowState: { processId: pId, processName: pName, entityType: "task" },
        };
      }
    }
  };

  const target = getEntityConfig();
  const inSidebar = (isInSidebar && (isInSidebar(target.id) || isInSidebar(target.path))) ||
    isInWorkspace(target.id) || isInWorkspace(target.path);

  // 1. Edit Workflow
  const handleEditWorkflow = () => {
    navigate(target.workflowPath, {
      state: target.workflowState,
    });
  };

  // 2. Add / Remove from Sidebar
  const handleRemoveFromSidebar = () => {
    if (removeFromSidebar) {
      removeFromSidebar(target.id);
    } else {
      removeFromWorkspace(target.id);
    }
    toast.success(`"${target.label}" removed from sidebar`);
  };

  const handleOpenAddModal = () => {
    setCustomItemName(target.label);
    const defaultSec = config.sections.find((s) => s.id === "workspace") || config.sections[0];
    setSelectedSectionId(defaultSec?.id || "");
    setSelectedIconName(target.iconName || "LayoutDashboard");
    setIsAddModalOpen(true);
  };

  const handleConfirmAddToSidebar = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const finalLabel = customItemName.trim() || target.label;
    const secId = selectedSectionId || config.sections[0]?.id || "workspace";
    const targetSec = config.sections.find((s) => s.id === secId) || config.sections[0];

    addToSidebar(secId, {
      id: target.id,
      label: finalLabel,
      iconName: selectedIconName || target.iconName || "LayoutDashboard",
      path: target.path,
    });
    toast.success(`"${finalLabel}" added to ${targetSec?.title || "sidebar"}`);
    setIsAddModalOpen(false);
  };

  // Default button styling if not provided
  const defaultBtnClass =
    "p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs";

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={buttonClassName || defaultBtnClass}
              aria-label={`Configure ${target.label} workflow`}
              title={`Configure ${target.label} workflow`}
            >
              <Settings className="w-4 h-4 text-slate-600 hover:text-slate-900 transition-colors" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align={align}
            sideOffset={6}
            className="w-52 p-1 rounded-xl shadow-lg border border-slate-200/90 bg-white z-[99999] space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* 1. Edit workflow */}
            <DropdownMenuItem
              onClick={handleEditWorkflow}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900 hover:bg-slate-100 hover:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 rounded-lg cursor-pointer transition-colors outline-none"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">Edit workflow</span>
            </DropdownMenuItem>

            {/* 2. Add to sidebar / Remove from sidebar */}
            {inSidebar ? (
              <DropdownMenuItem
                onClick={handleRemoveFromSidebar}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors outline-none text-rose-600 focus:bg-slate-100 focus:text-rose-600 hover:bg-slate-100 hover:text-rose-600 data-[highlighted]:bg-slate-100 data-[highlighted]:text-rose-600"
              >
                <FolderMinus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="whitespace-nowrap">Remove from sidebar</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleOpenAddModal}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors outline-none text-slate-700 focus:bg-slate-100 focus:text-slate-900 hover:bg-slate-100 hover:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
              >
                <FolderPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="whitespace-nowrap">Add to sidebar</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add to Sidebar Modal Dialog */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsAddModalOpen(false)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150 text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Add to Sidebar</h3>
                    <p className="text-xs text-slate-500">Choose a section and name</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Inputs */}
              <form onSubmit={handleConfirmAddToSidebar} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="e.g. Patient Intake"
                    autoFocus
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white cursor-pointer"
                  >
                    {config.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Icon</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {AVAILABLE_SIDEBAR_ICONS.find((i) => i.name === selectedIconName)?.label || selectedIconName}
                    </span>
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto no-scrollbar">
                    {AVAILABLE_SIDEBAR_ICONS.map((iconItem) => {
                      const IconComp = getSidebarIcon(iconItem.name);
                      const isSelected = selectedIconName === iconItem.name;
                      return (
                        <button
                          key={iconItem.name}
                          type="button"
                          onClick={() => setSelectedIconName(iconItem.name)}
                          className={`h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white border-2 border-blue-600 text-blue-600 shadow-xs scale-105"
                              : "bg-white/80 hover:bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                          }`}
                          title={iconItem.label}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!customItemName.trim()}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#1456f0] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Add to Sidebar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default WorkflowGearDropdown;
