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
  entityType: "process" | "appointment" | "invoice" | "insurance" | "claim";
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
    switch (entityType === "claim" ? "insurance" : entityType) {
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
            workflowPath: `/process?entity=${entityType === "claim" ? "claim" : "insurance"}&processId=${encodeURIComponent(pId)}&processName=${encodeURIComponent(pName)}`,
            workflowState: { processId: pId, processName: pName },
          };
        }

        return {
          id: "insurance-claims",
          label: "Insurance & Claims",
          iconName: "ShieldCheck",
          path: "/claims",
          workflowPath: `/process?entity=${entityType === "claim" ? "claim" : "insurance"}&processId=${encodeURIComponent(pId)}`,
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

          {/* 2. Add to workspace / Remove from workspace */}
          <DropdownMenuItem
            onClick={handleToggleWorkspace}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors outline-none ${
              inWorkspace
                ? "text-rose-600 focus:bg-slate-100 focus:text-rose-600 hover:bg-slate-100 hover:text-rose-600 data-[highlighted]:bg-slate-100 data-[highlighted]:text-rose-600"
                : "text-slate-700 focus:bg-slate-100 focus:text-slate-900 hover:bg-slate-100 hover:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
            }`}
          >
            {inWorkspace ? (
              <FolderMinus className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {inWorkspace ? "Remove from workspace" : "Add to workspace"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WorkflowGearDropdown;
