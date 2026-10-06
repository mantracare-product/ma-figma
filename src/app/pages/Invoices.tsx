import React, { useState, useRef, useEffect, useMemo } from "react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { useInvoices } from "../context/InvoiceContext";
import { ClientInvoice, InvoiceStatus } from "../types/invoiceTypes";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../components/invoices/CreateInvoiceDrawer";
import InvoiceDocumentModal from "../components/invoices/InvoiceDocumentModal";
import InvoiceProgressBar from "../components/invoices/InvoiceProgressBar";
import RecordPaymentModal from "../components/invoices/RecordPaymentModal";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { toast } from "sonner";
import { getClientList } from "../../lib/getClientList";
import {
  Search,
  Settings as SettingsIcon,
  Plus,
  CreditCard,
  Wallet,
  List,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
} from "lucide-react";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses } from "../../lib/useProcessStore";
import { getStoredStageMoves, StageMove } from "../../lib/useAutomationStore";
import { invoiceService } from "../../lib/invoiceService";
import StageMovementTimelineModal from "../components/automation/StageMovementTimelineModal";

export default function Invoices() {
  const { invoices, updateInvoiceStatus, sendInvoice, recordPayment, deleteInvoice, voidInvoice } = useInvoices();
  const allClients = getClientList();

  // Metrics calculations
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const outstandingAmount = invoices
    .filter((i) => ["sent", "viewed", "partial", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + (i.total - (i.amountPaid || 0)), 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" || (i.amountPaid && i.amountPaid > 0))
    .reduce((sum, i) => sum + (i.amountPaid || (i.status === "paid" ? i.total : 0)), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<ClientInvoice | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  
  // Selection state (matching Deals.tsx)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Column visibility state (including explicit Amount & Due Date columns)
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    invoiceId: true,
    client: true,
    type: true,
    amount: true,
    balance: true,
    stage: true,
    dueDate: true,
    created: true,
    lastActivity: true,
    responsible: true,
  });

  const getInvoiceActivityText = (inv: ClientInvoice) => {
    switch (inv.status) {
      case "paid":
        return `Payment received ($${inv.total.toFixed(2)}) - ${inv.paidAt?.split("T")[0] || "Completed"}`;
      case "viewed":
        return "Viewed by client online";
      case "sent":
        return "Sent via WhatsApp & Email";
      case "overdue":
        return "Payment past due - Overdue notice sent";
      case "void":
        return "Invoice voided";
      default:
        return "Draft created";
    }
  };

  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  
  const [selectedDocumentInvoice, setSelectedDocumentInvoice] = useState<ClientInvoice | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Kebab menu open state (matching Deals.tsx openRowMenuId / openDealMenuId)
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Kanban Scroll Ref (matching Deals.tsx)
  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  // Drag and Drop state for Kanban (matching Deals.tsx)
  const [draggedInvoiceId, setDraggedInvoiceId] = useState<string | null>(null);

  // Pagination state (matching Deals.tsx)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);


  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      inv.id.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || inv.currentStageId === statusFilter || inv.status === statusFilter;
    const matchesClient = clientFilter === "all" || inv.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  // Pagination calculations
  const totalRecords = filteredInvoices.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Select all handlers
  const allSelected = paginatedInvoices.length > 0 && paginatedInvoices.every((inv) => selectedRows.has(inv.id));
  const someSelected = paginatedInvoices.some((inv) => selectedRows.has(inv.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      const next = new Set(selectedRows);
      paginatedInvoices.forEach((inv) => next.delete(inv.id));
      setSelectedRows(next);
    } else {
      const next = new Set(selectedRows);
      paginatedInvoices.forEach((inv) => next.add(inv.id));
      setSelectedRows(next);
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const handleOpenDetail = (inv: ClientInvoice) => {
    setSelectedInvoice(inv);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenDocument = (inv: ClientInvoice) => {
    setSelectedDocumentInvoice(inv);
    setIsDocumentModalOpen(true);
    setOpenRowMenuId(null);
    setOpenCardMenuId(null);
  };

  const handleCreateInvoice = () => {
    setEditingInvoice(null);
    setIsCreateDrawerOpen(true);
  };

  const handleEditInvoice = (inv: ClientInvoice) => {
    if (inv.status === "paid" || inv.status === "void") {
      toast.error("Paid or Void invoices can't be edited");
      return;
    }
    setEditingInvoice(inv);
    setIsCreateDrawerOpen(true);
    setOpenRowMenuId(null);
    setOpenCardMenuId(null);
  };

  const handleDeleteInvoice = (inv: ClientInvoice) => {
    if (inv.status === "draft") {
      deleteInvoice(inv.id);
      toast.success(`Draft invoice ${inv.id} deleted`);
    } else {
      voidInvoice(inv.id);
      toast.success(`Invoice ${inv.id} voided (audit record preserved)`);
    }
    setOpenRowMenuId(null);
    setOpenCardMenuId(null);
  };

  const invoiceProcess = React.useMemo(() => {
    const processes = getStoredProcesses();
    return processes.find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
  }, []);

  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [stageMoves, setStageMoves] = useState<StageMove[]>(() => getStoredStageMoves());

  useEffect(() => {
    const handleMovesUpdate = () => setStageMoves(getStoredStageMoves());
    window.addEventListener("mantra_stage_moves_store_updated", handleMovesUpdate);
    return () => window.removeEventListener("mantra_stage_moves_store_updated", handleMovesUpdate);
  }, []);

  const getStatusBadge = (invOrStatus: ClientInvoice | InvoiceStatus) => {
    const isObj = typeof invOrStatus === "object" && invOrStatus !== null;
    const invoice = isObj ? (invOrStatus as ClientInvoice) : undefined;
    const stageId = invoice ? invoice.currentStageId : undefined;
    const statusVal = invoice ? invoice.status : (invOrStatus as InvoiceStatus);
    const stage = invoiceProcess.stages.find((s) => s.id === stageId || s.systemCategory === statusVal);
    const label: string = (invoice && invoice.statusLabel) ? invoice.statusLabel : (stage?.name || (typeof statusVal === "string" ? statusVal : "Draft"));
    const color = stage?.color || "#64748B";

    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
        style={{
          fontFamily: "Outfit, sans-serif",
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}35`,
        }}
      >
        {label}
      </span>
    );
  };

  const kanbanColumns = useMemo(() => {
    return invoiceProcess.stages.map((stg) => ({
      id: stg.id,
      category: stg.systemCategory || "draft",
      title: stg.name,
      headerBg: stg.color || "#181e25",
      badgeColor: "bg-slate-100 text-slate-800",
    }));
  }, [invoiceProcess]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Invoices"
          subtitle="Manage client billing, view automated call-flow invoices, and collect payments"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTimelineModal(true)}
              className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Audit trail of stage movements and 1-click Undo"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Stage History</span>
            </button>
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Invoices Works" />
          </div>
        </PageHeader>

        {/* Stats Cards — thin capsule style matching WebForms */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>TOTAL INVOICED</span>
            <span className="text-base font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>${totalInvoiced.toFixed(2)}</span>
            <span className="text-[10px] shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{invoices.length} inv</span>
          </div>
          <div className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>OUTSTANDING</span>
            <span className="text-base font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>${outstandingAmount.toFixed(2)}</span>
            <span className="text-[10px] shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{invoices.filter(i => ["sent", "viewed", "partial", "overdue"].includes(i.status)).length} due</span>
          </div>
          <div className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>PAID THIS MONTH</span>
            <span className="text-base font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>${paidThisMonth.toFixed(2)}</span>
            <span className="text-[10px] shrink-0 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{invoices.filter(i => i.status === "paid").length} paid</span>
          </div>
          <div className="bg-white border border-border shadow-xs rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>OVERDUE COUNT</span>
            <span className="text-base font-bold flex-1 text-center" style={{ fontFamily: "DM Sans, sans-serif", color: overdueCount > 0 ? "#E11D48" : "#020817" }}>{overdueCount}</span>
            <span className="text-[10px] shrink-0" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>{overdueCount > 0 ? "Needs action" : "All clear"}</span>
          </div>
        </div>

        {/* View Mode Toggle & Filter Bar powered by PageTopBar */}
        <PageTopBar
          isBottomPanelAttached={viewMode === "list"}
          modes={[
            { id: "list", label: "List", icon: <List className="w-3.5 h-3.5" /> },
            { id: "kanban", label: "Kanban", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
          ]}
          activeMode={viewMode}
          onModeChange={(m) => setViewMode(m as typeof viewMode)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search invoices..."
          filterPresets={[
            {
              id: "all",
              label: "All Invoices",
              count: invoices.length,
              isActive: statusFilter === "all" && !searchQuery,
              onClick: () => {
                setStatusFilter("all");
                setSearchQuery("");
              },
            },
            {
              id: "paid",
              label: "Paid Invoices",
              count: invoices.filter(i => i.status === "paid").length,
              isActive: statusFilter === "paid",
              onClick: () => setStatusFilter("paid"),
            },
            {
              id: "overdue",
              label: "Overdue Invoices",
              count: invoices.filter(i => i.status === "overdue").length,
              isActive: statusFilter === "overdue",
              onClick: () => setStatusFilter("overdue"),
            },
            {
              id: "draft",
              label: "Draft Invoices",
              count: invoices.filter(i => i.status === "draft").length,
              isActive: statusFilter === "draft",
              onClick: () => setStatusFilter("draft"),
            },
          ]}
          filterFields={[
            {
              id: "query",
              label: "Invoice ID / Client Name",
              type: "text",
              placeholder: "Filter by ID or client...",
              value: searchQuery,
              onChange: (val) => setSearchQuery(val || ""),
            },
            {
              id: "status",
              label: "Invoice Stage",
              type: "select",
              value: statusFilter,
              onChange: (val) => setStatusFilter(val || "all"),
              options: [
                { label: "All Stages", value: "all" },
                ...invoiceProcess.stages.map((stg) => ({
                  label: stg.name,
                  value: stg.id,
                })),
              ],
            },
          ]}
          secondaryActions={
            <div className="flex items-center gap-2">
              {/* Stage Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-[36px] px-2.5 bg-input-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="all">All Stages</option>
                {invoiceProcess.stages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.name}
                  </option>
                ))}
              </select>

              {/* Client Filter Dropdown */}
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-[36px] px-2.5 bg-input-background border border-input rounded-lg text-xs font-medium text-foreground focus:outline-none max-w-[150px] truncate cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="all">All Clients</option>
                {allClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              {/* Record Payment Button */}
              <button
                type="button"
                onClick={() => {
                  setPaymentModalInvoice(null);
                  setIsRecordPaymentOpen(true);
                }}
                className="px-3.5 h-[36px] bg-white hover:bg-gray-50 text-slate-700 border border-border rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
                title="Record Payment"
              >
                <Wallet className="w-3.5 h-3.5 text-slate-600" />
                <span>Record Payment</span>
              </button>
            </div>
          }
          primaryAction={{
            label: "Create Invoice",
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: handleCreateInvoice,
          }}
        />

        {/* View Mode: List View (Connected seamlessly to Toolbar) */}
        {viewMode === "list" && (() => {
          const invoiceColumns: TableColumn<ClientInvoice>[] = [
              {
                id: "invoiceId",
                header: "Invoice ID",
                align: "left",
                render: (inv) => (
                  <button
                    onClick={() => handleOpenDetail(inv)}
                    className="hover:underline hover:text-blue-600 transition-colors text-left font-mono font-bold text-xs text-slate-700"
                  >
                    {inv.id}
                  </button>
                ),
              },
              {
                id: "client",
                header: "Client",
                align: "left",
                render: (inv) => (
                  <button
                    onClick={() => handleOpenDetail(inv)}
                    className="text-left font-bold hover:underline text-xs text-[#1A73E8]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {inv.clientName}
                  </button>
                ),
              },
              {
                id: "amount",
                header: "Amount",
                align: "center",
                render: (inv) => (
                  <span className="font-bold text-xs text-slate-900 font-mono">
                    ${inv.total.toFixed(2)}
                  </span>
                ),
              },
              {
                id: "balance",
                header: "Balance",
                align: "center",
                render: (inv) => (
                  <span className="font-bold text-xs text-slate-700 font-mono">
                    ${(inv.status === "paid" || inv.status === "void" ? 0 : Math.max(0, inv.total - (inv.amountPaid || 0))).toFixed(2)}
                  </span>
                ),
              },
              {
                id: "stage",
                header: "Stage",
                align: "center",
                render: (inv) => (
                  <div className="flex items-center justify-center">
                    <InvoiceProgressBar
                      status={inv.status}
                      onStatusChange={(newSt) => updateInvoiceStatus(inv.id, newSt)}
                      interactive={true}
                      logId={inv.id}
                    />
                  </div>
                ),
              },
              {
                id: "dueDate",
                header: "Due Date",
                align: "left",
                render: (inv) => (
                  <span
                    className="text-xs font-semibold"
                    style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}
                  >
                    {inv.dueDate}
                  </span>
                ),
              },
              {
                id: "created",
                header: "Created",
                align: "left",
                render: (inv) => (
                  <span className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {inv.createdAt.replace("T", " ").substring(0, 16)}
                  </span>
                ),
              },
              {
                id: "lastActivity",
                header: "Last Activity",
                align: "left",
                render: (inv) => (
                  <span
                    className="text-xs font-medium"
                    style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}
                  >
                    {getInvoiceActivityText(inv)}
                  </span>
                ),
              },
              {
                id: "responsible",
                header: "Responsible",
                align: "left",
                render: (inv) => (
                  <span className="text-xs font-medium text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {inv.createdBy === "system" ? "Automated Flow" : inv.createdBy}
                  </span>
                ),
              },
            ];

            const invoiceRowActions: TableRowAction<ClientInvoice>[] = [
              {
                label: "Add Payment",
                icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
                onClick: (inv) => {
                  if (inv.status !== "paid" && inv.status !== "void") {
                    setPaymentModalInvoice(inv);
                    setIsRecordPaymentOpen(true);
                  } else {
                    toast.error("Invoice is already paid or void");
                  }
                },
              },
              {
                label: "View Document",
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: (inv) => handleOpenDocument(inv),
              },
              {
                label: "Edit",
                icon: <Pencil className="w-3.5 h-3.5" />,
                onClick: (inv) => handleEditInvoice(inv),
              },
              {
                label: "Delete / Void",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                isDanger: true,
                onClick: (inv) => handleDeleteInvoice(inv),
              },
            ];

            return (
              <TableComponent
                data={filteredInvoices}
                columns={invoiceColumns}
                getRowId={(inv) => inv.id}
                rowActions={invoiceRowActions}
                selectedIds={selectedRows}
                onSelectionChange={(ids) => setSelectedRows(new Set(Array.from(ids) as string[]))}
                defaultRowsPerPage={20}
                emptyMessage="No invoices found matching your filters."
              />
            );
          })()}

        {/* View Mode: Kanban Board View (Matching Deals.tsx lines 2565-2715 100%) */}
        {viewMode === "kanban" && (
          <div className="relative group/kanban">
            {/* Scroll Left Semi-circle Button */}
            <button
              type="button"
              onClick={() => {
                if (kanbanScrollRef.current) {
                  kanbanScrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
                }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-9 h-20 bg-white/95 hover:bg-white shadow-xl border border-slate-200 rounded-r-full flex items-center justify-center text-slate-700 transition-all opacity-80 hover:opacity-100 hover:scale-105"
              title="Scroll Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scroll Right Semi-circle Button */}
            <button
              type="button"
              onClick={() => {
                if (kanbanScrollRef.current) {
                  kanbanScrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
                }
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-9 h-20 bg-white/95 hover:bg-white shadow-xl border border-slate-200 rounded-l-full flex items-center justify-center text-slate-700 transition-all opacity-80 hover:opacity-100 hover:scale-105"
              title="Scroll Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Horizontal Scrollable Column Container */}
            <div
              ref={kanbanScrollRef}
              className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 transition-all"
              style={{
                scrollBehavior: "smooth",
                scrollbarWidth: "thin",
                scrollbarColor: "#94A3B8 #F1F5F9",
              }}
            >
              {kanbanColumns.map((col) => {
                const columnInvoices = filteredInvoices.filter((inv) => inv.currentStageId === col.id || inv.status === col.category);
                const columnTotal = columnInvoices.reduce((sum, i) => sum + i.total, 0);

                return (
                  <div
                    key={col.id}
                    className="flex-shrink-0 flex flex-col rounded-lg overflow-hidden"
                    style={{ width: "235px", border: "1px solid transparent" }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "#1A73E8";
                      e.currentTarget.style.borderStyle = "dashed";
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.borderStyle = "solid";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.borderStyle = "solid";
                      if (!draggedInvoiceId) return;

                      const targetInv = invoices.find((i) => i.id === draggedInvoiceId);
                      if (!targetInv) return;

                      if (col.category === "overdue") {
                        toast.error("Overdue status is system-derived from due date and cannot be set manually.");
                        setDraggedInvoiceId(null);
                        return;
                      }

                      if (col.category === "sent") {
                        sendInvoice(targetInv.id, "whatsapp");
                        toast.success(`Invoice ${targetInv.id} sent via WhatsApp`);
                      } else if (col.category === "paid") {
                        const remaining = Math.max(0, targetInv.total - (targetInv.amountPaid || 0));
                        invoiceService.recordPayment(targetInv.id, remaining, "cash", "Settled via Kanban drag-to-Paid");
                        toast.success(`Invoice ${targetInv.id} balance ($${remaining.toFixed(2)}) paid`);
                      } else if (col.category === "partially_paid") {
                        setPaymentModalInvoice(targetInv);
                      } else if (col.category === "void") {
                        voidInvoice(targetInv.id);
                        toast.success(`Invoice ${targetInv.id} voided`);
                      } else {
                        invoiceService.moveToStage(targetInv.id, col.id, { type: "manual", ruleName: `Kanban drag to ${col.title}` });
                        toast.success(`Invoice moved to ${col.title}`);
                      }

                      setDraggedInvoiceId(null);
                    }}

                  >
                    {/* Column Header (Matching Deals.tsx line 2566) */}
                    <div className="px-3 py-3" style={{ backgroundColor: col.headerBg }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold" style={{ fontSize: "14px", fontFamily: "Outfit, sans-serif" }}>
                          {col.title}
                        </span>
                        <div
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "#06B6D4", color: "#FFFFFF", minWidth: "20px", textAlign: "center" }}
                        >
                          {columnInvoices.length}
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>
                        Subtotal: ${columnTotal.toFixed(2)}
                      </div>
                    </div>

                    {/* Column Card Container (Matching Deals.tsx line 2584) */}
                    <div
                      className="p-3 flex-1"
                      style={{ maxHeight: "560px", overflowY: "auto", backgroundColor: "#F8FAFC" }}
                    >
                      <div className="space-y-3">
                        {columnInvoices.map((inv) => {
                          const isCardMenuOpen = openCardMenuId === inv.id;
                          const isEditDisabled = inv.status === "paid" || inv.status === "void";

                          return (
                            <div
                              key={inv.id}
                              draggable
                              onDragStart={() => setDraggedInvoiceId(inv.id)}
                              onDragEnd={() => setDraggedInvoiceId(null)}
                              className="bg-white rounded-lg cursor-move transition-all group hover:shadow-md"
                              style={{
                                boxShadow: draggedInvoiceId === inv.id
                                  ? "0 8px 24px rgba(0,0,0,0.15)"
                                  : "0 1px 4px rgba(0,0,0,0.07)",
                                transform: draggedInvoiceId === inv.id ? "rotate(2deg)" : "none",
                                padding: "12px",
                                border: "1px solid #E2E8F0",
                              }}
                            >
                              {/* Row 1: Client name + ⋯ menu (Matching Deals.tsx line 2611) */}
                              <div className="flex items-start justify-between mb-2">
                                <span
                                  onClick={() => handleOpenDetail(inv)}
                                  className="font-bold leading-tight flex-1 pr-1 text-left cursor-pointer hover:underline"
                                  style={{ fontSize: "13px", color: "#1A73E8", fontFamily: "Outfit, sans-serif", padding: 0 }}
                                >
                                  {inv.clientName}
                                </span>
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenCardMenuId(isCardMenuOpen ? null : inv.id);
                                    }}
                                    className="p-0.5 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                    style={{ color: "#94A3B8" }}
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                  {isCardMenuOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setOpenCardMenuId(null)} />
                                      <div
                                        className="absolute right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                                        style={{ top: "20px", minWidth: "130px" }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() => handleOpenDocument(inv)}
                                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                                          View
                                        </button>
                                        {inv.status !== "paid" && inv.status !== "void" && (
                                           <button
                                             onClick={() => {
                                               setOpenCardMenuId(null);
                                               setPaymentModalInvoice(inv);
                                               setIsRecordPaymentOpen(true);
                                             }}
                                             className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 font-bold hover:bg-emerald-50 flex items-center gap-2 transition-colors border-b border-gray-100"
                                           >
                                             <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                             Add Payment
                                           </button>
                                         )}
                                        {!isEditDisabled && (
                                          <button
                                            onClick={() => handleEditInvoice(inv)}
                                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                          >
                                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                            Edit
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteInvoice(inv)}
                                          className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Amount (Matching Deals.tsx metrics row) */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>Amount</span>
                                <span style={{ fontSize: "12px", color: "#0F172A", fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>
                                  ${inv.total.toFixed(2)}
                                </span>
                              </div>

                              {/* Row 3: Status badge (Matching Deals.tsx line 2671) */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>Status</span>
                                {getStatusBadge(inv.status)}
                              </div>

                              {/* Row 4: Due date (Matching Deals.tsx line 2690) */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>Due Date</span>
                                <span style={{ fontSize: "11px", color: inv.status === "overdue" ? "#DC2626" : "#1C2B4A", fontFamily: "Outfit, sans-serif", fontWeight: inv.status === "overdue" ? 700 : 400 }}>
                                  {inv.dueDate}
                                </span>
                              </div>

                              {/* Row 5: Stage Progress Bar */}
                              <div className="flex items-center gap-1.5 mb-2 pt-1 border-t border-slate-100">
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>Stage</span>
                                <InvoiceProgressBar
                                  status={inv.status}
                                  onStatusChange={(newSt) => updateInvoiceStatus(inv.id, newSt)}
                                  interactive={true}
                                  logId={inv.id}
                                />
                              </div>

                              {/* Footer: Responsible (Matching Deals.tsx line 2702) */}
                              <div
                                className="flex items-center justify-between pt-2"
                                style={{ borderTop: "1px solid #F1F5F9" }}
                              >
                                <span style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>Responsible</span>
                                <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "Outfit, sans-serif", fontWeight: 500 }}>
                                  {inv.createdBy === "system" ? "Automated Flow" : inv.createdBy}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {columnInvoices.length === 0 && (
                          <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                            No invoices
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Quick Glance Detail Drawer */}
      <InvoiceDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        invoice={selectedInvoice}
        onOpenDocument={(inv) => {
          setIsDetailDrawerOpen(false);
          handleOpenDocument(inv);
        }}
      />

      {/* Standalone / Editing Invoice Drawer */}
      <CreateInvoiceDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        editingInvoice={editingInvoice}
      />

      {/* Official Client-Facing Printable Document Modal */}
      <InvoiceDocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        invoice={selectedDocumentInvoice}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Invoices Works"
        summary="Invoices matches the exact layout, header structure, stage blocks, card design, and action menus of the Processes page."
        bullets={[
          "Card design matches Processes page: Client name, Amount, Status, Due Date, Stage Bar, and Responsible",
          "All 6 invoice stages (Draft, Sent, Viewed, Paid, Overdue, Void) accessible via progress bar and Kanban columns",
          "Use floating horizontal scroll buttons or slider to navigate across all 6 columns effortlessly",
          "Use the 3-dot kebab menu to View Document, Edit, or Delete/Void invoices",
        ]}
        guideUrl="/guide/invoices"
      />
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setPaymentModalInvoice(null);
          }}
          clientId={paymentModalInvoice?.clientId || ""}
          clientName={paymentModalInvoice?.clientName || ""}
          preSelectedInvoiceId={paymentModalInvoice?.id || null}
        />
      )}

      <StageMovementTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        entityType="invoice"
        moves={stageMoves}
        title="Invoice Stage Movement History"
      />
    </div>
  );
}

