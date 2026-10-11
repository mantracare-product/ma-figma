import React, { useState } from "react";
import { Shield, Globe, Lock, ChevronDown } from "lucide-react";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import type { ScopingRule } from "../../../context/FieldRegistryContext";

export interface AdminPermissionsConfig {
  canHide?: boolean;
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
  canDuplicate?: boolean;
}

export interface AdminControlAccordionProps {
  scopingRules: ScopingRule[];
  onScopingRulesChange: (rules: ScopingRule[]) => void;
  allowEntities?: boolean;
  isReadOnly?: boolean;
  
  // Custom permissions controls or standard permissions
  permissions?: AdminPermissionsConfig;
  onPermissionsChange?: (permissions: AdminPermissionsConfig) => void;
  permissionsContent?: React.ReactNode;
  
  // Custom tooltips
  scopeTooltip?: string;
  permissionsTooltip?: string;

  // Initial expand states (default admin control open: true, scope open: true, permissions open: false)
  defaultAdminControlOpen?: boolean;
  defaultScopeOpen?: boolean;
  defaultPermissionsOpen?: boolean;
  className?: string;
}

export function AdminControlAccordion({
  scopingRules,
  onScopingRulesChange,
  allowEntities = false,
  isReadOnly = false,
  permissions,
  onPermissionsChange,
  permissionsContent,
  scopeTooltip = "Define which tenant organizations have visibility to this item based on industry category, industries, and locations.",
  permissionsTooltip = "Configure what tenant users are permitted to do with this item in their workspace.",
  defaultAdminControlOpen = true,
  defaultScopeOpen = false,
  defaultPermissionsOpen = false,
  className = "",
}: AdminControlAccordionProps) {
  const [adminControlOpen, setAdminControlOpen] = useState(defaultAdminControlOpen);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(defaultScopeOpen);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(defaultPermissionsOpen);

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs ${className}`}>
      {/* Admin Control Main Header */}
      <button
        type="button"
        onClick={() => setAdminControlOpen((v) => !v)}
        className="w-full px-3.5 py-2.5 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-gray-600 shrink-0" />
          <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider" title="Configure scope rules and permissions">
            ADMIN CONTROL
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
            adminControlOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {adminControlOpen && (
        <div className="p-3 space-y-2.5 border-t border-gray-100 bg-gray-50/30">
          {/* 1. Scope Option Dropdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setScopeDropdownOpen((v) => !v)}
              className="w-full px-3 py-2 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">
                  Scope Rules
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <InfoTooltip text={scopeTooltip} size="sm" />
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
                  scopeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {scopeDropdownOpen && (
              <div className="p-3 border-t border-gray-100 bg-white">
                <AdminScopingRulesEditor
                  rules={scopingRules}
                  onChange={onScopingRulesChange}
                  allowEntities={allowEntities}
                  isReadOnly={isReadOnly}
                  showHeader={false}
                />
              </div>
            )}
          </div>

          {/* 2. Permissions Dropdown */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setPermissionsDropdownOpen((v) => !v)}
              className="w-full px-3 py-2 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-800">
                  Permissions
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <InfoTooltip text={permissionsTooltip} size="sm" />
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
                  permissionsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {permissionsDropdownOpen && (
              <div className="p-3 border-t border-gray-100 bg-white">
                {permissionsContent ? (
                  permissionsContent
                ) : (
                  <div className="flex items-center gap-6 flex-wrap">
                    {/* Hide permission */}
                    <div className="flex items-center">
                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={permissions?.canHide !== false}
                          onChange={(e) =>
                            onPermissionsChange?.({
                              ...permissions,
                              canHide: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800">Hide</span>
                      </label>
                      <InfoTooltip text="Tenant users can choose to show or hide this item in their workspace." size="sm" />
                    </div>

                    {/* Edit permission */}
                    <div className="flex items-center">
                      <label className="flex items-center gap-1.5 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={permissions?.canEdit !== false}
                          onChange={(e) =>
                            onPermissionsChange?.({
                              ...permissions,
                              canEdit: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-800">Edit</span>
                      </label>
                      <InfoTooltip text="Tenant users can customize and edit this item." size="sm" />
                    </div>

                    {/* Add / Add stages or options permission */}
                    {permissions?.canAdd !== undefined && (
                      <div className="flex items-center">
                        <label className="flex items-center gap-1.5 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={permissions.canAdd !== false}
                            onChange={(e) =>
                              onPermissionsChange?.({
                                ...permissions,
                                canAdd: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-gray-800">Add / Expand</span>
                        </label>
                        <InfoTooltip text="Tenant users can add new sub-items or options." size="sm" />
                      </div>
                    )}

                    {/* Delete permission */}
                    {permissions?.canDelete !== undefined && (
                      <div className="flex items-center">
                        <label className="flex items-center gap-1.5 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={permissions.canDelete !== false}
                            onChange={(e) =>
                              onPermissionsChange?.({
                                ...permissions,
                                canDelete: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-gray-800">Delete</span>
                        </label>
                        <InfoTooltip text="Tenant users can delete this item." size="sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminControlAccordion;
