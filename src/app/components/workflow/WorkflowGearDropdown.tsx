import React from "react";
import { useNavigate } from "react-router";
import {
  Settings,
  SlidersHorizontal,
  FolderPlus,
  FolderMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
        };
      }
      case "appointment": {
        const pName = processName || "Appointments";
        const pId = processId || "process-appointment-default";
        return {
          id: "appointments",
          label: "Appointments",
          iconName: "Calendar",
          path: "/appointments",
          workflowPath: `/process?entity=appointment&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
        };
      }
      case "invoice": {
        const pName = processName || "Invoice";
        const pId = processId || "process-invoice-default";
        return {
          id: "invoices",
          label: "Invoice",
          iconName: "Receipt",
          path: "/invoices",
          workflowPath: `/process?entity=invoice&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
        };
      }
      case "insurance": {
        const pName = processName || "Insurance & Claims";
        const pId = processId || "process-insurance-default";
        return {
          id: "insurance-claims",
          label: "Insurance & Claims",
          iconName: "ShieldCheck",
          path: "/claims",
          workflowPath: `/process?entity=insurance&processId=${pId}`,
          workflowState: { processId: pId, processName: pName },
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
      toast.success(`${target.label} removed from Workspace`);
    } else {
      addToWorkspace({
        id: target.id,
        label: target.label,
        iconName: target.iconName,
        path: target.path,
      });
      toast.success(`${target.label} added to Workspace`);
    }
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
          className="w-48 p-1 rounded-xl shadow-lg border border-slate-200/90 bg-white z-[99999] space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* 1. Edit workflow */}
          <DropdownMenuItem
            onClick={handleEditWorkflow}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Edit workflow</span>
          </DropdownMenuItem>

          {/* 2. Add to workspace / Remove from workspace */}
          <DropdownMenuItem
            onClick={handleToggleWorkspace}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              inWorkspace
                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50/70"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            {inWorkspace ? (
              <FolderMinus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="truncate">
              {inWorkspace ? "Remove from workspace" : "Add to workspace"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WorkflowGearDropdown;
