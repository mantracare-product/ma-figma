import React from "react";
import { useNavigate } from "react-router";
import {
  Settings,
  SlidersHorizontal,
  FolderPlus,
  FolderMinus,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useSidebarMenu } from "../../context/SidebarMenuContext";
import { toast } from "sonner";

export interface WorkflowGearDropdownProps {
  entityType: "process" | "appointment" | "invoice" | "insurance";
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
  const { isInWorkspace, addToWorkspace, removeFromWorkspace } = useSidebarMenu();

  // Resolve target details based on entityType
  const getEntityConfig = () => {
    switch (entityType) {
      case "process": {
        const pName = processName || "Process";
        const pId = processId || "";
        return {
          id: pId ? `process-${pId}` : "processes",
          label: pName,
          iconName: "RefreshCw",
          path: pId ? `/deals?processId=${pId}` : "/deals",
          workflowPath: pId
            ? `/process?processId=${pId}&processName=${encodeURIComponent(pName)}`
            : `/process?processName=${encodeURIComponent(pName)}`,
          workflowState: { processId: pId, processName: pName },
          automationPath: `/automation?entity=processes${pId ? `&processId=${pId}` : ""}`,
        };
      }
      case "appointment": {
        const pName = processName || "Appointment Scheduling";
        const pId = processId || "process-appointment-default";
        return {
          id: "appointments",
          label: "Appointments",
          iconName: "Calendar",
          path: "/appointments",
          workflowPath: `/process?entity=appointment&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
          automationPath: "/automation?entity=appointment",
        };
      }
      case "invoice": {
        const pName = processName || "Invoice Processing";
        const pId = processId || "process-invoice-default";
        return {
          id: "invoices",
          label: "Invoice",
          iconName: "Receipt",
          path: "/invoices",
          workflowPath: `/process?entity=invoice&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
          automationPath: "/automation?entity=invoice",
        };
      }
      case "insurance": {
        const pName = processName || "Insurance & Claims Management";
        const pId = processId || "process-insurance-default";
        return {
          id: "insurance-claims",
          label: "Insurance & Claims",
          iconName: "ShieldCheck",
          path: "/claims",
          workflowPath: `/process?entity=insurance&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
          automationPath: "/automation?entity=insurance",
        };
      }
    }
  };

  const target = getEntityConfig();
  const inWorkspace = isInWorkspace(target.id) || isInWorkspace(target.path);

  // 1. Edit Workflow
  const handleEditWorkflow = () => {
    navigate(target.workflowPath, {
      state: target.workflowState,
    });
  };

  // 2. Add / Remove from Workspace
  const handleToggleWorkspace = () => {
    if (inWorkspace) {
      removeFromWorkspace(target.id);
      toast.success(`${target.label} removed from Workspace navigation`);
    } else {
      addToWorkspace({
        id: target.id,
        label: target.label,
        iconName: target.iconName,
        path: target.path,
      });
      toast.success(`${target.label} added to Workspace navigation`);
    }
  };

  // 3. Workflow Automations
  const handleWorkflowAutomations = () => {
    navigate(target.automationPath);
  };

  // Default button styling if not provided
  const defaultBtnClass =
    "p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs";

  return (
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
          className="w-56 p-1.5 rounded-2xl shadow-xl border border-slate-200/90 bg-white/98 backdrop-blur-md z-[99999] space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workflow Options
            </span>
          </div>

          {/* 1. Edit workflow */}
          <DropdownMenuItem
            onClick={handleEditWorkflow}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-blue-50/70 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1">Edit workflow</span>
          </DropdownMenuItem>

          {/* 2. Add to workspace / Remove from workspace */}
          <DropdownMenuItem
            onClick={handleToggleWorkspace}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                inWorkspace
                  ? "bg-rose-50 text-rose-600 group-hover:bg-rose-100"
                  : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
              }`}
            >
              {inWorkspace ? (
                <FolderMinus className="w-3.5 h-3.5" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={inWorkspace ? "text-rose-600 font-semibold" : "font-semibold"}>
                {inWorkspace ? "Remove from workspace" : "Add to workspace"}
              </span>
            </div>
            {inWorkspace && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                In Workspace
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          {/* 3. Workflow automations */}
          <DropdownMenuItem
            onClick={handleWorkflowAutomations}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-amber-50/70 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1">Workflow automations</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WorkflowGearDropdown;

