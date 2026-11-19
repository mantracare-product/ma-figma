import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import {
  BILLING_SETUP_EVENT,
  payersStore,
  type Payer,
} from "../../../lib/billingSetupStore";
import {
  PRIOR_AUTH_RULES_EVENT,
  priorAuthRulesStore,
} from "../../../lib/priorAuthRulesStore";
import { TableComponent, type TableColumn } from "../ui/TableComponent";
import PageTopBar, { type FilterFieldConfig, type TopBarMode } from "../layout/PageTopBar";
import { Tooltip } from "../ui/Tooltip";
import PayerDetailDrawer from "./PayerDetailDrawer";

export interface PayersViewProps {
  modes?: TopBarMode[];
  activeMode?: string;
  onModeChange?: (modeId: string) => void;
}

export default function PayersView({ modes, activeMode, onModeChange }: PayersViewProps = {}) {
  const { hasPermission } = useCurrentPermissions();
  const canEdit = hasPermission("billingSetup", "edit");

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(BILLING_SETUP_EVENT, bump);
    window.addEventListener(PRIOR_AUTH_RULES_EVENT, bump);
    return () => {
      window.removeEventListener(BILLING_SETUP_EVENT, bump);
      window.removeEventListener(PRIOR_AUTH_RULES_EVENT, bump);
    };
  }, []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);

  const payers = payersStore.get();
  const priorAuthRules = priorAuthRulesStore.get();

  const filteredPayers = useMemo(() => {
    return payers.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchCode = (p.payerIdCode || "").toLowerCase().includes(q);
        const matchPhone = (p.phone || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone) return false;
      }
      // Type
      if (typeFilter !== "all" && (p.type || "commercial") !== typeFilter) {
        return false;
      }
      // Active
      if (activeFilter === "active" && p.active === false) return false;
      if (activeFilter === "inactive" && p.active !== false) return false;

      // Enrollment
      if (enrollmentFilter !== "all") {
        const elig = p.enrollment?.eligibility?.status ?? p.enrollment?.status ?? "not_started";
        const clm = p.enrollment?.claims?.status ?? p.enrollment?.status ?? "not_started";
        const era = p.enrollment?.era?.status ?? p.enrollment?.status ?? "not_started";
        const enrolledCount = [elig, clm, era].filter((s) => s === "enrolled").length;

        if (enrollmentFilter === "3" && enrolledCount !== 3) return false;
        if (enrollmentFilter === "partial" && (enrolledCount === 0 || enrolledCount === 3)) return false;
        if (enrollmentFilter === "none" && enrolledCount !== 0) return false;
      }

      return true;
    });
  }, [payers, search, typeFilter, activeFilter, enrollmentFilter, tick]);

  const columns: TableColumn<Payer>[] = useMemo(
    () => [
      {
        header: "Payer Name",
        accessorKey: "name",
        render: (p) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPayerId(p.id);
              setIsDrawerOpen(true);
            }}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
          >
            {p.name}
          </button>
        ),
      },
      {
        header: "Payer ID",
        accessorKey: "payerIdCode",
        render: (p) => <span className="font-mono text-xs text-slate-700">{p.payerIdCode || "—"}</span>,
      },
      {
        header: "Type",
        accessorKey: "type",
        render: (p) => {
          const typeLabel = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : "Commercial";
          return <span className="text-slate-700">{typeLabel}</span>;
        },
      },
      {
        header: "Phone",
        accessorKey: "phone",
        render: (p) =>
          p.phone ? (
            <span className="text-slate-700">{p.phone}</span>
          ) : (
            <span className="text-[11px] text-amber-600 italic">Add the payer phone to enable benefit calls</span>
          ),
      },
      {
        header: "Enrollment",
        render: (p) => {
          const elig = p.enrollment?.eligibility?.status ?? p.enrollment?.status ?? "not_started";
          const clm = p.enrollment?.claims?.status ?? p.enrollment?.status ?? "not_started";
          const era = p.enrollment?.era?.status ?? p.enrollment?.status ?? "not_started";
          const count = [elig, clm, era].filter((s) => s === "enrolled").length;
          const chipText = count === 3 ? "3 of 3 enrolled" : count > 0 ? `${count} of 3 enrolled` : "None";
          const chipClass =
            count === 3
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
              : count > 0
              ? "bg-blue-50 text-blue-700 border-blue-200/60"
              : "bg-slate-100 text-slate-500 border-slate-200";
          const tooltip = `Eligibility: ${elig.replace("_", " ")} | Claims: ${clm.replace("_", " ")} | ERA: ${era.replace("_", " ")}`;

          return (
            <Tooltip text={tooltip}>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-block cursor-help ${chipClass}`}>
                {chipText}
              </span>
            </Tooltip>
          );
        },
      },
      {
        header: "Prior-auth rules",
        render: (p) => {
          const count = priorAuthRules.filter((r) => r.payerId === p.id).length;
          return <span className="text-slate-700">{count} {count === 1 ? "rule" : "rules"}</span>;
        },
      },
      {
        header: "Active",
        render: (p) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              p.active !== false
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {p.active !== false ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    [priorAuthRules]
  );

  const filterFields: FilterFieldConfig[] = [
    {
      id: "type",
      label: "Type",
      type: "select",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { label: "All Types", value: "all" },
        { label: "Commercial", value: "commercial" },
        { label: "Medicare", value: "medicare" },
        { label: "Medicaid", value: "medicaid" },
        { label: "Other", value: "other" },
      ],
    },
    {
      id: "enrollment",
      label: "Enrollment",
      type: "select",
      value: enrollmentFilter,
      onChange: setEnrollmentFilter,
      options: [
        { label: "All Enrollments", value: "all" },
        { label: "3 of 3 Enrolled", value: "3" },
        { label: "Partially Enrolled", value: "partial" },
        { label: "None Enrolled", value: "none" },
      ],
    },
    {
      id: "active",
      label: "Active Status",
      type: "select",
      value: activeFilter,
      onChange: setActiveFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  return (
    <div className="space-y-4" data-testid="payers-view">
      <PageTopBar
        modes={modes}
        activeMode={activeMode}
        onModeChange={onModeChange}
        showSearch
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payers by name, ID, or phone..."
        filterFields={filterFields}
        primaryAction={{
          label: "Add payer",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            setSelectedPayerId(null);
            setIsDrawerOpen(true);
          },
          disabled: !canEdit,
        }}
      />

      <TableComponent<Payer>
        data={filteredPayers}
        columns={columns}
        getRowId={(p) => p.id}
        enableSelection={false}
        enableColumnCustomization={false}
        defaultRowsPerPage={20}
        onRowClick={(p) => {
          setSelectedPayerId(p.id);
          setIsDrawerOpen(true);
        }}
        emptyMessage="No insurance payers found matching your filters."
      />

      <PayerDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        payerId={selectedPayerId}
      />
    </div>
  );
}
