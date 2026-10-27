import React, { useState, useEffect, useRef } from "react";
import { Package, Plus, X, Search, Check, AlertCircle, Info, Tag } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { Button } from "../ui/Button";
import { getStoredServices, onServicesChanged, Service } from "../../../lib/servicesStore";
import { Process } from "../../../lib/useProcessStore";

interface ProcessProductsServicesCardProps {
  currentProcess: Process;
  allProcesses: Process[];
  onUpdateAssignedServices: (serviceIds: (number | string)[]) => void;
  readOnly?: boolean;
}

export default function ProcessProductsServicesCard({
  currentProcess,
  allProcesses,
  onUpdateAssignedServices,
  readOnly = false,
}: ProcessProductsServicesCardProps) {
  const [services, setServices] = useState<Service[]>(getStoredServices);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onServicesChanged(() => {
      setServices(getStoredServices());
    });
    return unsub;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const rawAssigned = currentProcess.assignedServiceIds || (currentProcess as any).assignedProductIds || [];
  const assignedIds = (rawAssigned as (number | string)[]).map(String);

  // Map of serviceId -> Process that has it assigned (excluding currentProcess)
  const otherAssignments = React.useMemo(() => {
    const map = new Map<string, Process>();
    allProcesses.forEach((p) => {
      if (p.id === currentProcess.id) return;
      const sIds = (p.assignedServiceIds || (p as any).assignedProductIds || []).map(String);
      sIds.forEach((id) => {
        map.set(id, p);
      });
    });
    return map;
  }, [allProcesses, currentProcess.id]);

  const assignedServices = services.filter((s) => assignedIds.includes(String(s.id)));

  const handleToggleService = (serviceId: number | string) => {
    const sIdStr = String(serviceId);
    // Disallow if already assigned to another process
    if (otherAssignments.has(sIdStr)) {
      return;
    }

    let nextIds: (number | string)[];
    if (assignedIds.includes(sIdStr)) {
      nextIds = assignedIds.filter((id) => id !== sIdStr);
    } else {
      nextIds = [...assignedIds, serviceId];
    }
    onUpdateAssignedServices(nextIds);
  };

  const handleRemoveService = (serviceId: number | string) => {
    const sIdStr = String(serviceId);
    const nextIds = assignedIds.filter((id) => id !== sIdStr);
    onUpdateAssignedServices(nextIds);
  };

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.cptCode && s.cptCode.toLowerCase().includes(q))
    );
  });

  const isAppointmentWorkflow = currentProcess.entityType === "appointment";

  return (
    <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Assigned Products & Services
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {assignedServices.length} assigned
              </span>
              <InfoTooltip
                text={
                  isAppointmentWorkflow
                    ? "Whichever product or service is assigned to this workflow, when an appointment is booked for that service, it will automatically route to this workflow. Multiple products can be assigned, but each product can belong to only one workflow."
                    : "Assign products or services to coordinate automated workflows and tracking. Each product can only be linked to one workflow."
                }
                size="sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              {isAppointmentWorkflow
                ? "Appointments booked for assigned services are automatically created in this workflow."
                : "Products & services linked exclusively to this workflow."}
            </p>
          </div>
        </div>

        {/* Add Product Button & Dropdown */}
        {!readOnly && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Product/Service</span>
            </Button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-84 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1 mb-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search services & products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-teal-500 transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredServices.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">
                      No matching products or services found.
                    </div>
                  ) : (
                    filteredServices.map((svc) => {
                      const sIdStr = String(svc.id);
                      const isSelected = assignedIds.includes(sIdStr);
                      const assignedOther = otherAssignments.get(sIdStr);
                      const isDisabled = Boolean(assignedOther);

                      return (
                        <button
                          key={svc.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleToggleService(svc.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            isDisabled
                              ? "opacity-50 bg-gray-50/70 cursor-not-allowed text-gray-400"
                              : isSelected
                              ? "bg-teal-50/80 text-teal-900 font-semibold"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium truncate">{svc.name}</span>
                              {svc.category && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                  {svc.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              <span>${svc.price || 0}</span>
                              {svc.duration && <span>· {svc.duration}m</span>}
                              {isDisabled && (
                                <span className="text-amber-600 font-medium text-[10px]">
                                  (Assigned to {assignedOther?.name})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="w-4 h-4 rounded bg-teal-600 text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : isDisabled ? (
                              <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">
                                ✕
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 mt-1 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                  A product cannot be assigned to more than one workflow.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Products Chips */}
      {assignedServices.length === 0 ? (
        <div className="py-4 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              No products or services currently assigned to this workflow.
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setDropdownOpen(true)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Select from catalog</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {assignedServices.map((svc) => (
            <div
              key={svc.id}
              className="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-teal-50/70 border border-teal-200/80 text-teal-900 text-xs shadow-2xs transition-all hover:bg-teal-100/60"
            >
              <span className="font-semibold">{svc.name}</span>
              {svc.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 font-medium">
                  {svc.category}
                </span>
              )}
              <span className="text-[11px] text-teal-700 font-medium">
                ${svc.price || 0}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveService(svc.id)}
                  className="p-0.5 rounded-full hover:bg-teal-200/80 text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
                  title="Unassign product from this workflow"
                  aria-label={`Unassign ${svc.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
