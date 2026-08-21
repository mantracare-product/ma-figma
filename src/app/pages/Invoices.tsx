import React, { useState, useRef, useEffect } from "react";
import PageHeader from "../components/layout/PageHeader";
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
import {
  Search,
  Settings as SettingsIcon,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  CreditCard,
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
} from "lucide-react";

export default function Invoices() {
  const { invoices, updateInvoiceStatus, sendInvoice, recordPayment, deleteInvoice, voidInvoice } = useInvoices();
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
    client: true,
    type: true,
    amount: true,
    balance: true,
    stage: true,
    status: true,
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
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Compute stat capsule metrics
  const totalInvoiced = invoices.filter((i) => i.status !== "void").reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "viewed" || i.status === "overdue" || i.status === "partial")
    .reduce((sum, i) => sum + Math.max(0, i.total - (i.amountPaid || 0)), 0);
  const totalPaidThisMonth = invoices.reduce((sum, i) => sum + (i.amountPaid || (i.status === "paid" ? i.total : 0)), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      inv.id.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
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

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Paid</span>;
      case "partial":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 font-bold whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Partial</span>;
      case "sent":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Sent</span>;
      case "viewed":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Viewed</span>;
      case "overdue":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 font-bold whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Overdue</span>;
      case "void":
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 line-through whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Void</span>;
      default:
        return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Draft</span>;
    }
  };

  const kanbanColumns: { id: InvoiceStatus; title: string; headerBg: string; badgeColor: string }[] = [
    { id: "draft", title: "Draft", headerBg: "#181e25", badgeColor: "bg-slate-100 text-slate-800" },
    { id: "sent", title: "Sent", headerBg: "#181e25", badgeColor: "bg-blue-50 text-[#1456f0]" },
    { id: "viewed", title: "Viewed", headerBg: "#181e25", badgeColor: "bg-purple-50 text-purple-700" },
    { id: "partial", title: "Partial", headerBg: "#f59e0b", badgeColor: "bg-amber-50 text-amber-800" },
    { id: "paid", title: "Paid", headerBg: "#10b981", badgeColor: "bg-emerald-50 text-emerald-800" },
    { id: "overdue", title: "Overdue", headerBg: "#ef4444", badgeColor: "bg-rose-50 text-rose-800" },
    { id: "void", title: "Void", headerBg: "#64748b", badgeColor: "bg-slate-100 text-slate-600" },
  ];


  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Invoices"
          subtitle="Manage client billing, view automated call-flow invoices, and collect payments"
          badge={
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Billing Hub
            </span>
          }
        >
          <div className="flex items-center gap-3">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Invoices Works" />
            <button
              onClick={() => {
                setPaymentModalInvoice(null);
                setIsRecordPaymentOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <CreditCard className="w-3.5 h-3.5" /> + Record Payment
            </button>
            <button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white rounded-full font-semibold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" /> Create Invoice
            </button>
          </div>
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <DollarSign className="w-3.5 h-3.5 text-[#1456f0]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalInvoiced.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Total Invoiced</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalOutstanding.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Outstanding</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalPaidThisMonth.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Paid This Month</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {overdueCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Overdue Count</span>
          </div>
        </div>

        {/* View Mode Toggle & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* View Mode Tabs: List | Kanban */}
            <div className="inline-flex items-center p-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "list"
                    ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-2xs"
                    : "text-[#45515e] hover:text-[#222222]"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-2xs"
                    : "text-[#45515e] hover:text-[#222222]"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none"
            >
              <option value="all">All Statuses (Draft, Sent, Viewed, Partial, Paid, Overdue, Void)</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>

            </select>
          </div>
        </div>

        {/* View Mode: List View (Matching Deals.tsx Table Layout 100%) */}
        {viewMode === "list" && (
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <tr>
                    {/* Checkbox Header */}
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>

                    {/* Column Toggle Gear Icon Header */}
                    <th className="px-2 py-2.5 text-center relative" style={{ width: "32px" }}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setShowColumnToggle(!showColumnToggle)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-white/10"
                          aria-label="Customize Columns"
                        >
                          <SettingsIcon className="w-4 h-4 text-[#E5E7EB] hover:text-white transition-colors" />
                        </button>
                        {showColumnToggle && (
                          <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 text-left">
                            <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>Visible Columns</h3>
                            <div className="space-y-2">
                              {Object.keys(visibleColumns).map((col) => (
                                <label key={col} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns[col as keyof typeof visibleColumns]}
                                    onChange={(e) =>
                                      setVisibleColumns({
                                        ...visibleColumns,
                                        [col]: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span className="capitalize">
                                    {col === "dueDate" ? "Due Date" : col === "lastActivity" ? "Last Activity" : col}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>

                    {visibleColumns.client && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        CLIENT
                      </th>
                    )}
                    {visibleColumns.amount && (
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        AMOUNT
                      </th>
                    )}
                    {visibleColumns.balance && (
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        BALANCE
                      </th>
                    )}
                    {visibleColumns.stage && (
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        <div className="flex items-center justify-center gap-1">
                          STAGE
                          <InfoTooltip text="Each block is one stage (Draft → Sent → Viewed → Paid → Overdue → Void). Click a block to set status." />
                        </div>
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        STATUS
                      </th>
                    )}
                    {visibleColumns.dueDate && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        DUE DATE
                      </th>
                    )}
                    {visibleColumns.created && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        CREATED
                      </th>
                    )}
                    {visibleColumns.lastActivity && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        LAST ACTIVITY
                      </th>
                    )}
                    {visibleColumns.responsible && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                        RESPONSIBLE
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedInvoices.map((inv) => {
                    const isAutomated = inv.createdBy === "system";
                    const isMenuOpen = openRowMenuId === inv.id;
                    const isEditDisabled = inv.status === "paid" || inv.status === "void";

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          selectedRows.has(inv.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"
                        }`}
                      >
                        {/* Checkbox Cell */}
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(inv.id)}
                            onChange={() => handleSelectRow(inv.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Three-dot Kebab Menu Cell (Matching Deals.tsx line 2134) */}
                        <td className="px-2 py-2.5 relative" style={{ width: "32px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenRowMenuId(isMenuOpen ? null : inv.id);
                            }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-gray-100"
                            style={{ color: "#94A3B8" }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenRowMenuId(null)} />
                              <div
                                className="absolute left-8 top-0 z-50 bg-white rounded-lg overflow-hidden border border-slate-200"
                                style={{ width: "155px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                              >
                                {inv.status !== "paid" && inv.status !== "void" && (
                                  <button
                                    onClick={() => {
                                      setOpenRowMenuId(null);
                                      setPaymentModalInvoice(inv);
                                      setIsRecordPaymentOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 text-sm text-emerald-700 font-bold transition-colors hover:bg-emerald-50 border-b border-slate-100"
                                    style={{ height: "36px", fontSize: "13px" }}
                                  >
                                    <CreditCard className="w-4 h-4 text-emerald-600" /> Add Payment
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenDocument(inv)}
                                  className="w-full flex items-center gap-2.5 px-3 text-sm text-gray-700 transition-colors hover:bg-[#F0F4FF]"
                                  style={{ height: "36px", fontSize: "14px" }}
                                >
                                  <Eye className="w-4 h-4" /> View
                                </button>

                                {isEditDisabled ? (
                                  <div
                                    className="w-full flex items-center gap-2.5 px-3 text-sm text-slate-300 cursor-not-allowed bg-slate-50"
                                    style={{ height: "36px", fontSize: "14px" }}
                                    title="Paid or Void invoices can't be edited"
                                  >
                                    <Pencil className="w-4 h-4 text-slate-300" /> Edit
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEditInvoice(inv)}
                                    className="w-full flex items-center gap-2.5 px-3 text-sm text-gray-700 transition-colors hover:bg-[#F0F4FF]"
                                    style={{ height: "36px", fontSize: "14px" }}
                                  >
                                    <Pencil className="w-4 h-4" /> Edit
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteInvoice(inv)}
                                  className="w-full flex items-center gap-2.5 px-3 transition-colors hover:bg-[#F0F4FF]"
                                  style={{ height: "36px", fontSize: "14px", color: "#D32F2F" }}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>

                        {/* CLIENT Column */}
                        {visibleColumns.client && (
                          <td className="px-4 py-2.5 font-medium text-sm" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            <button
                              onClick={() => handleOpenDetail(inv)}
                              className="text-left font-bold hover:underline block"
                              style={{ color: "#1A73E8" }}
                            >
                              {inv.clientName}
                            </button>
                            <span className="text-xs text-slate-400 font-mono block">{inv.id}</span>
                          </td>
                        )}

                        {/* AMOUNT Column */}
                        {visibleColumns.amount && (
                          <td className="px-4 py-2.5 text-right font-bold text-sm text-slate-900 font-mono">
                            ${inv.total.toFixed(2)}
                          </td>
                        )}

                        {/* BALANCE Column */}
                        {visibleColumns.balance && (
                          <td className="px-4 py-2.5 text-right font-bold text-xs text-slate-700 font-mono">
                            ${(inv.status === "paid" || inv.status === "void" ? 0 : Math.max(0, inv.total - (inv.amountPaid || 0))).toFixed(2)}
                          </td>
                        )}

                        {/* STAGE Column */}
                        {visibleColumns.stage && (
                          <td className="px-4 py-2.5 text-center">
                            <InvoiceProgressBar
                              status={inv.status}
                              onStatusChange={(newSt) => updateInvoiceStatus(inv.id, newSt)}
                              interactive={true}
                              logId={inv.id}
                            />
                          </td>
                        )}

                        {/* STATUS Column */}
                        {visibleColumns.status && (
                          <td className="px-4 py-2.5 text-center">
                            {getStatusBadge(inv.status)}
                          </td>
                        )}

                        {/* DUE DATE Column */}
                        {visibleColumns.dueDate && (
                          <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}>
                            {inv.dueDate}
                          </td>
                        )}

                        {/* CREATED Column */}
                        {visibleColumns.created && (
                          <td className="px-4 py-2.5 text-xs" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
                            {inv.createdAt.replace("T", " ").substring(0, 16)}
                          </td>
                        )}

                        {/* LAST ACTIVITY Column */}
                        {visibleColumns.lastActivity && (
                          <td className="px-4 py-2.5 text-xs font-medium" style={{ color: inv.status === "overdue" ? "#DC2626" : "#475569", fontFamily: "Outfit, sans-serif" }}>
                            {getInvoiceActivityText(inv)}
                          </td>
                        )}

                        {/* RESPONSIBLE Column */}
                        {visibleColumns.responsible && (
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-medium" style={{ color: "#1F2937", fontFamily: "Outfit, sans-serif" }}>
                              {inv.createdBy === "system" ? "Automated Flow" : inv.createdBy}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredInvoices.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No invoices found</p>
                  <p className="text-xs text-slate-400 mt-1">Try selecting a different status or client filter</p>
                </div>
              )}
            </div>

            {/* Pagination Controls (Matching Deals.tsx lines 2280-2346) */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Showing {startIndex + 1}–{endIndex} of {totalRecords}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="text-xs px-2 text-slate-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                const columnInvoices = filteredInvoices.filter((inv) => inv.status === col.id);
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

                      if (col.id === "overdue") {
                        toast.error("Overdue status is system-derived from due date and cannot be set manually.");
                        setDraggedInvoiceId(null);
                        return;
                      }

                      if (col.id === "sent") {
                        sendInvoice(targetInv.id, "whatsapp");
                        toast.success(`Invoice ${targetInv.id} sent via WhatsApp`);
                      } else if (col.id === "paid") {
                        const remaining = Math.max(0, targetInv.total - (targetInv.amountPaid || 0));
                        recordPayment([
                          {
                            invoiceId: targetInv.id,
                            clientId: targetInv.clientId,
                            amount: remaining,
                            method: "cash",
                            paymentType: "self_pay",
                            paymentDate: new Date().toISOString().split("T")[0],
                            note: "Settled via Kanban drag-to-Paid",
                          },
                        ]);
                        toast.success(`Invoice ${targetInv.id} remaining balance ($${remaining.toFixed(2)}) paid`);
                      } else if (col.id === "partial") {
                        setPaymentModalInvoice(targetInv);
                      } else if (col.id === "void") {
                        voidInvoice(targetInv.id);
                        toast.success(`Invoice ${targetInv.id} voided`);
                      } else {
                        updateInvoiceStatus(targetInv.id, col.id);
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
    </div>
  );
}

