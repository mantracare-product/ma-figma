/**
 * WebsiteAgentRulesView.tsx
 * Path: src/app/components/chats/WebsiteAgentRulesView.tsx
 *
 * Website Agent automation rules table view matching WhatsAppAgentRulesView,
 * rendered with clean plain-text cells and connected website channels.
 */

import React, { useMemo, useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import TableComponent, { TableColumn, TableRowAction } from "../ui/TableComponent";
import {
  useWebsiteAgentStore,
  WebsiteAgentRule,
} from "../../../lib/websiteAgentStore";
import { useWebsiteChannels } from "../../../lib/websiteWidgetStore";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";

interface WebsiteAgentRulesViewProps {
  searchQuery?: string;
  filterType?: string;
  onEditRule?: (rule: WebsiteAgentRule) => void;
}

export default function WebsiteAgentRulesView({
  searchQuery = "",
  filterType = "all",
  onEditRule,
}: WebsiteAgentRulesViewProps) {
  const {
    rules,
    toggleRuleEnabled,
    duplicateRule,
    deleteRule,
  } = useWebsiteAgentStore();
  const { channels } = useWebsiteChannels();

  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());

  const getChannelDisplayName = (rule: WebsiteAgentRule) => {
    const found = channels.find((c) => c.id === rule.connected_channel);
    return found?.name || rule.connected_channel_name || channels[0]?.name || "Website Channel";
  };

  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        const isActive = r.is_active !== undefined ? r.is_active : r.enabled;
        if (filterType === "active" && !isActive) return false;
        if (filterType === "inactive" && isActive) return false;
        if (filterType === "new_message" && r.trigger_type !== "new_message") return false;
        if (filterType === "requirement_selected" && r.trigger_type !== "requirement_selected") {
          return false;
        }
        if (filterType === "page_url" && r.trigger_type !== "page_url") return false;
        if (filterType.startsWith("channel:")) {
          const chId = filterType.replace("channel:", "");
          if (r.connected_channel !== chId) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const chName = getChannelDisplayName(r).toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          chName.includes(q) ||
          (r.trigger_prompt || "").toLowerCase().includes(q) ||
          (r.agent_prompt || "").toLowerCase().includes(q) ||
          (r.page_url_pattern || "").toLowerCase().includes(q) ||
          (r.requirement_names || []).some((rn) => rn.toLowerCase().includes(q)) ||
          (r.keywords || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.priority - b.priority);
  }, [rules, filterType, searchQuery, channels]);

  const handleToggleStatus = (ruleId: string) => {
    try {
      toggleRuleEnabled(ruleId);
      toast.success("Website agent rule updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const columns: TableColumn<WebsiteAgentRule>[] = [
    {
      id: "name",
      header: "RULE NAME",
      align: "left",
      width: "260px",
      minWidth: "200px",
      render: (row) => (
        <Tooltip content={row.description || row.name} position="top">
          <button
            type="button"
            onClick={() => onEditRule?.(row)}
            className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate block max-w-full cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {row.name}
          </button>
        </Tooltip>
      ),
    },
    {
      id: "channel",
      header: "WEBSITE CHANNEL",
      align: "left",
      width: "200px",
      minWidth: "160px",
      render: (row) => {
        const chName = getChannelDisplayName(row);
        return (
          <Tooltip content={`Applies to: ${chName}`} position="top">
            <span className="text-xs font-medium text-slate-600 max-w-[190px] truncate block cursor-help">
              {chName}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "trigger",
      header: "TRIGGER",
      align: "left",
      width: "220px",
      minWidth: "170px",
      render: (row) => {
        const label =
          row.trigger_type === "requirement_selected"
            ? row.requirement_names?.[0] || "Pre-chat requirement"
            : row.trigger_type === "page_url"
            ? `Page: ${row.page_url_pattern || "*"}`
            : "New visitor chat";
        return (
          <Tooltip content={row.trigger_prompt || label} position="top">
            <span className="text-xs font-medium text-slate-600 max-w-[200px] truncate block cursor-help">
              {label}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "reply_with",
      header: "REPLY WITH",
      align: "left",
      width: "140px",
      minWidth: "120px",
      render: (row) => {
        const isCanned = row.reply_mode === "canned_message";
        return (
          <Tooltip
            content={
              isCanned
                ? `Fixed reply: ${row.canned_reply_text || ""}`
                : row.agent_prompt
                ? `AI Prompt: ${row.agent_prompt}`
                : "AI Prompt"
            }
            position="top"
          >
            <span className="text-xs font-medium text-slate-600 cursor-help">
              {isCanned ? "Message" : "AI"}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "handoff_conditions",
      header: "HANDOFF CONDITIONS",
      align: "left",
      width: "170px",
      minWidth: "140px",
      render: (row) => {
        const isHandoffEnabled = row.handoff_enabled !== false;
        const conditions = Array.isArray(row.handoff_conditions)
          ? row.handoff_conditions
          : row.handoff_condition_prompt
          ? [
              {
                id: "c-1",
                prompt: row.handoff_condition_prompt,
                assigneeName: row.handoff_assignee_name,
                assigneeId: row.handoff_assignee_id || 1,
                handoffMessage: row.handoff_message || "",
              },
            ]
          : [];

        const conditionCount = isHandoffEnabled ? conditions.length : 0;

        if (!isHandoffEnabled || conditionCount === 0) {
          return (
            <Tooltip content={!isHandoffEnabled ? "Handoff disabled (0 conditions)" : "0 handoff conditions"} position="top">
              <span className="text-xs font-medium text-slate-400 cursor-help">0</span>
            </Tooltip>
          );
        }

        const tooltipContent = conditions
          .map((c, i) => {
            const assigneeStr =
              Array.isArray(c.assignees) && c.assignees.length > 0
                ? c.assignees.map((a) => a.name).join(", ")
                : c.assigneeName || "Team";
            return `${i + 1}. ${c.prompt || c.title || "Condition"}\n   -> Assignees: ${assigneeStr}`;
          })
          .join("\n\n");

        return (
          <Tooltip content={tooltipContent} position="top">
            <span className="text-xs font-medium text-slate-600 cursor-help">
              {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      align: "center",
      width: "100px",
      render: (row) => {
        const isActive = row.is_active !== undefined ? row.is_active : row.enabled;
        return (
          <Tooltip content={isActive ? "Active" : "Inactive"} position="top">
            <label
              className="inline-flex items-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggleStatus(row.id)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
            </label>
          </Tooltip>
        );
      },
    },
  ];

  const rowActions: TableRowAction<WebsiteAgentRule>[] = [
    {
      label: "Edit Agent Rule",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (r) => onEditRule?.(r),
    },
    {
      label: "Duplicate Rule",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (r) => {
        duplicateRule(r);
        toast.success(`Website agent rule "${r.name}" duplicated`);
      },
    },
    {
      label: "Delete Rule",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      isDanger: true,
      onClick: (r) => {
        deleteRule(r.id);
        toast.success(`Website agent rule "${r.name}" deleted`);
      },
    },
  ];

  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      isDanger: true,
      onClick: (ids: Set<any>) => {
        ids.forEach((id) => deleteRule(id));
        setSelectedIds(new Set());
        toast.success(`${ids.size} website agent rules deleted`);
      },
    },
  ];

  return (
    <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
      <TableComponent<WebsiteAgentRule>
        data={filteredRules}
        columns={columns}
        rowActions={rowActions}
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        onRowClick={(row) => onEditRule?.(row)}
        getRowId={(row) => row.id}
        tableId="website_agent_rules_table_v1"
        emptyMessage="No website agent rules found matching your filters. Click '+ New Rule' to create your first website agent."
        defaultRowsPerPage={10}
      />
    </div>
  );
}
